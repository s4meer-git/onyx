import { EXERCISE_BY_SLUG } from "./exercises";

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type ScheduledExercise = {
  slug: string;
  sets: number;
  /** Human readable target, e.g. "8–12" or "30s". */
  reps: string;
  rest?: string;
  note?: string;
  /**
   * Bodyweight movements tracked as a running daily total instead of sets —
   * push-ups, squats, lunges. The number is the target to hit across the day,
   * and beating your previous best counts as a personal record.
   */
  count?: number;
};

export type BlockKind = "warmup" | "main" | "finisher";

export type Block = {
  title: string;
  kind: BlockKind;
  note?: string;
  items: ScheduledExercise[];
};

export type Day = {
  key: DayKey;
  name: string;
  short: string;
  focus: string;
  /** Tailwind-friendly hex used for the day's accent colour. */
  accent: string;
  blocks: Block[];
};

const UNIVERSAL_WARMUP: Block = {
  title: "Universal Warm-Up",
  kind: "warmup",
  note: "Same every day. Around 5 minutes — get warm before you load anything.",
  items: [
    { slug: "warmup-neck-rotations", sets: 1, reps: "10" },
    { slug: "warmup-shoulder-rolls", sets: 1, reps: "10 each way" },
    { slug: "warmup-arm-circles", sets: 1, reps: "10 each way" },
    { slug: "warmup-hip-circles", sets: 1, reps: "10 each way" },
    { slug: "warmup-leg-swing-front-back", sets: 1, reps: "10 each leg" },
    { slug: "warmup-leg-swing-side", sets: 1, reps: "10 each leg" },
    { slug: "warmup-standing-toe-touch", sets: 1, reps: "10" },
    { slug: "warmup-cross-toe-touch", sets: 1, reps: "10 each side" },
    { slug: "warmup-lunges", sets: 1, reps: "10 each leg" },
    { slug: "warmup-squats", sets: 1, reps: "15" },
  ],
};

/**
 * The daily bodyweight challenge. These run every day on top of the split:
 * tap the counter through the session until you hit the target, and beating
 * your previous best total logs a personal record.
 */
const DAILY_COUNTS: Block = {
  title: "Daily Bodyweight Count",
  kind: "main",
  note: "Chip away at these across the whole session — the target is the daily total, not one set.",
  items: [
    { slug: "knee-pushup-outward", sets: 1, reps: "100 total", count: 100, note: "Push-ups — chest" },
    {
      slug: "knee-pushup-diamond",
      sets: 1,
      reps: "50 total",
      count: 50,
      note: "Diamond push-ups — triceps, so half the target",
    },
    { slug: "warmup-squats", sets: 1, reps: "100 total", count: 100, note: "Squats" },
    { slug: "warmup-lunges", sets: 1, reps: "100 total", count: 100, note: "Lunges — 50 each leg" },
  ],
};

