import { notFound } from "next/navigation";
import { BackButton } from "@/components/BackButton";
import { BodyMap } from "@/components/BodyMap";
import { ClipPlayer } from "@/components/ClipPlayer";
import { EXERCISES, getExercise } from "@/data/exercises";
import { regionIntensity } from "@/data/muscle-map";
import { SCHEDULE } from "@/data/schedule";
import { relativeDay } from "@/lib/date";
import { getExerciseHistory, getPersonalRecords } from "@/lib/queries";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return EXERCISES.map((exercise) => ({ slug: exercise.slug }));
}

export default async function ExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const exercise = getExercise(slug);
  if (!exercise) notFound();

  const [records, history] = await Promise.all([getPersonalRecords(), getExerciseHistory(slug, 12)]);
  const record = records[slug];
  const days = SCHEDULE.filter((day) => day.blocks.some((block) => block.items.some((i) => i.slug === slug)));
  const best = history.reduce((max, entry) => Math.max(max, entry.volume || entry.totalReps), 0);

  return (
    <main className="space-y-5">
      <header className="flex items-start gap-3 px-1">
        <BackButton fallback="/schedule" />
        <div className="min-w-0">
          <h1 className="text-xl font-bold leading-tight text-white">{exercise.name}</h1>
          <p className="text-xs text-mist-400">{exercise.target}</p>
        </div>
      </header>

      <ClipPlayer clips={exercise.clips} className="w-full" />

      <div className="flex flex-wrap gap-1.5 px-1">
        {exercise.primary.map((muscle) => (
          <span key={muscle} className="rounded-full bg-flame/15 px-2.5 py-1 text-[11px] font-semibold text-flame-soft">
            {muscle}
          </span>
        ))}
        {exercise.secondary?.map((muscle) => (
          <span key={muscle} className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] text-mist-300">
            {muscle}
          </span>
        ))}
        {exercise.equipment.map((item) => (
          <span key={item} className="rounded-full bg-white/[.03] px-2.5 py-1 text-[11px] text-mist-400">
            {item}
          </span>
        ))}
      </div>

      {record && (record.bestWeight || record.bestReps) && (
        <section className="card grid grid-cols-3 divide-x divide-white/8 p-1">
          <Metric label="Best weight" value={record.bestWeight ? `${record.bestWeight} kg` : "—"} />
          <Metric label="Best reps" value={record.bestReps ? String(record.bestReps) : "—"} />
          <Metric
            label="Est. 1RM"
            value={record.estimated1RM ? `${Math.round(record.estimated1RM)} kg` : "—"}
          />
        </section>
      )}

      <Section title="Muscles worked">
        <BodyMap intensity={regionIntensity([exercise.slug])} />
      </Section>

      <Section title="Set-up">
        <ol className="space-y-2">
          {exercise.setup.map((line, index) => (
            <Step key={line} index={index + 1} text={line} muted />
          ))}
        </ol>
      </Section>

      <Section title="How to perform">
        <ol className="space-y-2">
          {exercise.steps.map((line, index) => (
            <Step key={line} index={index + 1} text={line} />
          ))}
        </ol>
      </Section>

      <Section title="Form & posture" accent="lime">
        <ul className="space-y-2">
          {exercise.form.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-mist-200">
              <span className="mt-0.5 shrink-0 text-lime">✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Common mistakes" accent="flame">
        <ul className="space-y-2">
          {exercise.mistakes.map((line) => (
            <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-mist-200">
              <span className="mt-0.5 shrink-0 text-flame">✕</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Section>

      {(exercise.breathing || exercise.tempo) && (
        <section className="card space-y-2 p-4">
          {exercise.breathing && <Detail label="Breathing" value={exercise.breathing} />}
          {exercise.tempo && <Detail label="Tempo" value={exercise.tempo} />}
        </section>
      )}

      {history.length > 0 && (
        <Section title="Your history">
          <div className="space-y-1.5">
            {[...history].reverse().map((entry) => {
              const value = entry.volume || entry.totalReps;
              return (
                <div key={entry.date} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[11px] text-mist-400">{relativeDay(entry.date)}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded-md bg-white/5">
                    <div
                      className="h-full rounded-md bg-flame/60"
                      style={{ width: `${best ? Math.max(6, (value / best) * 100) : 6}%` }}
                    />
                  </div>
                  <span className="tabular w-24 shrink-0 text-right text-[11px] text-mist-300">
                    {entry.topWeight ? `${entry.topWeight}kg · ` : ""}
                    {entry.totalReps} reps
                  </span>
                </div>
              );
            })}
          </div>
        </Section>
      )}

      <section className="px-1 pb-2">
        <p className="text-xs text-mist-400">
          Scheduled on{" "}
          <span className="text-mist-200">
            {days.map((day) => day.name).join(", ") || "no day"}
          </span>
        </p>
      </section>
    </main>
  );
}

function Section({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: "lime" | "flame";
}) {
  return (
    <section className="card p-4">
      <h2
        className={`mb-3 text-xs font-bold uppercase tracking-[0.16em] ${
          accent === "lime" ? "text-lime" : accent === "flame" ? "text-flame" : "text-mist-400"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function Step({ index, text, muted }: { index: number; text: string; muted?: boolean }) {
  return (
    <li className="flex gap-3">
      <span
        className={`tabular mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold ${
          muted ? "bg-white/6 text-mist-400" : "bg-white text-ink-900"
        }`}
      >
        {index}
      </span>
      <span className="text-sm leading-relaxed text-mist-200">{text}</span>
    </li>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wider text-mist-400">{label}</p>
      <p className="tabular mt-0.5 text-base font-bold text-white">{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-20 shrink-0 text-[11px] uppercase tracking-wider text-mist-400">{label}</span>
      <span className="text-sm text-mist-200">{value}</span>
    </div>
  );
}
