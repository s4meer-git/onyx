"use client";

import { useState } from "react";

/**
 * Steps and bodyweight for the day. Lives on the workout screen so everything
 * about a given day is logged in one place.
 */
export function DailyLog({
  date,
  initialSteps,
  initialWeight,
  accent,
  lastWeight,
}: {
  date: string;
  initialSteps: number | null;
  initialWeight: number | null;
  accent: string;
  lastWeight: number | null;
}) {
  const [steps, setSteps] = useState(initialSteps?.toString() ?? "");
  const [weight, setWeight] = useState(initialWeight?.toString() ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const dirty =
    steps !== (initialSteps?.toString() ?? "") || weight !== (initialWeight?.toString() ?? "");

  async function save() {
    setState("saving");
    const response = await fetch("/api/metrics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        date,
        steps: steps === "" ? null : Number(steps),
        weightKg: weight === "" ? null : Number(weight),
      }),
    });
    if (response.ok) {
      setState("saved");
      navigator.vibrate?.(12);
      setTimeout(() => setState("idle"), 2000);
    } else {
      setState("error");
    }
  }

  const delta = weight && lastWeight ? Number(weight) - lastWeight : null;

  return (
    <section className="card p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Today&rsquo;s log</h2>
        {state === "saved" && <span className="text-[11px] font-semibold text-lime">Saved ✓</span>}
        {state === "error" && <span className="text-[11px] font-semibold text-red-400">Failed</span>}
      </div>

      <div className="flex gap-2">
        <Field
          label="Steps"
          value={steps}
          onChange={setSteps}
          placeholder="0"
          inputMode="numeric"
          suffix=""
        />
        <Field
          label="Weight"
          value={weight}
          onChange={setWeight}
          placeholder={lastWeight?.toFixed(1) ?? "—"}
          inputMode="decimal"
          suffix="kg"
          hint={
            delta === null || Math.abs(delta) < 0.05
              ? undefined
              : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`
          }
        />
        <button
          type="button"
          onClick={save}
          disabled={!dirty || state === "saving"}
          className="pressable mt-[18px] h-11 shrink-0 rounded-xl px-4 text-sm font-bold text-ink-900 disabled:opacity-30"
          style={{ background: accent }}
        >
          {state === "saving" ? "…" : "Save"}
        </button>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  suffix,
  inputMode,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  suffix: string;
  inputMode: "numeric" | "decimal";
  hint?: string;
}) {
  return (
    <label className="min-w-0 flex-1">
      <span className="mb-1 block px-1 text-[10px] uppercase tracking-wider text-mist-400">
        {label}
        {hint && <span className="ml-1 text-mist-300">{hint}</span>}
      </span>
      <span className="flex h-11 items-baseline rounded-xl bg-black/25 px-3">
        <input
          type="number"
          inputMode={inputMode}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className="tabular w-full min-w-0 bg-transparent text-base font-semibold text-white outline-none placeholder:text-mist-400/60"
        />
        {suffix && <span className="shrink-0 text-[10px] text-mist-400">{suffix}</span>}
      </span>
    </label>
  );
}