export const SCHEDULE: Day[] = [
  {
    key: "mon",
    name: "Monday",
    short: "Mon",
    focus: "Chest · Triceps · Serratus",
    accent: "#ff6b4a",
    blocks: [
      UNIVERSAL_WARMUP,
      DAILY_COUNTS,
      {
        title: "Chest",
        kind: "main",
        items: [
          { slug: "db-incline-bench-press", sets: 4, reps: "8–12", rest: "90s", note: "Upper chest" },
          { slug: "db-bench-press", sets: 4, reps: "8–12", rest: "90s", note: "Mid chest" },
          { slug: "db-chest-fly", sets: 3, reps: "12–15", rest: "60s", note: "Stretch & lower fibres" },
        ],
      },
      {
        title: "Triceps",
        kind: "main",
        items: [
          { slug: "db-overhead-triceps-extension", sets: 3, reps: "10–12", rest: "60s", note: "Long head" },
          { slug: "db-skullcrusher", sets: 3, reps: "10–12", rest: "60s", note: "Lateral & medial head" },
          { slug: "db-tricep-kickback", sets: 3, reps: "12–15 each arm", rest: "45s", note: "Peak contraction" },
        ],
      },
      {
        title: "Serratus Anterior",
        kind: "finisher",
        items: [{ slug: "db-pullover", sets: 3, reps: "12–15", rest: "60s" }],
      },
    ],
  },
  {
    key: "tue",
    name: "Tuesday",
    short: "Tue",
    focus: "Back · Biceps",
    accent: "#4a9eff",
    blocks: [
      UNIVERSAL_WARMUP,
      {
        title: "Day-Specific Warm-Up",
        kind: "warmup",
        note: "Open the thoracic spine and wake the pulling muscles up.",
        items: [
          { slug: "thoracic-extension", sets: 1, reps: "8 segments" },
          { slug: "dead-hang", sets: 2, reps: "20–30s" },
        ],
      },
      DAILY_COUNTS,
      {
        title: "Back",
        kind: "main",
        items: [
          { slug: "db-bent-over-row", sets: 4, reps: "8–12", rest: "90s", note: "Entire back" },
          { slug: "db-single-arm-row", sets: 4, reps: "8–12 each side", rest: "90s", note: "Lats" },
          { slug: "db-chest-supported-row", sets: 3, reps: "10–12", rest: "90s", note: "Upper back" },
          { slug: "db-romanian-deadlift", sets: 3, reps: "8–10", rest: "90s", note: "Lower back & hamstrings" },
        ],
      },
      {
        title: "Traps",
        kind: "main",
        note: "One video covers all three — upper, middle and lower traps.",
        items: [
          { slug: "incline-db-shrug", sets: 3, reps: "12–15", rest: "60s", note: "Upper traps" },
          { slug: "incline-rear-delt-row", sets: 3, reps: "12–15", rest: "60s", note: "Mid traps" },
          { slug: "incline-y-raise", sets: 3, reps: "12–15", rest: "60s", note: "Lower traps — go light" },
        ],
      },
      {
        title: "Biceps",
        kind: "finisher",
        items: [
          { slug: "db-curl", sets: 3, reps: "10–12", rest: "60s", note: "Overall" },
          { slug: "db-close-grip-curl", sets: 3, reps: "10–12", rest: "60s", note: "Long head / peak" },
          { slug: "db-wide-curl", sets: 3, reps: "10–12", rest: "60s", note: "Short head" },
          { slug: "db-hammer-curl", sets: 3, reps: "10–12", rest: "60s", note: "Brachialis" },
          { slug: "db-concentration-curl", sets: 3, reps: "10–12 each arm", rest: "45s", note: "Peak" },
        ],
      },
    ],
  },
  {
    key: "wed",
    name: "Wednesday",
    short: "Wed",
    focus: "Legs — Quads · Hams · Glutes",
    accent: "#22c55e",
    blocks: [
      UNIVERSAL_WARMUP,
      {
        title: "Day-Specific Warm-Up",
        kind: "warmup",
        note: "Hips and glutes must be awake before you load the legs.",
        items: [
          { slug: "hip-drops-9090", sets: 1, reps: "10 each side" },
          { slug: "glute-bridge-warmup", sets: 2, reps: "15" },
          { slug: "lateral-lunges", sets: 1, reps: "10 each side" },
        ],
      },
      DAILY_COUNTS,
      {
        title: "Quads",
        kind: "main",
        items: [
          {
            slug: "db-bulgarian-split-squat",
            sets: 4,
            reps: "8–12 each leg",
            rest: "90s",
            note: "The main quad builder",
          },
        ],
      },
      {
        title: "Hamstrings",
        kind: "main",
        items: [
          { slug: "db-romanian-deadlift", sets: 4, reps: "8–10", rest: "90s" },
          { slug: "db-leg-curl", sets: 3, reps: "12–15", rest: "60s" },
          { slug: "db-goblet-good-morning", sets: 3, reps: "10–12", rest: "75s" },
        ],
      },
      {
        title: "Glutes",
        kind: "finisher",
        items: [
          { slug: "db-hip-thrust", sets: 4, reps: "10–12", rest: "75s" },
          { slug: "db-glute-bridge", sets: 3, reps: "15", rest: "60s" },
        ],
      },
    ],
  },
  {
    key: "thu",
    name: "Thursday",
    short: "Thu",
    focus: "Shoulders · Traps · Wings",
    accent: "#a855f7",
    blocks: [
      UNIVERSAL_WARMUP,
      DAILY_COUNTS,
      {
        title: "Shoulders",
        kind: "main",
        note: "Five seated movements covering every head of the delt.",
        items: [
          { slug: "db-seated-shoulder-press", sets: 4, reps: "8–12", rest: "90s", note: "Front + lateral" },
          { slug: "db-seated-lateral-raise", sets: 4, reps: "12–15", rest: "60s", note: "Lateral — width" },
          { slug: "db-standing-lateral-raise", sets: 3, reps: "15–20", rest: "45s", note: "Burnout to failure" },
          { slug: "db-seated-front-raise", sets: 3, reps: "12", rest: "60s", note: "Front delts" },
          { slug: "db-bent-over-rear-delt-fly", sets: 4, reps: "12–15", rest: "60s", note: "Rear delts" },
          { slug: "db-arnold-press", sets: 3, reps: "10–12", rest: "75s", note: "All three heads" },
        ],
      },
      {
        title: "Traps",
        kind: "main",
        items: [
          { slug: "incline-db-shrug", sets: 3, reps: "12–15", rest: "60s", note: "Upper" },
          { slug: "incline-rear-delt-row", sets: 3, reps: "12–15", rest: "60s", note: "Middle" },
          { slug: "incline-y-raise", sets: 3, reps: "12–15", rest: "60s", note: "Lower" },
        ],
      },
      {
        title: "Wings (Lats & Serratus)",
        kind: "finisher",
        items: [
          { slug: "db-pullover", sets: 3, reps: "12–15", rest: "60s" },
          { slug: "db-single-arm-pullover", sets: 3, reps: "10–12 each side", rest: "60s" },
        ],
      },
    ],
  },
  {
    key: "fri",
    name: "Friday",
    short: "Fri",
    focus: "Arms — Biceps · Triceps · Forearms",
    accent: "#f59e0b",
    blocks: [
      UNIVERSAL_WARMUP,
      {
        title: "Wrist & Forearm Prep",
        kind: "warmup",
        note: "Arm day loads the wrists hard — do not skip this.",
        items: [
          { slug: "wrist-rotations", sets: 1, reps: "15 each way" },
          { slug: "wrist-flexor-stretch", sets: 2, reps: "30s each side" },
          { slug: "wrist-extensor-stretch", sets: 2, reps: "30s each side" },
        ],
      },
      DAILY_COUNTS,
      {
        title: "Biceps",
        kind: "main",
        items: [
          { slug: "db-curl", sets: 4, reps: "10–12", rest: "60s", note: "Overall" },
          { slug: "db-close-grip-curl", sets: 3, reps: "10–12", rest: "60s", note: "Long head" },
          { slug: "db-wide-curl", sets: 3, reps: "10–12", rest: "60s", note: "Short head" },
          { slug: "db-hammer-curl", sets: 3, reps: "10–12", rest: "60s", note: "Brachialis" },
          { slug: "db-concentration-curl", sets: 3, reps: "10–12 each arm", rest: "45s", note: "Peak" },
        ],
      },
      {
        title: "Triceps",
        kind: "main",
        items: [
          { slug: "db-single-arm-overhead-extension", sets: 3, reps: "10–12 each arm", rest: "60s", note: "Long head" },
          { slug: "db-skullcrusher", sets: 3, reps: "10–12", rest: "60s", note: "Lateral & medial" },
          { slug: "db-tricep-kickback", sets: 3, reps: "12–15 each arm", rest: "45s", note: "Peak contraction" },
          { slug: "bench-dips", sets: 3, reps: "12–15", rest: "60s", note: "Bodyweight finisher" },
        ],
      },
      {
        title: "Forearms",
        kind: "finisher",
        items: [{ slug: "forearm-circuit", sets: 3, reps: "15–20", rest: "45s", note: "All four wrist movements" }],
      },
    ],
  },
  {
    key: "sat",
    name: "Saturday",
    short: "Sat",
    focus: "Abs & Core",
    accent: "#ec4899",
    blocks: [
      UNIVERSAL_WARMUP,
      DAILY_COUNTS,
      {
        title: "Core Circuit",
        kind: "main",
        note: "Run it as a circuit — minimal rest between exercises, 60s between rounds.",
        items: [
          { slug: "v-up", sets: 3, reps: "10–15", rest: "30s", note: "Entire abs" },
          { slug: "crunch", sets: 3, reps: "15–20", rest: "30s", note: "Upper abs" },
          { slug: "reverse-crunch", sets: 3, reps: "12–15", rest: "30s", note: "Lower abs" },
          { slug: "double-crunch", sets: 3, reps: "12–15", rest: "30s", note: "Upper + lower" },
          { slug: "heel-touch", sets: 3, reps: "20 total", rest: "60s", note: "Obliques" },
        ],
      },
    ],
  },
  {
    key: "sun",
    name: "Sunday",
    short: "Sun",
    focus: "Shoulders · Traps · Calves · Tibia",
    accent: "#06b6d4",
    blocks: [
      UNIVERSAL_WARMUP,
      {
        title: "Day-Specific Warm-Up",
        kind: "warmup",
        items: [{ slug: "calf-raise-warmup", sets: 2, reps: "20" }],
      },
      DAILY_COUNTS,
      {
        title: "Shoulders",
        kind: "main",
        items: [
          { slug: "db-seated-shoulder-press", sets: 4, reps: "8–12", rest: "90s" },
          { slug: "db-seated-lateral-raise", sets: 4, reps: "12–15", rest: "60s" },
          { slug: "db-standing-lateral-raise", sets: 3, reps: "15–20", rest: "45s", note: "Burnout to failure" },
          { slug: "db-seated-front-raise", sets: 3, reps: "12", rest: "60s" },
          { slug: "db-bent-over-rear-delt-fly", sets: 3, reps: "12–15", rest: "60s" },
          { slug: "db-arnold-press", sets: 3, reps: "10–12", rest: "75s" },
        ],
      },
      {
        title: "Traps",
        kind: "main",
        items: [
          { slug: "incline-db-shrug", sets: 3, reps: "12–15", rest: "60s" },
          { slug: "incline-rear-delt-row", sets: 3, reps: "12–15", rest: "60s" },
          { slug: "incline-y-raise", sets: 3, reps: "12–15", rest: "60s" },
        ],
      },
      {
        title: "Calves & Tibia",
        kind: "finisher",
        note: "High reps, full range, pause at both ends.",
        items: [
          { slug: "db-standing-calf-raise", sets: 4, reps: "15–20", rest: "45s", note: "Gastrocnemius" },
          { slug: "db-seated-calf-raise", sets: 3, reps: "20", rest: "45s", note: "Soleus" },
          { slug: "db-single-leg-calf-raise", sets: 3, reps: "12–15 each leg", rest: "45s" },
          { slug: "tibialis-raise", sets: 3, reps: "20–25", rest: "45s", note: "Shins" },
        ],
      },
    ],
  },
];

