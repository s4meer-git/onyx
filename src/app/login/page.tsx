import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { hasCredentials } from "@/lib/queries";
import { LoginClient } from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSessionUser()) redirect("/");
  return <LoginClient hasPasskey={await hasCredentials()} />;
}
