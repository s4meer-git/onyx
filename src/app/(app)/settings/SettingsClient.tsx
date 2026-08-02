"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { enrolPasskey } from "@/app/login/LoginClient";
import { formatShort } from "@/lib/date";

type Passkey = {
  id: string;
  deviceName: string;
  createdAt: string;
  lastUsedAt: string | null;
};

export function SettingsClient({ passkeys }: { passkeys: Passkey[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  async function addPasskey() {
    setBusy(true);
    setMessage(null);
    try {
      await enrolPasskey();
      setMessage({ kind: "ok", text: "Passkey added to this device." });
      router.refresh();
    } catch (error) {
      const text = (error as Error).message;
      if (!/abort|NotAllowed/i.test(text)) setMessage({ kind: "error", text });
    } finally {
      setBusy(false);
    }
  }

  async function removePasskey(id: string) {
    await fetch("/api/auth/passkey/register", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id }),
    });
    router.refresh();
  }

  async function signOut() {
    await fetch("/api/auth/code", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="card p-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Passkeys</h2>
        <p className="mt-1 text-xs text-mist-400">
          Add one per device. Sign in with Face ID, Touch ID or your device PIN — no password to type.
        </p>

        <div className="mt-3 space-y-2">
          {passkeys.length === 0 && (
            <p className="rounded-xl bg-white/[.03] px-3 py-3 text-xs text-mist-400">
              No passkeys yet — add one so you never type the access code again.
            </p>
          )}
          {passkeys.map((passkey) => (
            <div key={passkey.id} className="flex items-center gap-3 rounded-xl bg-white/[.04] px-3 py-2.5">
              <span className="text-lg">🔑</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{passkey.deviceName}</p>
                <p className="text-[11px] text-mist-400">
                  Added {formatShort(passkey.createdAt.slice(0, 10))}
                  {passkey.lastUsedAt ? ` · last used ${formatShort(passkey.lastUsedAt.slice(0, 10))}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removePasskey(passkey.id)}
                className="pressable shrink-0 rounded-lg bg-white/8 px-2.5 py-1.5 text-[11px] font-semibold text-mist-300"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addPasskey}
          disabled={busy}
          className="pressable mt-3 w-full rounded-xl bg-white py-3 text-sm font-bold text-ink-900 disabled:opacity-50"
        >
          {busy ? "Waiting for device…" : "Add a passkey for this device"}
        </button>

        {message && (
          <p
            className={`mt-2 rounded-lg px-3 py-2 text-xs ${
              message.kind === "ok" ? "bg-lime/10 text-lime" : "bg-red-500/10 text-red-300"
            }`}
          >
            {message.text}
          </p>
        )}
      </section>

      <section className="card p-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">API</h2>
        <p className="mt-1 text-xs leading-relaxed text-mist-400">
          Read-only endpoints for widgets and shortcuts. Pass your token as{" "}
          <code className="rounded bg-black/40 px-1 py-0.5 text-mist-200">Authorization: Bearer …</code>{" "}
          or <code className="rounded bg-black/40 px-1 py-0.5 text-mist-200">?token=…</code>
        </p>
        <ul className="mt-3 space-y-1.5 text-[11px] text-mist-300">
          {["/api/v1/streak", "/api/v1/today", "/api/v1/stats", "/api/v1/schedule", "/api/v1/history?exercise=db-bench-press"].map(
            (path) => (
              <li key={path} className="rounded-lg bg-black/30 px-2.5 py-2 font-mono">
                GET {path}
              </li>
            ),
          )}
        </ul>
      </section>

      <button
        type="button"
        onClick={signOut}
        className="pressable w-full rounded-xl bg-white/6 py-3 text-sm font-semibold text-mist-300"
      >
        Sign out
      </button>
    </div>
  );
}
