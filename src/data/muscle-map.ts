import { EXERCISE_BY_SLUG } from "./exercises";

/**
 * The catalog names muscles the way a coach would ("Biceps (long head)",
 * "Calves (soleus)"). The body-map SVG only has a dozen regions, so this maps
 * one onto the other.
 */
const MUSCLE_REGIONS: Record<string, string[]> = {
  chest: ["chest"],
  "upper chest": ["chest"],
  "upper chest (clavicular pec)": ["chest"],
  "chest (sternal pec)": ["chest"],

  triceps: ["triceps"],
  "triceps (long head)": ["triceps"],

  biceps: ["biceps"],
  "biceps (short head)": ["biceps"],
  "biceps (long head)": ["biceps"],
  brachialis: ["biceps"],
  brachioradialis: ["biceps", "forearms"],

  lats: ["lats"],
  // The serratus has no region of its own; the lat is the nearest thing the
  // figure draws. Don't also light the obliques — that isn't where it sits.
  "serratus anterior": ["lats"],

  traps: ["traps", "traps-middle"],
  "upper traps": ["traps"],
  "mid traps": ["traps-middle"],
  "lower traps": ["traps-middle"],
  rhomboids: ["traps-middle"],
  neck: ["traps"],
  "thoracic spine": ["traps-middle"],

  "front delts": ["front-shoulders"],
  "lateral delts": ["front-shoulders", "rear-shoulders"],
  "rear delts": ["rear-shoulders"],
  deltoids: ["front-shoulders", "rear-shoulders"],
  "rotator cuff": ["rear-shoulders"],
  shoulders: ["front-shoulders", "rear-shoulders"],

  quads: ["quads"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes"],
  "glute medius": ["glutes"],
  adductors: ["quads"],
  hips: ["glutes"],
  // The deep hip flexors aren't drawn on this figure. Mapping them to quads
  // lit the legs on ab days (leg raises name them as a secondary), which read
  // as a leg workout — better to show nothing than the wrong muscle.
  "hip flexors": [],

  calves: ["calves"],
  "calves (gastrocnemius)": ["calves"],
  "calves (soleus)": ["calves"],
  "tibialis anterior": ["calves"],
  "ankle stabilisers": ["calves"],

  "erector spinae": ["lowerback"],
  "lower back": ["lowerback"],

  "rectus abdominis": ["abdominals"],
  "upper rectus abdominis": ["abdominals"],
  "lower rectus abdominis": ["abdominals"],
  core: ["abdominals"],
  obliques: ["obliques"],

  forearms: ["forearms"],
  "forearm flexors": ["forearms"],
  "forearm extensors": ["forearms"],
  grip: ["forearms"],
  wrists: ["forearms"],
};

export function regionsForMuscle(muscle: string): string[] {
  return MUSCLE_REGIONS[muscle.trim().toLowerCase()] ?? [];
}

/**
 * Intensity per body region for a set of exercises, 0–1.
 * Primary muscles count double so a day's real focus stands out.
 */
export function regionIntensity(
  slugs: string[],
  weights: Record<string, number> = {},
): Record<string, number> {
  const scores: Record<string, number> = {};

  for (const slug of slugs) {
    const exercise = EXERCISE_BY_SLUG[slug];
    if (!exercise) continue;
    const weight = weights[slug] ?? 1;

    /*
     * Several catalog names collapse onto one region ("Mid traps" and
     * "Rhomboids" are both traps-middle; every biceps head is biceps). Score
     * each region ONCE per exercise at its best role, otherwise an exercise
     * that happens to name three heads outranks one that names a single
     * muscle and the map lies about where the work actually went.
     */
    const perExercise: Record<string, number> = {};
    const mark = (muscles: string[], value: number) => {
      for (const muscle of muscles) {
        for (const region of regionsForMuscle(muscle)) {
          perExercise[region] = Math.max(perExercise[region] ?? 0, value);
        }
      }
    };

    mark(exercise.secondary ?? [], 1);
    mark(exercise.primary, 2);

    for (const [region, value] of Object.entries(perExercise)) {
      scores[region] = (scores[region] ?? 0) + value * weight;
    }
  }

  const max = Math.max(1, ...Object.values(scores));
  return Object.fromEntries(Object.entries(scores).map(([region, value]) => [region, value / max]));
}

/** Human-readable region names for the legend. */
export const REGION_LABELS: Record<string, string> = {
  chest: "Chest",
  triceps: "Triceps",
  biceps: "Biceps",
  forearms: "Forearms",
  lats: "Lats",
  traps: "Traps",
  "traps-middle": "Mid traps",
  "front-shoulders": "Front delts",
  "rear-shoulders": "Rear delts",
  abdominals: "Abs",
  obliques: "Obliques",
  lowerback: "Lower back",
  glutes: "Glutes",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
};
