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

- **Next.js 16** (App Router, React 19) — runs anywhere Docker does
- **Postgres 16** — its own container, on a persistent volume; no managed service, no account
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

## Deploying

The app ships as a Docker image with its own Postgres — no external database
service, nothing to sign up for, and the whole thing moves between machines as
one folder plus one volume.

```bash
cd fitapp
cp .env.docker.example .env
# fill in AUTH_SECRET (openssl rand -base64 32) and ACCESS_CODE
docker compose up -d --build
```

That builds the image, starts Postgres 16 with a persistent volume, waits for it
to be healthy, then starts the app on **http://localhost:3000** (override with
`APP_PORT` in `.env`). Data survives `docker compose down` / `up` — it lives in
the `onyx_db-data` volume, not in the container.

| Command | Does |
| --- | --- |
| `docker compose up -d --build` | build + start, detached |
| `docker compose logs -f app` | tail the app's logs |
| `docker compose down` | stop and remove containers (volume kept) |
| `docker compose down -v` | stop and **delete the database** too |

Run it on a home server, a spare laptop, or a free always-on VM (Oracle Cloud's
Always Free tier is a real one). The image is a multi-stage build on Next.js's
`standalone` output — no dev tooling in the final image, non-root user, container
`HEALTHCHECK`. `Dockerfile`, `docker-compose.yml` and `.dockerignore` are all in
this folder.

> `docker run onyx-app` on its own will start but fail on every request with
> *"DATABASE\_URL is not set"* — the image is only half the system. Use
> `docker compose up`, which brings the database with it, or pass a
> `DATABASE_URL` pointing at a Postgres you already run.

### Deploying with Coolify

[Coolify](https://coolify.io) is a self-hosted PaaS that builds this repo,
runs both containers, and — the part that matters here — puts a real domain
with an automatic Let's Encrypt certificate in front of the app. That is what
makes **passkeys work**, which they can't over a bare LAN IP.

Coolify itself is free and open source, but it runs *on a machine you provide*.
A spare laptop, a mini PC or a Raspberry Pi on your own network costs nothing
and needs no card; a small VPS is a few dollars a month. See the HTTPS section
below for reaching a home box from outside without opening ports.

**1. Push the repo** to GitHub, GitLab or a self-hosted Gitea. Private is fine —
Coolify authenticates as a GitHub App or with a deploy key.

**2. Install Coolify** on the server:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
```

Then open `http://<server-ip>:8000` and create the admin account.

**3. Create the resource.** *+ New* → *Docker Compose* → pick your repository,
then set:

| Field | Value |
| --- | --- |
| Branch | `main` |
| Base Directory | `/` |
| Docker Compose Location | `/docker-compose.coolify.yml` |

That file is in this folder alongside the plain `docker-compose.yml`. It swaps
`ports:` for `expose:` so traffic goes through Coolify's proxy rather than
around it, declares `SERVICE_FQDN_APP_3000` so Coolify knows which service the
domain belongs to, and lets Coolify generate the Postgres password.

**4. Set the environment variables** under *Environment Variables*:

| Key | Value |
| --- | --- |
| `AUTH_SECRET` | output of `openssl rand -base64 32` — changing it later signs out every device |
| `ACCESS_CODE` | your sign-in code |
| `API_TOKEN` | *(optional)* token for the read-only `/api/v1/*` endpoints and the iPhone widget |
| `APP_USER_NAME` | *(optional)* the name shown on the dashboard |
| `NEXT_PUBLIC_TIMEZONE` | *(optional)* defaults to `Asia/Kolkata` |

Leave `DATABASE_URL` and `SERVICE_PASSWORD_POSTGRES` alone — the compose file
wires those up itself.

`NEXT_PUBLIC_TIMEZONE` is inlined into the client bundle at build time, so
changing it needs a rebuild, not just a restart.

**5. Point a domain at the server** (an `A` record to its IP), set it on the
**app** service under *Domains*, and deploy. Coolify issues the certificate on
the first request. Open the site, enter your access code, and accept the
passkey prompt.

> Use one fixed domain and keep it. Passkeys are pinned to the hostname they
> were created on — change the domain and you're back to the access code (and
> then add a fresh passkey).

**Persistence.** The `db-data` volume is namespaced to the resource and
survives redeploys, restarts and image rebuilds. It does *not* survive deleting
the resource, so take a backup from **Settings → Backup & restore** before any
destructive change — that zip restores onto a brand-new Coolify install, and if
the new one answers on the same domain, even your passkeys come back.

### Serving it over HTTPS (needed for passkeys)

A LAN IP like `http://192.168.1.20:3000` works fine for logging in with the
access code, but **passkeys will not work there** — WebAuthn requires a real
hostname over HTTPS (`localhost` is the one exemption). The app detects this and
says so on the sign-in screen instead of failing cryptically.

Coolify (above) handles this for you. If you're running plain
`docker compose` instead, put a hostname with a certificate in front yourself.
Any of these is free:

- **Tailscale** — `tailscale serve` / `tailscale cert` gives every device a
  `*.ts.net` name with a valid certificate, reachable only from your own network.
- **Cloudflare Tunnel** — `cloudflared tunnel` publishes the container on a
  hostname with HTTPS, no port forwarding and no public IP. This is also how you
  reach a Coolify box sitting on your home network from outside.
- **Caddy** in front of the app, with a domain you own — automatic Let's Encrypt.

Whichever you pick, terminate TLS at the proxy and forward `X-Forwarded-Proto`
and `X-Forwarded-Host`; the app reads those to build the WebAuthn origin.

### Alternatively: Vercel

The same code deploys to Vercel unchanged — set the root directory to `fitapp`
and point `DATABASE_URL` at any Postgres you like. You lose the "everything in
one image" property, which is the main reason the Docker path is the default.

| Key | Value |
| --- | --- |
| `AUTH_SECRET` | output of `openssl rand -base64 32` |
| `ACCESS_CODE` | your private code |
| `DATABASE_URL` | any Postgres connection string |
| `API_TOKEN` | *(optional)* random string for the read-only API |
| `APP_USER_NAME` | *(optional)* your name, shown on the dashboard |
| `NEXT_PUBLIC_TIMEZONE` | *(optional)* defaults to `Asia/Kolkata` |

### First sign-in

Open the site → enter the access code → if you're on HTTPS, your device offers
to save a passkey → accept. From then on it's Face ID and nothing else. Add a
passkey on each other device from **Settings → Add a passkey for this device**.

> **Passkeys are pinned to a hostname.** Pick one stable address and stick to
> it; a passkey created on a different host won't verify.

### Add to home screen

On iOS: Share → Add to Home Screen. On Android: menu → Install app. It launches
full-screen like a native app.

---

## Backup & restore

**Settings → Backup & restore** downloads a `.zip` containing `data.json`: a
complete dump of every row the app owns — sets (reps, weight, duration, notes,
timestamps), completed sessions, daily steps/weight/notes, your body profile and
your registered passkeys. Restoring is upsert-only: rows matching on date are
overwritten, nothing is ever deleted, and re-importing the same file twice is a
no-op.

This is the answer to "the server is going away". Export, move the compose stack
wherever, restore. If the new machine answers on the same hostname, even the
passkeys keep working.

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