export const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** JS `Date#getDay()` is 0=Sunday. Map it onto our Monday-first ordering. */
const JS_DAY_TO_KEY: DayKey[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function dayKeyFromDate(date: Date): DayKey {
  return JS_DAY_TO_KEY[date.getDay()];
}

export function getDay(key: string): Day | undefined {
  return SCHEDULE.find((day) => day.key === key);
}

/** Every exercise scheduled for a day, flattened, with block context attached. */
export function dayExercises(day: Day) {
  return day.blocks.flatMap((block) =>
    block.items.map((item) => ({ ...item, block: block.title, kind: block.kind })),
  );
}

/**
 * Exercises that count toward "workout complete". Warm-up drills aren't logged,
 * but counted bodyweight movements (push-ups, squats, lunges) are.
 */
export function loggableExercises(day: Day) {
  return dayExercises(day).filter((item) => item.kind !== "warmup" || item.count);
}

/**
 * The day's actual training focus — the lifting blocks only.
 *
 * Excludes the daily bodyweight counts, which run every day and would
 * otherwise light chest, quads and glutes on the muscle map regardless of
 * what the day is really for.
 */
export function focusExercises(day: Day) {
  return dayExercises(day).filter((item) => item.kind !== "warmup" && !item.count);
}

/** A counted movement is one "slot" of progress, not one set per rep. */
export function totalSets(day: Day) {
  return loggableExercises(day).reduce((sum, item) => sum + (item.count ? 1 : item.sets), 0);
}

/** Muscle groups touched by a day, for summary chips. */
export function dayMuscles(day: Day): string[] {
  const seen = new Set<string>();
  for (const item of loggableExercises(day)) {
    const exercise = EXERCISE_BY_SLUG[item.slug];
    exercise?.primary.forEach((muscle) => seen.add(muscle));
  }
  return [...seen];
}
