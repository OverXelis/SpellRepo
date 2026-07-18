# syntax=docker/dockerfile:1

# ---- deps -------------------------------------------------------------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ------------------------------------------------------------
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Guard against an empty public/ dir -- git doesn't track empty directories,
# so if it's ever emptied out again this keeps the later COPY from the
# runner stage from failing.
RUN mkdir -p ./public
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runner (small final image) ----------------------------------------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Where the SQLite file lives inside the container -- mount a volume here.
ENV DATABASE_PATH=/data/spell-atlas.db

RUN mkdir -p /data

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Standalone tracing can miss better-sqlite3's compiled binary -- copy it in
# explicitly to be safe.
COPY --from=builder /app/node_modules/better-sqlite3 ./node_modules/better-sqlite3
COPY --from=builder /app/lib/db/schema.sql ./lib/db/schema.sql

VOLUME ["/data"]
# Deliberately runs as root (rather than a fixed non-root uid) so that
# /data can be freely a Docker-managed named volume *or* a bind mount to any
# NAS shared folder without needing to chown the host path to match a
# specific container uid first -- the single most common source of "can't
# open database file" errors on NAS Docker setups. This app has no other
# reason to need root; it's a tradeoff made specifically for painless
# self-hosting on a private (Tailscale-only) network, not for
# internet-facing deployments.
EXPOSE 3000

CMD ["node", "server.js"]
