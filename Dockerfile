# Inplicit dashboard — Deno Fresh 1.7 + Tailwind.
#
# This Dockerfile produces a self-hosted container. The recommended hosting
# path is still Deno Deploy (zero-ops, edge-cached, Frankfurt region) — keep
# this file as Plan B for environments that require a single-VM setup.
#
# Build:
#   docker build -t inplicit-dashboard:latest .
#
# Run:
#   docker run --rm -p 8000:8000 -e API_URL=https://api.example.com \
#              inplicit-dashboard:latest

FROM denoland/deno:2.0.6 AS builder

WORKDIR /build

# Cache dependencies first (Deno fetches via deno.json).
COPY deno.json ./
COPY deno.lock* ./

# Real source.
COPY . .

# Pre-fetch & generate the Fresh build (manifest + Tailwind output).
ENV API_URL=http://localhost:8080
RUN deno cache main.ts dev.ts \
    && deno run -A dev.ts build

# ─────────────────────────── Runtime ────────────────────────────────────────
FROM denoland/deno:2.0.6 AS runtime

RUN useradd --system --uid 1001 --no-create-home --shell /usr/sbin/nologin inplicit

WORKDIR /app
COPY --from=builder --chown=inplicit:inplicit /build /app

USER inplicit
EXPOSE 8000

# `preview` runs main.ts using the prebuilt assets from `_fresh/`. API_URL
# must be set at runtime (server-side fetch target for SSR).
ENV API_URL=http://localhost:8080
CMD ["task", "preview"]
