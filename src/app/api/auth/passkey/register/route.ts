import { NextResponse } from "next/server";
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import {
  checkAccessCode,
  consumeChallenge,
  createSession,
  getSessionUser,
  relyingParty,
  storeChallenge,
} from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { USER_ID, USER_NAME, ensureUser, listCredentials } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Adding a passkey requires proving you are the owner first — either an active
 * session (adding a second device) or the access code (first ever passkey).
 */
async function authorise(accessCode?: string) {
  if (await getSessionUser()) return true;
  return Boolean(accessCode && checkAccessCode(accessCode));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { rpID, rpName, origin } = await relyingParty();

  /* Step 1 — hand the browser a challenge. */
  if (body.step === "options") {
    if (!(await authorise(body.accessCode))) {
      return NextResponse.json({ error: "Access code incorrect" }, { status: 401 });
    }
    await ensureUser();

    const existing = await listCredentials();
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userName: USER_NAME,
      userID: new TextEncoder().encode(USER_ID),
      attestationType: "none",
      // Don't let the same authenticator register twice.
      excludeCredentials: existing.map((credential) => ({
        id: credential.id,
        transports: credential.transports?.split(",").filter(Boolean) as any,
      })),
      authenticatorSelection: {
        residentKey: "required", // discoverable → no username needed at sign-in
        userVerification: "preferred",
      },
    });

    await storeChallenge(options.challenge);
    return NextResponse.json(options);
  }

  /* Step 2 — verify the attestation and store the credential. */
  const expectedChallenge = await consumeChallenge();
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired, try again" }, { status: 400 });
  }
  if (!(await authorise(body.accessCode))) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ error: "Passkey could not be verified" }, { status: 400 });
  }

  const { credential } = verification.registrationInfo;
  const db = await getDb();
  await ensureUser();

  await db
    .insert(schema.credentials)
    .values({
      id: credential.id,
      userId: USER_ID,
      publicKey: Buffer.from(credential.publicKey).toString("base64url"),
      counter: credential.counter,
      transports: credential.transports?.join(",") ?? null,
      deviceName: typeof body.deviceName === "string" && body.deviceName ? body.deviceName : "Passkey",
    })
    .onConflictDoUpdate({
      target: schema.credentials.id,
      set: { publicKey: Buffer.from(credential.publicKey).toString("base64url"), counter: credential.counter },
    });

  await createSession(USER_ID);
  return NextResponse.json({ verified: true });
}

/** Remove a passkey (e.g. a lost device). */
export async function DELETE(request: Request) {
  if (!(await getSessionUser())) {
    return NextResponse.json({ error: "Not authorised" }, { status: 401 });
  }
  const { id } = await request.json();
  const db = await getDb();
  await db.delete(schema.credentials).where(eq(schema.credentials.id, id));
  return NextResponse.json({ ok: true });
}
