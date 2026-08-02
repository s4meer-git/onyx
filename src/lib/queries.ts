import { and, asc, desc, eq, gte, isNotNull, lt, lte, sql } from "drizzle-orm";
import { getDb, schema } from "./db";
import { todayISO } from "./date";

const { credentials, dailyMetrics, profiles, setLogs, users, workoutDays } = schema;

/** The app is single-user; the id is fixed unless overridden. */
export const USER_ID = process.env.APP_USER_ID ?? "me";
export const USER_NAME = process.env.APP_USER_NAME ?? "Athlete";

export async function ensureUser() {
  const db = await getDb();
  await db
    .insert(users)
    .values({ id: USER_ID, displayName: USER_NAME })
    .onConflictDoNothing();
  return USER_ID;
}

/* ────────────────────────────── set logging ────────────────────────────── */

export type SetLogInput = {
  workoutDate: string;
  dayKey: string;
  exerciseSlug: string;
  setIndex: number;
  reps?: number | null;
  weightKg?: number | null;
  durationSec?: number | null;
  note?: string | null;
};

export type SetLog = {
  id: string;
  workoutDate: string;
  dayKey: string;
  exerciseSlug: string;
  setIndex: number;
  reps: number | null;
  weightKg: number | null;
  durationSec: number | null;
  note: string | null;
};

const toNumber = (value: unknown): number | null =>
  value === null || value === undefined ? null : Number(value);

const rowToSetLog = (row: any): SetLog => ({
  id: row.id,
  workoutDate: String(row.workout_date ?? row.workoutDate),
  dayKey: row.day_key ?? row.dayKey,
  exerciseSlug: row.exercise_slug ?? row.exerciseSlug,
  setIndex: Number(row.set_index ?? row.setIndex),
  reps: toNumber(row.reps),
  weightKg: toNumber(row.weight_kg ?? row.weightKg),
  durationSec: toNumber(row.duration_sec ?? row.durationSec),
  note: row.note ?? null,
});

export async function saveSet(input: SetLogInput): Promise<SetLog> {
  const db = await getDb();
  await ensureUser();

  const id = `${USER_ID}:${input.workoutDate}:${input.exerciseSlug}:${input.setIndex}`;
  const values = {
    id,
    userId: USER_ID,
    workoutDate: input.workoutDate,
    dayKey: input.dayKey,
    exerciseSlug: input.exerciseSlug,
    setIndex: input.setIndex,
    reps: input.reps ?? null,
    weightKg: input.weightKg === null || input.weightKg === undefined ? null : String(input.weightKg),
    durationSec: input.durationSec ?? null,
    note: input.note ?? null,
  };

  const [row] = await db
    .insert(setLogs)
    .values(values)
    .onConflictDoUpdate({
      target: [setLogs.userId, setLogs.workoutDate, setLogs.exerciseSlug, setLogs.setIndex],
      set: {
        reps: values.reps,
        weightKg: values.weightKg,
        durationSec: values.durationSec,
        note: values.note,
        dayKey: values.dayKey,
        updatedAt: new Date(),
      },
    })
    .returning();

  return rowToSetLog(row);
}

export async function deleteSet(workoutDate: string, exerciseSlug: string, setIndex: number) {
  const db = await getDb();
  await db
    .delete(setLogs)
    .where(
      and(
        eq(setLogs.userId, USER_ID),
        eq(setLogs.workoutDate, workoutDate),
        eq(setLogs.exerciseSlug, exerciseSlug),
        eq(setLogs.setIndex, setIndex),
      ),
    );
}

export async function getSetsForDate(workoutDate: string): Promise<SetLog[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(setLogs)
    .where(and(eq(setLogs.userId, USER_ID), eq(setLogs.workoutDate, workoutDate)))
    .orderBy(asc(setLogs.exerciseSlug), asc(setLogs.setIndex));
  return rows.map(rowToSetLog);
}

/* ─────────────────────────── history & records ─────────────────────────── */

