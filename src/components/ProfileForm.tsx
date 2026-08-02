"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { ProfileRow } from "@/lib/queries";

/** Height, age and sex — the fixed inputs BMI and calorie maths need. */
export function ProfileForm({ profile }: { profile: ProfileRow }) {
  const router = useRouter();
  const [height, setHeight] = useState(profile.heightCm?.toString() ?? "");
  const [birthYear, setBirthYear] = useState(profile.birthYear?.toString() ?? "");
  const [sex, setSex] = useState(profile.sex ?? "");
  const [goal, setGoal] = useState(profile.goalWeightKg?.toString() ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setState("saving");
    setError(null);
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        heightCm: height || null,
        birthYear: birthYear || null,
        sex: sex || null,
        goalWeightKg: goal || null,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not save");
      setState("idle");
      return;
    }
    setState("saved");
    router.refresh();
    setTimeout(() => setState("idle"), 2000);
  }

  return (
    <section className="card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Body profile</h2>
        {state === "saved" && <span className="text-[11px] font-semibold text-lime">Saved ✓</span>}
      </div>
      <p className="mt-1 text-xs text-mist-400">
        Powers BMI, healthy-weight range, calorie burn and strength-to-bodyweight ratios.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Field label="Height" suffix="cm" value={height} onChange={setHeight} placeholder="175" />
        <Field label="Birth year" suffix="" value={birthYear} onChange={setBirthYear} placeholder="1995" />
        <Field label="Goal weight" suffix="kg" value={goal} onChange={setGoal} placeholder="70" />

        <label className="min-w-0">
          <span className="mb-1 block px-1 text-[10px] uppercase tracking-wider text-mist-400">Sex</span>
          <div className="flex h-11 gap-1 rounded-xl bg-black/25 p-1">
            {[
              { value: "male", label: "M" },
              { value: "female", label: "F" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setSex(sex === option.value ? "" : option.value)}
                className={`flex-1 rounded-lg text-sm font-bold transition ${
                  sex === option.value ? "bg-white text-ink-900" : "text-mist-400"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </label>
      </div>

      <p className="mt-2 px-1 text-[10px] text-mist-400">
        Birth year and sex are only used for the resting-calorie formula. Leave them blank to skip it.
      </p>

      <button
        type="button"
        onClick={save}
        disabled={state === "saving"}
        className="pressable mt-3 w-full rounded-xl bg-white py-3 text-sm font-bold text-ink-900 disabled:opacity-50"
      >
        {state === "saving" ? "Saving…" : "Save profile"}
      </button>

      {error && (
        <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>
      )}
    </section>
  );
}

function Field({
  label,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="min-w-0">
      <span className="mb-1 block px-1 text-[10px] uppercase tracking-wider text-mist-400">{label}</span>
      <span className="flex h-11 items-baseline rounded-xl bg-black/25 px-3">
        <input
          type="number"
          inputMode="decimal"
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
