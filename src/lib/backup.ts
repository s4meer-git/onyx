import { eq } from "drizzle-orm";
import { getDb, schema } from "./db";
import { USER_ID, USER_NAME, ensureUser } from "./queries";

const { credentials, dailyMetrics, profiles, setLogs, users, workoutDays } = schema;

/**
 * The export format — a complete dump of every row this app owns, with every
 * column, so a restore reproduces the database rather than an approximation of
 * it. Versioned so a future schema change can still read an old backup.
 *
 *   v1 → the first cut; dropped `note` and the created/updated timestamps, and
 *        left passkeys out entirely.
 *   v2 → every column of every table, passkeys included. v1 files still import
 *        fine: the missing fields simply default.
 *
 * Passkeys are included because the RP ID is the *hostname*, not the server —
 * restoring onto a new machine that answers on the same hostname keeps existing
 * passkeys working. Move to a different hostname and they stop verifying, which
 * is exactly what the access code is the fallback for. The stored material is a
 * public key and a counter; nothing here lets anyone authenticate without the
 * physical device.
 */
export const BACKUP_VERSION = 2;

type IsoString = string;

export type Backup = {
  format: "onyx-backup";
  version: number;
  exportedAt: IsoString;
  user: {
    displayName: string;
    createdAt: IsoString | null;
  } | null;
  profile: {
    heightCm: number | null;
    birthYear: number | null;
    sex: "male" | "female" | null;
    goalWeightKg: number | null;
    updatedAt: IsoString | null;
  } | null;
  setLogs: {
    workoutDate: string;
    dayKey: string;
    exerciseSlug: string;
    setIndex: number;
    reps: number | null;
    weightKg: number | null;
    durationSec: number | null;
    note: string | null;
    createdAt: IsoString | null;
    updatedAt: IsoString | null;
  }[];
  workoutDays: {
    workoutDate: string;
    dayKey: string;
    completedAt: IsoString | null;
    note: string | null;
  }[];
  dailyMetrics: {
    date: string;
    steps: number | null;
    weightKg: number | null;
    note: string | null;
    updatedAt: IsoString | null;
  }[];
  passkeys: {
    id: string;
    publicKey: string;
    counter: number;
    transports: string | null;
    deviceName: string;
    createdAt: IsoString | null;
    lastUsedAt: IsoString | null;
  }[];
};

/** Drizzle hands numerics back as strings so precision survives — undo that for JSON. */
const num = (value: unknown): number | null => (value === null || value === undefined ? null : Number(value));