/** The most recent previous session for an exercise (used for "last time" ghosts). */
export async function getLastSession(exerciseSlug: string, beforeDate: string) {
  const db = await getDb();
  const [latest] = await db
    .select({ workoutDate: setLogs.workoutDate })
    .from(setLogs)
    .where(
      and(
        eq(setLogs.userId, USER_ID),
        eq(setLogs.exerciseSlug, exerciseSlug),
        lt(setLogs.workoutDate, beforeDate),
      ),
    )
    .orderBy(desc(setLogs.workoutDate))
    .limit(1);

  if (!latest) return null;

  const date = String(latest.workoutDate);
  const rows = await db
    .select()
    .from(setLogs)
    .where(
      and(
        eq(setLogs.userId, USER_ID),
        eq(setLogs.exerciseSlug, exerciseSlug),
        eq(setLogs.workoutDate, date),
      ),
    )
    .orderBy(asc(setLogs.setIndex));

  return { date, sets: rows.map(rowToSetLog) };
}

export async function getLastSessions(slugs: string[], beforeDate: string) {
  const entries = await Promise.all(
    slugs.map(async (slug) => [slug, await getLastSession(slug, beforeDate)] as const),
  );
  return Object.fromEntries(entries);
}

export type PersonalRecord = {
  exerciseSlug: string;
  bestWeight: number | null;
  bestWeightReps: number | null;
  bestReps: number | null;
  /** When the best rep count was hit — the record date for bodyweight work. */
  bestRepsOn: string | null;
  estimated1RM: number | null;
  achievedOn: string | null;
};

/** Epley formula — good enough for tracking progress in the 1–15 rep range. */
export const estimate1RM = (weight: number, reps: number) => weight * (1 + reps / 30);

export async function getPersonalRecords(): Promise<Record<string, PersonalRecord>> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.userId, USER_ID));

  const records: Record<string, PersonalRecord> = {};

  for (const raw of rows) {
    const log = rowToSetLog(raw);
    const record = (records[log.exerciseSlug] ??= {
      exerciseSlug: log.exerciseSlug,
      bestWeight: null,
      bestWeightReps: null,
      bestReps: null,
      bestRepsOn: null,
      estimated1RM: null,
      achievedOn: null,
    });

    if (log.reps !== null && (record.bestReps === null || log.reps > record.bestReps)) {
      record.bestReps = log.reps;
      record.bestRepsOn = log.workoutDate;
    }

    if (log.weightKg !== null && log.weightKg > 0) {
      if (record.bestWeight === null || log.weightKg > record.bestWeight) {
        record.bestWeight = log.weightKg;
        record.bestWeightReps = log.reps;
      }
      if (log.reps) {
        const oneRm = estimate1RM(log.weightKg, log.reps);
        if (record.estimated1RM === null || oneRm > record.estimated1RM) {
          record.estimated1RM = oneRm;
          record.achievedOn = log.workoutDate;
        }
      }
    }
  }

  return records;
}

export async function getExerciseHistory(exerciseSlug: string, limitDays = 20) {
  const db = await getDb();
  const rows = await db
    .select({
      workoutDate: setLogs.workoutDate,
      sets: sql<number>`count(*)`,
      topWeight: sql<number>`max(${setLogs.weightKg})`,
      totalReps: sql<number>`sum(coalesce(${setLogs.reps}, 0))`,
      volume: sql<number>`sum(coalesce(${setLogs.weightKg}, 0) * coalesce(${setLogs.reps}, 0))`,
    })
    .from(setLogs)
    .where(and(eq(setLogs.userId, USER_ID), eq(setLogs.exerciseSlug, exerciseSlug)))
    .groupBy(setLogs.workoutDate)
    .orderBy(desc(setLogs.workoutDate))
    .limit(limitDays);

  return rows
    .map((row) => ({
      date: String(row.workoutDate),
      sets: Number(row.sets),
      topWeight: toNumber(row.topWeight),
      totalReps: Number(row.totalReps ?? 0),
      volume: Number(row.volume ?? 0),
    }))
    .reverse();
}

