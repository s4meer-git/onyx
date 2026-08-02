import Link from "next/link";
import { BodyMap } from "@/components/BodyMap";
import { ContributionGraph } from "@/components/charts/ContributionGraph";
import { StepsChart } from "@/components/charts/StepsChart";
import { WeightChart } from "@/components/charts/WeightChart";
import { EXERCISE_BY_SLUG } from "@/data/exercises";
import { regionIntensity } from "@/data/muscle-map";
import { addDays, todayISO } from "@/lib/date";
import {
  bmi,
  bmiBand,
  bmr,
  healthyWeightRange,
  stepDistanceKm,
  tdee,
  weeklyTrend,
} from "@/lib/body";
import {
  getDailyVolume,
  getMetricRange,
  getPersonalRecords,
  getProfile,
  getStreak,
  getTotals,
  getVolumeByExercise,
} from "@/lib/queries";

export const dynamic = "force-dynamic";

const WEEKS = 26;

export default async function ProgressPage() {
  const today = todayISO();

  const [streak, totals, records, volumeByDay, profile, metrics, recentVolume] = await Promise.all([
    getStreak(today),
    getTotals(),
    getPersonalRecords(),
    getDailyVolume(),
    getProfile(),
    getMetricRange(addDays(today, -365), today),
    getVolumeByExercise(addDays(today, -28)),
  ]);

  /* ── Contribution grid: whole weeks, Monday-first, ending this week ── */
  const jsDay = new Date(`${today}T12:00:00`).getDay();
  const daysAfterToday = jsDay === 0 ? 0 : 7 - jsDay; // pad out to Sunday
  const gridEnd = addDays(today, daysAfterToday);
  const gridStart = addDays(gridEnd, -(WEEKS * 7 - 1));
  const cells = Array.from({ length: WEEKS * 7 }, (_, index) => {
    const date = addDays(gridStart, index);
    const entry = volumeByDay[date];
    // Days that haven't happened yet stay empty rather than reading as rest days.
    return { date, sets: date > today ? 0 : (entry?.sets ?? 0), volume: entry?.volume ?? 0 };
  });

  /* ── Body metrics ── */
  const weighIns = metrics
    .filter((metric): metric is typeof metric & { weightKg: number } => metric.weightKg !== null)
    .map((metric) => ({ date: metric.date, weightKg: metric.weightKg }));
  const latestWeight = weighIns.at(-1)?.weightKg ?? null;

  const stepDays = metrics.filter((metric) => metric.steps !== null);
  const stepWindow = Array.from({ length: 30 }, (_, index) => {
    const date = addDays(today, index - 29);
    return { date, steps: metrics.find((metric) => metric.date === date)?.steps ?? null };
  });
  const loggedSteps = stepWindow.filter((point) => point.steps);
  const averageSteps = loggedSteps.length
    ? loggedSteps.reduce((sum, point) => sum + (point.steps ?? 0), 0) / loggedSteps.length
    : 0;

  const height = profile.heightCm;
  const bmiValue = height && latestWeight ? bmi(latestWeight, height) : null;
  const band = bmiValue ? bmiBand(bmiValue) : null;
  const range = height ? healthyWeightRange(height) : null;
  const age = profile.birthYear ? new Date().getFullYear() - profile.birthYear : null;
  const resting =
    height && latestWeight && age && profile.sex ? bmr(latestWeight, height, age, profile.sex) : null;

  const weightTrendPerWeek = weeklyTrend(
    weighIns.slice(-28).map((point) => ({ date: point.date, value: point.weightKg })),
  );

  /* ── Strength relative to bodyweight ── */
  const topLifts = Object.values(records)
    .filter((record) => record.estimated1RM)
    .sort((a, b) => (b.estimated1RM ?? 0) - (a.estimated1RM ?? 0))
    .slice(0, 5);

  const muscleHeat = regionIntensity(Object.keys(recentVolume), recentVolume);
  const trainedRegions = Object.keys(muscleHeat).length;

  return (
    <main className="space-y-4">
      <header className="px-1">
        <h1 className="text-2xl font-bold text-white">Progress</h1>
        <p className="text-xs text-mist-400">Consistency, body metrics and strength.</p>
      </header>

      <section className="grid grid-cols-2 gap-2">
        <Tile label="Current streak" value={`${streak.current}d`} />
        <Tile label="Best streak" value={`${streak.longest}d`} />
        <Tile label="Sessions" value={String(streak.totalWorkouts)} />
        <Tile
          label="Volume lifted"
          value={
            totals.volumeKg >= 1000
              ? `${(totals.volumeKg / 1000).toFixed(1)}t`
              : `${totals.volumeKg} kg`
          }
        />
      </section>

      <ContributionGraph days={cells} title={`Last ${WEEKS} weeks`} />

      {/* ── Body ── */}
      {bmiValue && band && height && latestWeight ? (
        <section className="card p-4">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Body</h2>
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="tabular text-4xl font-bold leading-none text-white">
                {bmiValue.toFixed(1)}
              </p>
              <p className="mt-1 text-xs text-mist-400">
                BMI · {latestWeight} kg at {height} cm
              </p>
            </div>
            <span
              className="rounded-full px-3 py-1.5 text-xs font-bold"
              style={{
                background:
                  band.tone === "good"
                    ? "rgba(25,158,112,.18)"
                    : band.tone === "warn"
                      ? "rgba(217,89,38,.18)"
                      : "rgba(255,255,255,.08)",
                color:
                  band.tone === "good"
                    ? "var(--viz-aqua)"
                    : band.tone === "warn"
                      ? "var(--viz-orange)"
                      : "#a4adbb",
              }}
            >
              {band.label}
            </span>
          </div>

          <BmiScale value={bmiValue} />

          <div className="mt-4 grid grid-cols-2 gap-2">
            {range && (
              <Mini
                label="Healthy range"
                value={`${range[0].toFixed(0)}–${range[1].toFixed(0)} kg`}
              />
            )}
            {weightTrendPerWeek !== null && (
              <Mini
                label="4-week trend"
                value={`${weightTrendPerWeek > 0 ? "+" : ""}${weightTrendPerWeek.toFixed(2)} kg/wk`}
              />
            )}
            {resting && <Mini label="Resting burn" value={`${Math.round(resting)} kcal`} />}
            {resting && averageSteps > 0 && (
              <Mini label="Daily burn" value={`${Math.round(tdee(resting, averageSteps))} kcal`} />
            )}
            {profile.goalWeightKg && (
              <Mini
                label="To goal"
                value={`${(latestWeight - profile.goalWeightKg).toFixed(1)} kg`}
              />
            )}
            {topLifts[0]?.estimated1RM && (
              <Mini
                label="Strongest lift"
                value={`${(topLifts[0].estimated1RM / latestWeight).toFixed(2)}× bw`}
              />
            )}
          </div>
        </section>
      ) : (
        <Link href="/settings" className="pressable card block p-4">
          <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">Body</h2>
          <p className="mt-2 text-sm text-mist-200">
            Add your height in Settings and log a weigh-in to unlock BMI, calorie burn and
            strength-to-bodyweight numbers.
          </p>
          <p className="mt-2 text-xs font-semibold text-flame">Open settings →</p>
        </Link>
      )}

      <WeightChart points={weighIns.slice(-60)} healthyRange={range} goalKg={profile.goalWeightKg} />

      <StepsChart points={stepWindow} />

      {stepDays.length > 0 && height && (
        <section className="grid grid-cols-3 gap-2">
          <Tile label="Avg steps" value={Math.round(averageSteps).toLocaleString()} />
          <Tile
            label="Distance/day"
            value={`${stepDistanceKm(averageSteps, height).toFixed(1)} km`}
          />
          <Tile
            label="Total steps"
            value={`${Math.round(
              stepDays.reduce((sum, day) => sum + (day.steps ?? 0), 0) / 1000,
            )}k`}
          />
        </section>
      )}

      {/* ── Muscle coverage ── */}
      <section className="card p-4">
        <h2 className="text-xs font-bold uppercase tracking-[0.16em] text-mist-400">
          Muscles trained · last 4 weeks
        </h2>
        {trainedRegions === 0 ? (
          <p className="mt-2 text-sm text-mist-400">Log some sets and your coverage will show here.</p>
        ) : (
          <BodyMap intensity={muscleHeat} className="mt-3" />
        )}
      </section>

      {/* ── Records ── */}
      <section className="space-y-2">
        <h2 className="px-1 text-xs font-bold uppercase tracking-[0.16em] text-mist-400">
          Personal records
        </h2>
        {Object.values(records).length === 0 ? (
          <p className="card p-4 text-sm text-mist-400">Log some sets and your records appear here.</p>
        ) : (
          Object.values(records)
            .filter((record) => record.bestWeight || record.bestReps)
            .sort((a, b) => (b.estimated1RM ?? 0) - (a.estimated1RM ?? 0))
            .map((record) => (
              <Link
                key={record.exerciseSlug}
                href={`/exercise/${record.exerciseSlug}`}
                className="pressable card flex items-center justify-between gap-3 p-3.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {EXERCISE_BY_SLUG[record.exerciseSlug]?.name ?? record.exerciseSlug}
                  </p>
                  <p className="tabular text-[11px] text-mist-400">
                    {record.bestWeight
                      ? `${record.bestWeight} kg × ${record.bestWeightReps ?? "—"}`
                      : `${record.bestReps} reps`}
                  </p>
                </div>
                {record.estimated1RM ? (
                  <div className="shrink-0 text-right">
                    <p className="tabular text-base font-bold text-flame-soft">
                      {Math.round(record.estimated1RM)} kg
                    </p>
                    <p className="text-[10px] uppercase tracking-wider text-mist-400">
                      est. 1RM
                      {latestWeight ? ` · ${(record.estimated1RM / latestWeight).toFixed(2)}× bw` : ""}
                    </p>
                  </div>
                ) : null}
              </Link>
            ))
        )}
      </section>
    </main>
  );
}

