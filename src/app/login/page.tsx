import { redirect } from "next/navigation";
import { getSessionUser, relyingParty } from "@/lib/auth";
import { hasCredentials } from "@/lib/queries";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  const [hasPasskey, { passkeyBlockedReason }] = await Promise.all([hasCredentials(), relyingParty()]);
  return <LoginClient hasPasskey={hasPasskey} passkeyBlockedReason={passkeyBlockedReason} />;
}
