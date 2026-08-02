import { NextResponse } from "next/server";
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import { eq } from "drizzle-orm";
import { consumeChallenge, createSession, relyingParty, storeChallenge } from "@/lib/auth";
import { getDb, schema } from "@/lib/db";
import { USER_ID, listCredentials } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { rpID, origin } = await relyingParty();

  /* Step 1 — challenge. */
  if (body.step === "options") {
    const credentials = await listCredentials();
    const options = await generateAuthenticationOptions({
      rpID,
      userVerification: "preferred",
      // Empty list = let the platform offer any discoverable passkey for this site.
      allowCredentials: credentials.map((credential) => ({
        id: credential.id,
        transports: credential.transports?.split(",").filter(Boolean) as any,
      })),
    });
    await storeChallenge(options.challenge);
    return NextResponse.json(options);
  }

  /* Step 2 — verify the assertion. */
  const expectedChallenge = await consumeChallenge();
  if (!expectedChallenge) {
    return NextResponse.json({ error: "Challenge expired, try again" }, { status: 400 });
  }

  const db = await getDb();
  const [stored] = await db
    .select()
    .from(schema.credentials)
    .where(eq(schema.credentials.id, body.credential?.id ?? ""))
    .limit(1);

  if (!stored) {
    return NextResponse.json({ error: "Unknown passkey" }, { status: 401 });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.credential,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: false,
      credential: {
        id: stored.id,
        publicKey: new Uint8Array(Buffer.from(stored.publicKey, "base64url")),
        counter: Number(stored.counter),
        transports: stored.transports?.split(",").filter(Boolean) as any,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 401 });
  }

  if (!verification.verified) {
    return NextResponse.json({ error: "Passkey rejected" }, { status: 401 });
  }

  await db
    .update(schema.credentials)
    .set({ counter: verification.authenticationInfo.newCounter, lastUsedAt: new Date() })
    .where(eq(schema.credentials.id, stored.id));

  await createSession(USER_ID);
  return NextResponse.json({ verified: true });
}
