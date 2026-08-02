# ONYX

A personal, mobile-first training app built from the video library in this repo.
Day-wise workouts, set/rep/weight logging, PR tracking, streaks, and a technique
video plus written instructions for every exercise.

Everything in the stack has a permanent free tier.

---

## What's in it

| Screen | What it does |
| --- | --- |
| **Today** | Duolingo-style streak card (current, best, this week's dots) + today's workout card with progress, plus lifetime sets/reps/volume |
| **Session** | The live workout. Every exercise, every set: weight + reps with steppers, "last time" ghost values, instant PR detection, auto rest timer, finish button. Steps and bodyweight for the day are logged here too |
| **Schedule** | The full week. Tap any day to see its exercises, targets, rest times and videos |
| **Exercise** | Looping video (front/side angles), an anatomical map of the muscles it works, set-up, step-by-step execution, form & posture checklist, common mistakes, breathing, tempo, and your own history |
| **Progress** | LeetCode-style contribution graph, BMI and body metrics, bodyweight and step charts, a muscle map of the last four weeks, and every personal record |
| **Settings** | Body profile (height, birth year, sex, goal weight), passkeys per device, API reference, sign out |

62 exercises, 151 optimised video clips, 7 training days.

---

## Stack (all free)

- **Next.js 16** (App Router, React 19) — hosted free on **Vercel**
- **Postgres** — free on **Neon** (0.5 GB; this app uses a few MB a year)
- **Drizzle ORM** — schema is created automatically on first request, no migration step
- **SimpleWebAuthn** — passkeys (Face ID / Touch ID / Android biometrics)
- **Tailwind CSS 4**
- Videos are static files served from the app itself — no media host, no bandwidth bill

---

## Setup

```bash
cd fitapp
npm install
cp .env.example .env.local     # then fill in AUTH_SECRET and ACCESS_CODE
npm run dev                    # http://localhost:3000
```

`npm run dev` starts an embedded Postgres (PGlite) on port 5433 and injects
`DATABASE_URL`, so local development needs no database of its own. The app code
talks plain Postgres either way, so dev and production behave identically.

Generate the two required secrets:

```bash
openssl rand -base64 32        # AUTH_SECRET
```

Pick any `ACCESS_CODE` you'll remember — you type it once per device, then create
a passkey and never type it again.

### Rebuilding the media library

The clips in `public/media` are already built. To regenerate them from the raw
footage in the parent folder (requires `ffmpeg`):

```bash
npm run media     # 224 MB of GIF/MP4 → 21 MB of h.264
npm run icons     # regenerate PWA icons
npm run bodymap   # rebuild the muscle SVG data from body_muscle_visulaizer_active.txt
npm run logo      # rebuild public/logo.svg from brand_logo.text (crops + golds it)
```

---

## Deploying free

### 1. Database — Neon

1. Sign up at [neon.tech](https://neon.tech) (free tier, no card).
2. Create a project, copy the **pooled** connection string
   (`postgres://…-pooler.…neon.tech/neondb?sslmode=require`).

Tables are created automatically on the first request — nothing else to run.

### 2. App — Vercel

1. Push this folder to GitHub.
2. Import the repo at [vercel.com/new](https://vercel.com/new), set the root
   directory to `fitapp`.
3. Add environment variables:

   | Key | Value |
   | --- | --- |
   | `AUTH_SECRET` | output of `openssl rand -base64 32` |
   | `ACCESS_CODE` | your private code |
   | `DATABASE_URL` | the Neon pooled connection string |
   | `API_TOKEN` | *(optional)* random string for the read-only API |
   | `APP_USER_NAME` | *(optional)* your name, shown on the dashboard |
   | `NEXT_PUBLIC_TIMEZONE` | *(optional)* defaults to `Asia/Kolkata` |

4. Deploy.

### 3. First sign-in

Open the site on your phone → enter the access code → your phone offers to save
a passkey → accept. From then on, opening the app is Face ID and nothing else.

Add a passkey on each other device from **Settings → Add a passkey for this
device**.

> **Passkeys are tied to a domain.** Use one fixed domain (your `*.vercel.app`
> URL or a custom one). A passkey created on a preview URL won't work on
> production.

### 4. Add to home screen

On iOS: Share → Add to Home Screen. On Android: menu → Install app. It launches
full-screen like a native app.

---

## API

Read-only JSON for widgets, shortcuts or dashboards. Authenticate with the app
session cookie, or with `API_TOKEN` via `Authorization: Bearer <token>`,
`x-api-key: <token>`, or `?token=<token>`. CORS is open on these routes.

| Endpoint | Returns |
| --- | --- |
| `GET /api/v1/streak` | current streak, best streak, logged-today flag, last 7 and 30 days |
| `GET /api/v1/today` | today's day plan, per-exercise logged sets, progress %, streak |
| `GET /api/v1/stats` | lifetime totals and every personal record |
| `GET /api/v1/schedule` | the full weekly programme |
| `GET /api/v1/history?exercise=<slug>` | per-session progression for one exercise |
| `GET /api/v1/body` | height/weight profile, BMI, calorie burn, weight trend, step summary |
| `GET /api/v1/widget` | flat, pre-formatted payload for home-screen widgets |
| `GET /api/v1/widget/image` | the streak widget rendered as a PNG (`?size=small\|medium\|large`, `?theme=dark\|light`) |

`/api/v1/today` also accepts `?date=YYYY-MM-DD`.

For the iPhone home-screen widget, see **[WIDGET.md](WIDGET.md)**.

```bash
curl -H "Authorization: Bearer $API_TOKEN" https://your-app.vercel.app/api/v1/streak
```

Writing (session cookie only): `POST /api/sets`, `DELETE /api/sets`, `POST /api/day`,
`POST /api/metrics` (steps + weight), `POST /api/profile`.

---

## How things work

**Streaks** — a day counts once any set is logged on it. The streak survives
until the end of the following day (log yesterday, still safe today), matching
how Duolingo behaves.

**Personal records** — derived from the set log, never stored separately. Best
weight, best reps and best estimated 1RM (Epley: `w × (1 + reps/30)`). The app
detects a new record the instant you tick the set — a heavier estimated 1RM on
weighted lifts, or simply more reps on bodyweight work.

**Daily bodyweight count** — push-ups, squats and lunges are tracked as a
running total for the day rather than as sets, with a target of 100 (50 for
diamond push-ups). Tap +1/+5/+10 through the session; the bar shows a notch at
your previous best, and passing it fires a record.

**Dates** — workouts are stored as plain `YYYY-MM-DD` in your timezone, so a
late-night session can never land on the wrong day or break a streak.

**Data model** — one row per set in `set_logs` is the single source of truth.
Streaks, PRs, volume and "last time" values are all queries over that table.
`daily_metrics` holds one row per day of steps and bodyweight; `profiles` holds
the fixed inputs (height, birth year, sex) the BMI and calorie maths need.

**Body maths** — BMI and the healthy-weight range come from height + latest
weigh-in; resting burn is Mifflin–St Jeor, and daily burn scales it by an
activity factor derived from your average step count. The weight trend is a
least-squares slope over the last 28 weigh-ins, expressed as kg/week. Strength
is also shown relative to bodyweight (est. 1RM ÷ weight), which keeps improving
honestly when your weight is moving.

**Chart colors** are not hand-picked — the palette in `globals.css` was validated
against the card surface for colour-blind separation and contrast. Re-run the
validator if you change them.

---

## Layout

```
src/
  app/
    (app)/            authenticated screens (dashboard, session, schedule, day, exercise, progress, settings)
    api/              auth, set logging, and the read-only v1 API
    login/            passkey + access-code sign-in
  components/         streak card, session logger, clip player, rest timer, nav, body map
    charts/           contribution graph, steps, bodyweight
  data/
    exercises.ts      62 exercises: instructions, form cues, mistakes, clips
    schedule.ts       the weekly split, sets, reps, rest, daily counts
    bodymap.ts        generated muscle SVG paths (front + back)
    muscle-map.ts     catalog muscle names → body-map regions
  lib/                db, queries, auth, dates
public/media/         151 optimised clips + posters
scripts/              media transcoder and icon generator
```

---

## Credits

The streak flame is Microsoft's [Fluent Emoji](https://github.com/microsoft/fluentui-emoji)
(MIT licensed), vendored as `public/fire.png`. The anatomical figures come from
the body-map SVG in the repo root, and the ONYX mark from `brand_logo.text`.

---

`.data/` holds the local development database. Delete it any time to start fresh.
