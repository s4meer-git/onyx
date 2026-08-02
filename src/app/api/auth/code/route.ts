import { NextResponse } from "next/server";
import { checkAccessCode, createSession, destroySession } from "@/lib/auth";
import { USER_ID, ensureUser, hasCredentials } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Access-code sign-in: the bootstrap path and the fallback if a passkey is lost. */
export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({ code: "" }));

  if (!process.env.ACCESS_CODE) {
    return NextResponse.json({ error: "ACCESS_CODE is not set on the server" }, { status: 500 });
  }
  if (typeof code !== "string" || !checkAccessCode(code)) {
    return NextResponse.json({ error: "Incorrect code" }, { status: 401 });
  }

  await ensureUser();
  await createSession(USER_ID);
  return NextResponse.json({ ok: true, hasPasskey: await hasCredentials() });
}

export async function DELETE() {
  await destroySession();
  return NextResponse.json({ ok: true });
}
