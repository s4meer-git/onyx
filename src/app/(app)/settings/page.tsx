import { DataBackup } from "@/components/DataBackup";
import { ProfileForm } from "@/components/ProfileForm";
import { relyingParty } from "@/lib/auth";
import { USER_NAME, getProfile, listCredentials } from "@/lib/queries";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [credentials, profile, { passkeyBlockedReason }] = await Promise.all([
    listCredentials(),
    getProfile(),
    relyingParty(),
  ]);

  return (
    <main className="space-y-5">
      <header className="px-1">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-xs text-mist-400">Signed in as {USER_NAME}</p>
      </header>

      <ProfileForm profile={profile} />

      <DataBackup />

      <SettingsClient
        passkeyBlockedReason={passkeyBlockedReason}
        passkeys={credentials.map((credential) => ({
          id: credential.id,
          deviceName: credential.deviceName,
          createdAt: new Date(credential.createdAt as any).toISOString(),
          lastUsedAt: credential.lastUsedAt ? new Date(credential.lastUsedAt as any).toISOString() : null,
        }))}
      />
    </main>
  );
}
