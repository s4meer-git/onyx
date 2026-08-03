import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { exportBackup } from "@/lib/backup";
import { writeZip } from "@/lib/zip";
import { todayISO } from "@/lib/date";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Downloads everything you've logged as a .zip: a machine-readable data.json
 * plus a plain-English README. Session cookie only — this is your full
 * training history, not something the read-only API token should be able
 * to pull.
 */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const backup = await exportBackup();
  const json = JSON.stringify(backup, null, 2);

  const readme = `ONYX backup — exported ${backup.exportedAt}
Format version ${backup.version}

data.json is a complete dump of every row this app stores — every column,
not a summary:
  • ${backup.setLogs.length} sets (reps, weight, duration, notes, timestamps)
  • ${backup.workoutDays.length} completed sessions
  • ${backup.dailyMetrics.length} days of steps/weight/notes
  • body profile: ${backup.profile ? "included" : "not set"}
  • ${backup.passkeys.length} passkey(s)

To restore: Settings → Restore from backup → pick this zip file, in the
same app, on any server. Existing rows with matching dates are overwritten
with what's in here; nothing is deleted.

About the passkeys: a passkey is bound to the HOSTNAME you created it on,
not to the server. Restore onto a new machine that answers on the same
hostname and your existing passkeys keep working. Change hostname and they
stop verifying — sign in with your access code and add a new one. Only the
public key and signature counter are stored here; nothing in this file can
authenticate without the physical device.
`;

  const zip = writeZip([
    { name: "data.json", data: Buffer.from(json, "utf8") },
    { name: "README.txt", data: Buffer.from(readme, "utf8") },
  ]);

  return new NextResponse(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="onyx-backup-${todayISO()}.zip"`,
      "Content-Length": String(zip.length),
      "Cache-Control": "no-store",
    },
  });
}
