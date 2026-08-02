import {
  bigint,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Single-user app, but the schema stays multi-user so nothing has to be
 * rewritten if a second account is ever added.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** WebAuthn / passkey credentials. */
export const credentials = pgTable("credentials", {
  id: text("id").primaryKey(), // base64url credential ID
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  publicKey: text("public_key").notNull(), // base64url COSE key
  counter: bigint("counter", { mode: "number" }).notNull().default(0),
  transports: text("transports"), // comma separated
  deviceName: text("device_name").notNull().default("Passkey"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

/**
 * One row per logged set. Everything else — streaks, PRs, volume, "last time"
 * — is derived from this table.
 */
export const setLogs = pgTable(
  "set_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Local workout date (YYYY-MM-DD) — not a timestamp, so timezones can't shift a streak. */
    workoutDate: date("workout_date").notNull(),
    dayKey: text("day_key").notNull(),
    exerciseSlug: text("exercise_slug").notNull(),
    setIndex: integer("set_index").notNull(),
    reps: integer("reps"),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    /** For time-based work (holds, stretches). */
    durationSec: integer("duration_sec"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("set_logs_unique_slot").on(
      table.userId,
      table.workoutDate,
      table.exerciseSlug,
      table.setIndex,
    ),
    index("set_logs_user_date").on(table.userId, table.workoutDate),
    index("set_logs_user_exercise").on(table.userId, table.exerciseSlug),
  ],
);

/** Height and the fixed facts needed for BMI / BMR maths. */
export const profiles = pgTable("profiles", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  heightCm: numeric("height_cm", { precision: 5, scale: 1 }),
  birthYear: integer("birth_year"),
  /** "male" | "female" | null — only used for the BMR formula. */
  sex: text("sex"),
  goalWeightKg: numeric("goal_weight_kg", { precision: 5, scale: 1 }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One row per day of body metrics: steps walked and bodyweight. */
export const dailyMetrics = pgTable(
  "daily_metrics",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    metricDate: date("metric_date").notNull(),
    steps: integer("steps"),
    weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
    note: text("note"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.metricDate] })],
);

/** Explicit "I finished today's session" marker, plus optional bodyweight/notes. */
export const workoutDays = pgTable(
  "workout_days",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    workoutDate: date("workout_date").notNull(),
    dayKey: text("day_key").notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    note: text("note"),
  },
  (table) => [primaryKey({ columns: [table.userId, table.workoutDate] })],
);
