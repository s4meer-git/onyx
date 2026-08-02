/**
 * Everything derived from height, bodyweight, steps and lifting volume.
 * Pure functions — no database access — so they're easy to reason about.
 */

export type Profile = {
  heightCm: number | null;
  birthYear: number | null;
  sex: "male" | "female" | null;
  goalWeightKg: number | null;
};

export type DayMetric = {
  date: string;
  steps: number | null;
  weightKg: number | null;
};

/* ─────────────────────────────── body composition ─────────────────────────────── */

export function bmi(weightKg: number, heightCm: number): number {
  const metres = heightCm / 100;
  return weightKg / (metres * metres);
}

export type BmiBand = { label: string; tone: "low" | "good" | "warn" | "high" };

export function bmiBand(value: number): BmiBand {
  if (value < 18.5) return { label: "Underweight", tone: "low" };
  if (value < 25) return { label: "Healthy", tone: "good" };
  if (value < 30) return { label: "Overweight", tone: "warn" };
  return { label: "Obese", tone: "high" };
}

/** The weight range that would put you in the healthy BMI band. */
export function healthyWeightRange(heightCm: number): [number, number] {
  const metres = heightCm / 100;
  return [18.5 * metres * metres, 24.9 * metres * metres];
}

/**
 * Mifflin–St Jeor resting energy expenditure. Needs age and sex, so it only
 * shows once the profile is filled in.
 */
export function bmr(weightKg: number, heightCm: number, age: number, sex: "male" | "female"): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

/** Rough daily burn: BMR plus activity, where steps drive the activity factor. */
export function tdee(restingKcal: number, averageSteps: number): number {
  const factor =
    averageSteps < 5000 ? 1.25 : averageSteps < 7500 ? 1.4 : averageSteps < 10000 ? 1.55 : 1.7;
  return restingKcal * factor;
}

/** Walking burn, using the standard ~0.04 kcal per step per kg of bodyweight. */
export function stepCalories(steps: number, weightKg: number): number {
  return steps * weightKg * 0.0005;
}

/** Steps → kilometres, assuming a stride of roughly 0.415 × height. */
export function stepDistanceKm(steps: number, heightCm: number): number {
  return (steps * (heightCm * 0.415)) / 100_000;
}

/* ─────────────────────────────── strength ─────────────────────────────── */

/** Epley one-rep-max estimate. */
export const estimate1RM = (weightKg: number, reps: number) => weightKg * (1 + reps / 30);

/**
 * Strength relative to bodyweight — the number that actually tracks progress
 * when your weight is also moving.
 */
export function relativeStrength(oneRepMax: number, bodyweightKg: number): number {
  return oneRepMax / bodyweightKg;
}

export type TrendPoint = { date: string; value: number };

/** Least-squares slope, expressed as change per week. */
export function weeklyTrend(points: TrendPoint[]): number | null {
  if (points.length < 2) return null;

  const toDays = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
  const originDay = toDays(points[0].date);

  const xs = points.map((point) => toDays(point.date) - originDay);
  const ys = points.map((point) => point.value);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    numerator += (xs[i] - meanX) * (ys[i] - meanY);
    denominator += (xs[i] - meanX) ** 2;
  }
  if (denominator === 0) return null;

  return (numerator / denominator) * 7;
}

/** Centred moving average, used to smooth the noisy daily weigh-ins. */
export function movingAverage(points: TrendPoint[], window = 7): TrendPoint[] {
  return points.map((point, index) => {
    const from = Math.max(0, index - Math.floor(window / 2));
    const to = Math.min(points.length, from + window);
    const slice = points.slice(from, to);
    return { date: point.date, value: slice.reduce((sum, p) => sum + p.value, 0) / slice.length };
  });
}
