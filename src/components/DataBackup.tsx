"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Summary = {
  setLogs: number;
  workoutDays: number;
  dailyMetrics: number;
  passkeys: number;
  profile: boolean;
};

/** Export everything to a .zip, or restore from one — the way out of "my server died". */
export function DataBackup() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState<File | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{ kind: "ok"; summary: Summary } | { kind: "error"; text: string } | null>(
    null,
  );

  async function exportData() {
    setExporting(true);
    setResult(null);
    try {
      const response = await fetch("/api/export");
      if (!response.ok) throw new Error("Export failed");

      // Trigger a real file download from the JSON/zip blob the API returns.
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const filename = /filename="([^"]+)"/.exec(disposition)?.[1] ?? "onyx-backup.zip";

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setResult({ kind: "error", text: "Could not export — try again." });
    } finally {
      setExporting(false);
    }
  }

  function pickFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ""; // lets picking the same file twice re-trigger onChange
    if (file) {
      setResult(null);
      setConfirming(file);
    }
  }

  async function restore() {
    if (!confirming) return;
    setRestoring(true);
    setResult(null);
    try {
      const body = new FormData();
      body.set("file", confirming);
      const response = await fetch("/api/import", { method: "POST", body });
      const json = await response.json();

      if (!response.ok) {
        setResult({ kind: "error", text: json.error ?? "Restore failed" });
      } else {
        setResult({ kind: "ok", summary: json.summary });
        router.refresh();
      }
    } catch {
      setResult({ kind: "error", text: "Could not reach the server — try again." });
    } finally {
      setRestoring(false);
      setConfirming(null);
    }
  }

  return (
    <section className="card p-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Backup &amp; restore</h2>
      <p className="mt-1 text-xs text-mist-400">
        A complete dump — every set, session, weigh-in, note and profile field, plus your passkeys — in
        one file you control. Useful before moving servers, or just to keep off-app.
      </p>

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={exportData}
          disabled={exporting}
          className="pressable flex-1 rounded-xl bg-white py-3 text-sm font-bold text-ink-900 disabled:opacity-50"
        >
          {exporting ? "Preparing…" : "Export data (.zip)"}
        </button>
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={restoring}
          className="pressable flex-1 rounded-xl bg-white/8 py-3 text-sm font-bold text-mist-200 disabled:opacity-50"
        >
          Restore from backup
        </button>
        <input ref={fileInput} type="file" accept=".zip" onChange={pickFile} className="hidden" />
      </div>

      {result?.kind === "ok" && (
        <div className="mt-3 rounded-xl bg-lime/10 px-3 py-2.5 text-xs text-lime">
          <p className="font-semibold">Restored ✓</p>
          <p className="mt-0.5 text-mist-200">
            {result.summary.setLogs} sets · {result.summary.workoutDays} sessions ·{" "}
            {result.summary.dailyMetrics} daily logs
            {result.summary.passkeys > 0 ? ` · ${result.summary.passkeys} passkeys` : ""}
            {result.summary.profile ? " · profile" : ""}
          </p>
        </div>
      )}
      {result?.kind === "error" && (
        <p className="mt-3 rounded-xl bg-red-500/10 px-3 py-2.5 text-xs text-red-300">{result.text}</p>
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-mist-400">
        Passkeys are included, but they&rsquo;re bound to this hostname — restore somewhere reachable by
        the same name and they still work; otherwise sign in with your access code and add a new one.
      </p>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="card w-full max-w-sm p-5">
            <h3 className="text-base font-bold text-white">Restore from {confirming.name}?</h3>
            <p className="mt-2 text-sm text-mist-300">
              This overwrites any existing entry that shares a date with the backup. Nothing else is
              deleted, and re-running this is always safe.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="pressable flex-1 rounded-xl bg-white/8 py-3 text-sm font-semibold text-mist-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={restore}
                disabled={restoring}
                className="pressable flex-1 rounded-xl bg-flame py-3 text-sm font-bold text-ink-900 disabled:opacity-50"
              >
                {restoring ? "Restoring…" : "Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
