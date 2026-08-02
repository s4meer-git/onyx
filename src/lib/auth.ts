import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

const COOKIE = "fit_session";
const MAX_AGE = 60 * 60 * 24 * 365; // a year — this is a personal app on personal devices

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 16) {
    throw new Error("AUTH_SECRET is missing (set a long random string in your environment)");
  }
  return new TextEncoder().encode(value);
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionUser(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.sub as string) ?? null;
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<string> {
  const user = await getSessionUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

/**
 * WebAuthn challenges live in a short-lived signed cookie rather than the
 * database — one fewer round trip, and it expires on its own.
 */
const CHALLENGE_COOKIE = "fit_challenge";

export async function storeChallenge(challenge: string) {
  const token = await new SignJWT({ challenge })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(secret());

  (await cookies()).set(CHALLENGE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
}

export async function consumeChallenge(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(CHALLENGE_COOKIE)?.value;
  store.delete(CHALLENGE_COOKIE);
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return (payload.challenge as string) ?? null;
  } catch {
    return null;
  }
}

/**
 * WebAuthn is bound to an origin. Derive it from the request so the same build
 * works on localhost, a preview URL and the production domain.
 */
export async function relyingParty() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const rpID = host.split(":")[0];
  return {
    rpID,
    rpName: "Workout",
    origin: `${proto}://${host}`,
  };
}

/** Bootstrap / recovery login so a lost passkey never locks you out. */
export function checkAccessCode(code: string) {
  const expected = process.env.ACCESS_CODE;
  if (!expected) throw new Error("ACCESS_CODE is not configured");
  if (code.length !== expected.length) return false;
  // constant-time-ish comparison
  let diff = 0;
  for (let i = 0; i < expected.length; i += 1) {
    diff |= code.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}