/* ─────────────────────────────── streaks ─────────────────────────────── */

export type StreakInfo = {
  current: number;
  longest: number;
  todayLogged: boolean;
  totalWorkouts: number;
  /** Most recent dates first. */
  activeDates: string[];
  lastWorkoutDate: string | null;
};

const dayBefore = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
};

export async function getStreak(today = todayISO()): Promise<StreakInfo> {
  const db = await getDb();
  const rows = await db
    .selectDistinct({ workoutDate: setLogs.workoutDate })
    .from(setLogs)
    .where(eq(setLogs.userId, USER_ID))
    .orderBy(desc(setLogs.workoutDate));

  const dates = rows.map((row) => String(row.workoutDate));
  const active = new Set(dates);

  const todayLogged = active.has(today);
  // Duolingo rule: the streak survives until the end of the following day.
  let cursor = todayLogged ? today : dayBefore(today);
  let current = 0;
  while (active.has(cursor)) {
    current += 1;
    cursor = dayBefore(cursor);
  }

  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  // `dates` is newest-first; walk it oldest-first to measure consecutive runs.
  for (const date of [...dates].reverse()) {
    run = previous !== null && dayBefore(date) === previous ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }

  return {
    current,
    longest,
    todayLogged,
    totalWorkouts: dates.length,
    activeDates: dates,
    lastWorkoutDate: dates[0] ?? null,
  };
}

/* ─────────────────────────── day completion ─────────────────────────── */

export async function markDayComplete(workoutDate: string, dayKey: string, complete: boolean) {
  const db = await getDb();
  await ensureUser();
  await db
    .insert(workoutDays)
    .values({
      userId: USER_ID,
      workoutDate,
      dayKey,
      completedAt: complete ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [workoutDays.userId, workoutDays.workoutDate],
      set: { completedAt: complete ? new Date() : null, dayKey },
    });
}

export async function getDayCompletion(workoutDate: string) {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(workoutDays)
    .where(and(eq(workoutDays.userId, USER_ID), eq(workoutDays.workoutDate, workoutDate)))
    .limit(1);
  return row?.completedAt ? new Date(row.completedAt as any).toISOString() : null;
}

/* ─────────────────────────────── summary ─────────────────────────────── */

export async function getTotals() {
  const db = await getDb();
  const [row] = await db
    .select({
      sets: sql<number>`count(*)`,
      reps: sql<number>`sum(coalesce(${setLogs.reps}, 0))`,
      volume: sql<number>`sum(coalesce(${setLogs.weightKg}, 0) * coalesce(${setLogs.reps}, 0))`,
    })
    .from(setLogs)
    .where(eq(setLogs.userId, USER_ID));

  return {
    sets: Number(row?.sets ?? 0),
    reps: Number(row?.reps ?? 0),
    volumeKg: Math.round(Number(row?.volume ?? 0)),
  };
}

/* ──────────────────────── profile & daily metrics ──────────────────────── */

export type ProfileRow = {
  heightCm: number | null;
  birthYear: number | null;
  sex: "male" | "female" | null;
  goalWeightKg: number | null;
};

export async function getProfile(): Promise<ProfileRow> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, USER_ID))
    .limit(1);

  return {
    heightCm: toNumber(row?.heightCm),
    birthYear: row?.birthYear ?? null,
    sex: (row?.sex as "male" | "female" | null) ?? null,
    goalWeightKg: toNumber(row?.goalWeightKg),
  };
}

export async function saveProfile(input: Partial<ProfileRow>) {
  const db = await getDb();
  await ensureUser();

  const values = {
    userId: USER_ID,
    heightCm: input.heightCm == null ? null : String(input.heightCm),
    birthYear: input.birthYear ?? null,
    sex: input.sex ?? null,
    goalWeightKg: input.goalWeightKg == null ? null : String(input.goalWeightKg),
    updatedAt: new Date(),
  };

  await db
    .insert(profiles)
    .values(values)
    .onConflictDoUpdate({ target: profiles.userId, set: values });

  return getProfile();
}