/** Timestamps arrive as Date (or string, over the wire protocol). Normalise to ISO. */
const iso = (value: unknown): IsoString | null => {
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/** Inverse of `iso` — for writing back into a timestamp column. */
const asDate = (value: IsoString | null | undefined): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** Numerics go back into the DB as strings, again to avoid a float round-trip. */
const asNumeric = (value: number | null | undefined): string | null =>
  value === null || value === undefined ? null : String(value);

export async function exportBackup(): Promise<Backup> {
  const db = await getDb();

  const [userRows, profileRows, setLogRows, workoutDayRows, dailyMetricRows, credentialRows] =
    await Promise.all([
      db.select().from(users).where(eq(users.id, USER_ID)).limit(1),
      db.select().from(profiles).where(eq(profiles.userId, USER_ID)).limit(1),
      db.select().from(setLogs).where(eq(setLogs.userId, USER_ID)),
      db.select().from(workoutDays).where(eq(workoutDays.userId, USER_ID)),
      db.select().from(dailyMetrics).where(eq(dailyMetrics.userId, USER_ID)),
      db.select().from(credentials).where(eq(credentials.userId, USER_ID)),
    ]);

  const user = userRows[0];
  const profile = profileRows[0];

  return {
    format: "onyx-backup",
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    user: user ? { displayName: user.displayName, createdAt: iso(user.createdAt) } : null,
    profile: profile
      ? {
          heightCm: num(profile.heightCm),
          birthYear: profile.birthYear,
          sex: (profile.sex as "male" | "female" | null) ?? null,
          goalWeightKg: num(profile.goalWeightKg),
          updatedAt: iso(profile.updatedAt),
        }
      : null,
    setLogs: setLogRows.map((row) => ({
      workoutDate: String(row.workoutDate),
      dayKey: row.dayKey,
      exerciseSlug: row.exerciseSlug,
      setIndex: row.setIndex,
      reps: row.reps,
      weightKg: num(row.weightKg),
      durationSec: row.durationSec,
      note: row.note,
      createdAt: iso(row.createdAt),
      updatedAt: iso(row.updatedAt),
    })),
    workoutDays: workoutDayRows.map((row) => ({
      workoutDate: String(row.workoutDate),
      dayKey: row.dayKey,
      completedAt: iso(row.completedAt),
      note: row.note,
    })),
    dailyMetrics: dailyMetricRows.map((row) => ({
      date: String(row.metricDate),
      steps: row.steps,
      weightKg: num(row.weightKg),
      note: row.note,
      updatedAt: iso(row.updatedAt),
    })),
    passkeys: credentialRows.map((row) => ({
      id: row.id,
      publicKey: row.publicKey,
      counter: Number(row.counter),
      transports: row.transports,
      deviceName: row.deviceName,
      createdAt: iso(row.createdAt),
      lastUsedAt: iso(row.lastUsedAt),
    })),
  };
}

export function validateBackup(value: unknown): Backup {
  if (!value || typeof value !== "object") throw new Error("Not a valid backup file");
  const backup = value as Partial<Backup>;
  if (backup.format !== "onyx-backup") throw new Error("This zip doesn't contain an ONYX backup");
  if (typeof backup.version !== "number" || backup.version > BACKUP_VERSION) {
    throw new Error("This backup was made by a newer version of ONYX — update the app first");
  }
  if (!Array.isArray(backup.setLogs) || !Array.isArray(backup.workoutDays) || !Array.isArray(backup.dailyMetrics)) {
    throw new Error("Backup file is missing expected data");
  }
  // `passkeys` and `user` only exist from v2 onwards.
  return { ...backup, passkeys: backup.passkeys ?? [] } as Backup;
}

export type ImportSummary = {
  setLogs: number;
  workoutDays: number;
  dailyMetrics: number;
  passkeys: number;
  profile: boolean;
};

/**
 * Restores a backup by upserting every row — never deletes. Re-importing the
 * same file twice, or restoring on top of an already-populated database, is
 * always safe: matching rows are overwritten with the backup's values,
 * everything else is left alone.
 */
export async function importBackup(backup: Backup): Promise<ImportSummary> {
  const db = await getDb();
  await ensureUser();

  await db.transaction(async (tx) => {
    if (backup.user) {
      await tx
        .update(users)
        .set({ displayName: backup.user.displayName || USER_NAME })
        .where(eq(users.id, USER_ID));
    }

    if (backup.profile) {
      const p = backup.profile;
      const fields = {
        heightCm: asNumeric(p.heightCm),
        birthYear: p.birthYear,
        sex: p.sex,
        goalWeightKg: asNumeric(p.goalWeightKg),
        updatedAt: asDate(p.updatedAt) ?? new Date(),
      };
      await tx
        .insert(profiles)
        .values({ userId: USER_ID, ...fields })
        .onConflictDoUpdate({ target: profiles.userId, set: fields });
    }

    for (const log of backup.setLogs) {
      const fields = {
        dayKey: log.dayKey,
        reps: log.reps,
        weightKg: asNumeric(log.weightKg),
        durationSec: log.durationSec,
        note: log.note,
        updatedAt: asDate(log.updatedAt) ?? new Date(),
      };
      await tx
        .insert(setLogs)
        .values({
          id: `${USER_ID}:${log.workoutDate}:${log.exerciseSlug}:${log.setIndex}`,
          userId: USER_ID,
          workoutDate: log.workoutDate,
          exerciseSlug: log.exerciseSlug,
          setIndex: log.setIndex,
          createdAt: asDate(log.createdAt) ?? new Date(),
          ...fields,
        })
        .onConflictDoUpdate({
          target: [setLogs.userId, setLogs.workoutDate, setLogs.exerciseSlug, setLogs.setIndex],
          set: fields,
        });
    }

    for (const day of backup.workoutDays) {
      const fields = {
        dayKey: day.dayKey,
        completedAt: asDate(day.completedAt),
        note: day.note,
      };
      await tx
        .insert(workoutDays)
        .values({ userId: USER_ID, workoutDate: day.workoutDate, ...fields })
        .onConflictDoUpdate({ target: [workoutDays.userId, workoutDays.workoutDate], set: fields });
    }

    for (const metric of backup.dailyMetrics) {
      const fields = {
        steps: metric.steps,
        weightKg: asNumeric(metric.weightKg),
        note: metric.note ?? null,
        updatedAt: asDate(metric.updatedAt) ?? new Date(),
      };
      await tx
        .insert(dailyMetrics)
        .values({ userId: USER_ID, metricDate: metric.date, ...fields })
        .onConflictDoUpdate({ target: [dailyMetrics.userId, dailyMetrics.metricDate], set: fields });
    }

    for (const passkey of backup.passkeys) {
      const fields = {
        publicKey: passkey.publicKey,
        counter: passkey.counter,
        transports: passkey.transports,
        deviceName: passkey.deviceName,
        lastUsedAt: asDate(passkey.lastUsedAt),
      };
      await tx
        .insert(credentials)
        .values({
          id: passkey.id,
          userId: USER_ID,
          createdAt: asDate(passkey.createdAt) ?? new Date(),
          ...fields,
        })
        .onConflictDoUpdate({ target: credentials.id, set: fields });
    }
  });

  return {
    setLogs: backup.setLogs.length,
    workoutDays: backup.workoutDays.length,
    dailyMetrics: backup.dailyMetrics.length,
    passkeys: backup.passkeys.length,
    profile: Boolean(backup.profile),
  };
}
