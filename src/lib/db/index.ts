import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export { schema };

/**
 * Plain Postgres over the wire, everywhere:
 *   • production → the `db` service in docker-compose (or any Postgres), via DATABASE_URL
 *   • local dev  → `npm run dev` starts an embedded PGlite server and injects
 *                  DATABASE_URL, so development runs the exact same code path.
 */
let dbPromise: ReturnType<typeof connect> | null = null;

const DDL = [
  `CREATE TABLE IF NOT EXISTS users (
     id text PRIMARY KEY,
     display_name text NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS credentials (
     id text PRIMARY KEY,
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     public_key text NOT NULL,
     counter bigint NOT NULL DEFAULT 0,
     transports text,
     device_name text NOT NULL DEFAULT 'Passkey',
     created_at timestamptz NOT NULL DEFAULT now(),
     last_used_at timestamptz
   )`,
  `CREATE TABLE IF NOT EXISTS set_logs (
     id text PRIMARY KEY,
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     workout_date date NOT NULL,
     day_key text NOT NULL,
     exercise_slug text NOT NULL,
     set_index integer NOT NULL,
     reps integer,
     weight_kg numeric(6,2),
     duration_sec integer,
     note text,
     created_at timestamptz NOT NULL DEFAULT now(),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS set_logs_unique_slot
     ON set_logs (user_id, workout_date, exercise_slug, set_index)`,
  `CREATE INDEX IF NOT EXISTS set_logs_user_date ON set_logs (user_id, workout_date)`,
  `CREATE INDEX IF NOT EXISTS set_logs_user_exercise ON set_logs (user_id, exercise_slug)`,
  `CREATE TABLE IF NOT EXISTS profiles (
     user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
     height_cm numeric(5,1),
     birth_year integer,
     sex text,
     goal_weight_kg numeric(5,1),
     updated_at timestamptz NOT NULL DEFAULT now()
   )`,
  `CREATE TABLE IF NOT EXISTS daily_metrics (
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     metric_date date NOT NULL,
     steps integer,
     weight_kg numeric(5,2),
     note text,
     updated_at timestamptz NOT NULL DEFAULT now(),
     PRIMARY KEY (user_id, metric_date)
   )`,
  `CREATE TABLE IF NOT EXISTS workout_days (
     user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     workout_date date NOT NULL,
     day_key text NOT NULL,
     completed_at timestamptz,
     note text,
     PRIMARY KEY (user_id, workout_date)
   )`,
];

async function connect() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Start the app with `docker compose up -d` (which brings its own " +
        "Postgres and wires this up for you) — a bare `docker run onyx-app` has no database to talk to. " +
        "For local development, `npm run dev` starts an embedded Postgres instead.",
    );
  }

  // Serverless-friendly: poolers dislike long-lived idle connections, and
  // prepared statements break through PgBouncer in transaction mode.
  const client = postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 15, prepare: false });
  const db = drizzle(client, { schema });

  // Idempotent, so a brand-new database provisions itself on the first request
  // and there is no separate migration step to remember.
  for (const statement of DDL) {
    await db.execute(sql.raw(statement));
  }

  return db;
}

export function getDb() {
  dbPromise ??= connect().catch((error) => {
    dbPromise = null; // let the next request retry instead of caching a failure
    throw error;
  });
  return dbPromise;
}
