"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

export function LoginClient({ hasPasskey }: { hasPasskey: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"passkey" | "code" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(!hasPasskey);
  const [code, setCode] = useState("");

  async function signInWithPasskey() {
    setBusy("passkey");
    setError(null);
    try {
      const optionsResponse = await fetch("/api/auth/passkey/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "options" }),
      });
      const options = await optionsResponse.json();
      if (!optionsResponse.ok) throw new Error(options.error ?? "Could not start sign-in");

      const credential = await startAuthentication({ optionsJSON: options });

      const verifyResponse = await fetch("/api/auth/passkey/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ step: "verify", credential }),
      });
      const result = await verifyResponse.json();
      if (!verifyResponse.ok) throw new Error(result.error ?? "Sign-in failed");

      router.replace("/");
      router.refresh();
    } catch (caught) {
      const message = (caught as Error).message;
      // The user cancelling the system sheet isn't an error worth shouting about.
      setError(/abort|NotAllowed/i.test(message) ? null : message);
    } finally {
      setBusy(null);
    }
  }

  /** First device: prove ownership with the access code, then create a passkey. */
  async function signInWithCode(createPasskey: boolean) {
    setBusy("code");
    setError(null);
    try {
      const response = await fetch("/api/auth/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Incorrect code");

      if (createPasskey) {
        try {
          await enrolPasskey(code);
        } catch {
          // Signed in anyway — the passkey can be added later from Settings.
        }
      }

      router.replace("/");
      router.refresh();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center gap-8 px-6 py-12">
      <header className="text-center">
        <img src="/logo.svg" alt="ONYX" className="brand-mark mx-auto mb-5 h-20 w-auto select-none" />
        <h1 className="sr-only">ONYX</h1>
        <p className="mt-1 text-sm text-mist-400">Your training log. Sign in to continue.</p>
      </header>

      <div className="space-y-3">
        {hasPasskey && (
          <button
            type="button"
            onClick={signInWithPasskey}
            disabled={busy !== null}
            className="pressable flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-sm font-bold text-ink-900 disabled:opacity-60"
          >
            {busy === "passkey" ? "Waiting…" : "🔑 Sign in with passkey"}
          </button>
        )}

        {!showCode && hasPasskey && (
          <button
            type="button"
            onClick={() => setShowCode(true)}
            className="w-full py-2 text-center text-xs font-semibold text-mist-400"
          >
            Use access code instead
          </button>
        )}

        {showCode && (
          <div className="card space-y-3 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wider text-mist-400">
              Access code
            </label>
            <input
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="current-password"
              inputMode="text"
              placeholder="••••••••"
              className="w-full rounded-xl bg-black/30 px-4 py-3 text-center text-lg tracking-[0.3em] text-white outline-none focus:ring-2 focus:ring-flame/50"
            />
            <button
              type="button"
              onClick={() => signInWithCode(true)}
              disabled={busy !== null || code.length === 0}
              className="pressable w-full rounded-xl bg-flame py-3 text-sm font-bold text-ink-900 disabled:opacity-40"
            >
              {busy === "code" ? "Checking…" : hasPasskey ? "Sign in" : "Sign in & create passkey"}
            </button>
            {!hasPasskey && (
              <p className="text-center text-[11px] leading-relaxed text-mist-400">
                Your device will offer to save a passkey — after that, Face ID or your fingerprint is all
                you need.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-xl bg-red-500/10 px-4 py-3 text-center text-xs text-red-300">{error}</p>
        )}
      </div>
    </main>
  );
}

/** Shared by the login screen and Settings → "Add this device". */
export async function enrolPasskey(accessCode?: string) {
  const optionsResponse = await fetch("/api/auth/passkey/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ step: "options", accessCode }),
  });
  const options = await optionsResponse.json();
  if (!optionsResponse.ok) throw new Error(options.error ?? "Could not start passkey set-up");

  const credential = await startRegistration({ optionsJSON: options });

  const verifyResponse = await fetch("/api/auth/passkey/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      step: "verify",
      credential,
      accessCode,
      deviceName: describeDevice(),
    }),
  });
  const result = await verifyResponse.json();
  if (!verifyResponse.ok) throw new Error(result.error ?? "Passkey could not be saved");
  return result;
}

function describeDevice() {
  const agent = navigator.userAgent;
  if (/iPhone/.test(agent)) return "iPhone";
  if (/iPad/.test(agent)) return "iPad";
  if (/Android/.test(agent)) return "Android";
  if (/Mac/.test(agent)) return "Mac";
  if (/Windows/.test(agent)) return "Windows";
  return "Passkey";
}