/** Where this BMI sits on the standard bands. */
function BmiScale({ value }: { value: number }) {
  const clamped = Math.max(14, Math.min(40, value));
  const percent = ((clamped - 14) / 26) * 100;
  const bands = [
    { width: 17.3, tone: "#4a5568" },
    { width: 25, tone: "var(--viz-aqua)" },
    { width: 19.2, tone: "var(--viz-orange)" },
    { width: 38.5, tone: "#8a3d14" },
  ];

  return (
    <div className="mt-4">
      <div className="flex h-2 gap-[2px] overflow-hidden rounded-full">
        {bands.map((band) => (
          <span key={band.tone} style={{ width: `${band.width}%`, background: band.tone, opacity: 0.55 }} />
        ))}
      </div>
      <div className="relative h-3">
        <span
          className="absolute top-0 h-3 w-0.5 -translate-x-1/2 rounded bg-white"
          style={{ left: `${percent}%` }}
        />
      </div>
      {/* Ticks sit at their true scale position, not evenly spaced. */}
      <div className="tabular relative h-3 text-[9px] text-mist-400">
        {[14, 18.5, 25, 30, 40].map((tick, index, list) => (
          <span
            key={tick}
            className="absolute top-0"
            style={{
              left: `${((tick - 14) / 26) * 100}%`,
              transform:
                index === 0 ? "none" : index === list.length - 1 ? "translateX(-100%)" : "translateX(-50%)",
            }}
          >
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-3.5">
      <p className="text-[10px] uppercase tracking-wider text-mist-400">{label}</p>
      <p className="tabular mt-1 text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[.04] px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-mist-400">{label}</p>
      <p className="tabular mt-0.5 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