export type MetricRow = { date: string; steps: number | null; weightKg: number | null };

const rowToMetric = (row: any): MetricRow => ({
  date: String(row.metric_date ?? row.metricDate),
  steps: toNumber(row.steps),
  weightKg: toNumber(row.weight_kg ?? row.weightKg),
});

export async function saveDailyMetric(input: {
  date: string;
  steps?: number | null;
  weightKg?: number | null;
}) {
  const db = await getDb();
  await ensureUser();

  // Only overwrite the fields actually sent, so logging steps doesn't wipe
  // a weigh-in recorded earlier the same day.
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.steps !== undefined) patch.steps = input.steps;
  if (input.weightKg !== undefined) {
    patch.weightKg = input.weightKg === null ? null : String(input.weightKg);
  }

  await db
    .insert(dailyMetrics)
    .values({
      userId: USER_ID,
      metricDate: input.date,
      steps: input.steps ?? null,
      weightKg: input.weightKg == null ? null : String(input.weightKg),
    })
    .onConflictDoUpdate({
      target: [dailyMetrics.userId, dailyMetrics.metricDate],
      set: patch,
    });

  return getDailyMetric(input.date);
}

export async function getDailyMetric(date: string): Promise<MetricRow> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(dailyMetrics)
    .where(and(eq(dailyMetrics.userId, USER_ID), eq(dailyMetrics.metricDate, date)))
    .limit(1);
  return row ? rowToMetric(row) : { date, steps: null, weightKg: null };
}

export async function getMetricRange(from: string, to: string): Promise<MetricRow[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.userId, USER_ID),
        gte(dailyMetrics.metricDate, from),
        lte(dailyMetrics.metricDate, to),
      ),
    )
    .orderBy(asc(dailyMetrics.metricDate));
  return rows.map(rowToMetric);
}

/** Most recent weigh-in on or before a date — used for BMI and ratios. */
export async function getLatestWeight(onOrBefore = todayISO()): Promise<MetricRow | null> {
  const db = await getDb();
  const [row] = await db
    .select()
    .from(dailyMetrics)
    .where(
      and(
        eq(dailyMetrics.userId, USER_ID),
        lte(dailyMetrics.metricDate, onOrBefore),
        isNotNull(dailyMetrics.weightKg),
      ),
    )
    .orderBy(desc(dailyMetrics.metricDate))
    .limit(1);
  return row ? rowToMetric(row) : null;
}

/** Sets logged per day, for the contribution graph. */
export async function getDailyVolume(): Promise<Record<string, { sets: number; volume: number }>> {
  const db = await getDb();
  const rows = await db
    .select({
      workoutDate: setLogs.workoutDate,
      sets: sql<number>`count(*)`,
      volume: sql<number>`sum(coalesce(${setLogs.weightKg}, 0) * coalesce(${setLogs.reps}, 0))`,
    })
    .from(setLogs)
    .where(eq(setLogs.userId, USER_ID))
    .groupBy(setLogs.workoutDate);

  return Object.fromEntries(
    rows.map((row) => [
      String(row.workoutDate),
      { sets: Number(row.sets), volume: Math.round(Number(row.volume ?? 0)) },
    ]),
  );
}

/** Total reps and volume per exercise over a window, for muscle heat. */
export async function getVolumeByExercise(since: string): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = await db
    .select({
      exerciseSlug: setLogs.exerciseSlug,
      sets: sql<number>`count(*)`,
    })
    .from(setLogs)
    .where(and(eq(setLogs.userId, USER_ID), gte(setLogs.workoutDate, since)))
    .groupBy(setLogs.exerciseSlug);

  return Object.fromEntries(rows.map((row) => [row.exerciseSlug, Number(row.sets)]));
}

/* ───────────────────────────── credentials ───────────────────────────── */

export async function listCredentials() {
  const db = await getDb();
  return db.select().from(credentials).where(eq(credentials.userId, USER_ID));
}

export async function hasCredentials() {
  return (await listCredentials()).length > 0;
}
