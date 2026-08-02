# iPhone streak widget

Two ways to get the streak onto your home screen. Both use `API_TOKEN`, both are
read-only, and neither can change your data.

Replace `YOUR-APP` and `YOUR-TOKEN` throughout.

---

## Option A — the ready-made image (no data binding)

One URL, one image layer, done. The server renders the whole widget face as a PNG.

```
https://YOUR-APP.vercel.app/api/v1/widget/image?token=YOUR-TOKEN
```

| Query | Values | Default |
| --- | --- | --- |
| `size` | `small` (348×348) · `medium` (728×348) · `large` (728×728) | `small` |
| `theme` | `dark` · `light` | `dark` |

All three carry the ONYX mark and tint themselves with the day's accent colour,
which shifts through the week — orange on Monday, blue on Tuesday, pink on
Saturday.

| Size | Shows |
| --- | --- |
| **small** | flame + streak, the week's tick boxes, today's focus and progress bar |
| **medium** | the above, plus best streak and total sessions, the next exercise up, and the muscles being worked |
| **large** | the above, plus lifetime volume and a four-week training heat grid |

The flame is full colour once you've logged today and dimmed to 28% when the
streak is at risk, so the widget reads at a glance without being read.

**In Widgy:** new widget → add an **Image** layer → source **URL** → paste the
link → set it to fill the canvas. Set the refresh interval as low as Widgy
allows.

This is the least fiddly option and the one to start with.

---

## Option B — build it yourself from the JSON

For a custom layout, point a **Web Request** at:

```
https://YOUR-APP.vercel.app/api/v1/widget?token=YOUR-TOKEN
```

Every value is a **top-level key** and pre-formatted as a display string, so a
text layer can bind straight to it with no maths or string joining.

### Fields

| Key | Example | Notes |
| --- | --- | --- |
| `streak` | `12` | number, for gauges |
| `streakText` | `"12 days"` | pluralised |
| `flame` | `"🔥"` / `"🥶"` | swaps when today isn't logged |
| `loggedToday` | `true` | boolean, for conditional layers |
| `streakStatus` | `"At risk — log a set"` | ready-made status line |
| `bestStreak` / `bestStreakText` | `30` / `"30 days"` | |
| `totalWorkouts` | `146` | sessions logged, all time |
| `dayName` / `dayShort` | `"Monday"` / `"Mon"` | |
| `focus` | `"Chest · Triceps · Serratus"` | today's split |
| `muscles` | `"Triceps · Chest · Front delts"` | top three worked |
| `accent` | `"#ff6b4a"` | today's colour, if your layer accepts hex |
| `percent` / `percentText` | `45` / `"45%"` | session progress |
| `setsText` | `"9/20 sets"` | |
| `progressBar` | `"████░░░░░░"` | 10-cell glyph bar |
| `nextExercise` | `"Dumbbell Bench Press"` | or `"All done"` |
| `complete` | `false` | session finished |
| `weekGlyphs` | `"● ● ○ ◉ · · ·"` | done / today / future |
| `weekLabels` | `"M T W T F S S"` | pair under `weekGlyphs` in a mono font |
| `week[]` | array of 7 | `{date, day, done, isToday, future}` for per-day layers |
| `totalVolumeText` | `"128.4t"` | lifetime tonnage |
| `updatedAt` | ISO timestamp | |

### Suggested small-widget layout

```
🔥  12
    days
● ● ○ ◉ · · ·
Chest · Triceps      9/20
████░░░░░░
```

Bind: `flame` · `streak` · `"days"` · `weekGlyphs` · `focus` · `setsText` · `progressBar`.

Widgy's exact syntax for referencing a web response differs by version — check
its Web Request panel for the tag format it generates. Because every field is a
top-level key, the path is always just the field name, never a nested walk.

---

## Refresh

iOS decides when widgets reload — typically every 15–30 minutes, and it throttles
apps that ask too often. Expect the streak to lag a few minutes behind a set you
just logged; that's the system, not the API. Both endpoints send
`Cache-Control: no-store`, so nothing stale is ever served from a cache.

## A note on the token

The URL contains your `API_TOKEN`, so treat the widget link as a secret. It only
grants **reads** — `POST` with it is rejected — so the worst case if it leaks is
someone seeing your streak. Rotate it any time by changing `API_TOKEN` in Vercel
and updating the widget URL.
