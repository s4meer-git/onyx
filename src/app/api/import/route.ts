import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { importBackup, validateBackup } from "@/lib/backup";
import { readZip } from "@/lib/zip";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // a personal log is KB–MB; 20MB is generous headroom

/** Restores a .zip produced by /api/export. Upserts only — never deletes. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File is too large to be a valid backup" }, { status: 400 });
  }

  let entries;
  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    entries = readZip(buffer);
  } catch {
    return NextResponse.json({ error: "That doesn't look like a valid .zip file" }, { status: 400 });
  }

  const dataEntry = entries.find((entry) => entry.name === "data.json");
  if (!dataEntry) {
    return NextResponse.json({ error: "No data.json found inside the zip" }, { status: 400 });
  }

  let backup;
  try {
    const parsed = JSON.parse(dataEntry.data.toString("utf8"));
    backup = validateBackup(parsed);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }

  const summary = await importBackup(backup);
  return NextResponse.json({ ok: true, summary });
}
