# syntax=docker/dockerfile:1

# ── deps ──────────────────────────────────────────────────────────────────
# Installed once, cached separately from source so a code change never
# re-downloads node_modules.
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── builder ───────────────────────────────────────────────────────────────
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# No DATABASE_URL at build time — the app only touches the DB at request
# time, and `next build` must not require a live database to succeed.
#
# NEXT_PUBLIC_* is the exception: Next inlines it into the client bundle
# during the build, so it cannot be changed later by setting an environment
# variable on the container.
ARG NEXT_PUBLIC_TIMEZONE=Asia/Kolkata
ENV NEXT_PUBLIC_TIMEZONE=$NEXT_PUBLIC_TIMEZONE
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ── runner ────────────────────────────────────────────────────────────────
# `output: "standalone"` in next.config.ts traces the exact server + deps
# needed, so the runtime image carries no dev tooling and no full
# node_modules — a few tens of MB instead of the ~1GB dev tree.
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
