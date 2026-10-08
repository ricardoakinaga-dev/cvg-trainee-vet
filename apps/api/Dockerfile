# syntax=docker/dockerfile:1.7
# CVG API — immutable artifact (M04). Build context: repository root.
#   docker build -f apps/api/Dockerfile -t cvg-api:<sha> .
# Targets: runtime (default), migrator (drizzle-kit migrate with full toolchain).
ARG NODE_IMAGE=node:22.22.0-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json drizzle.config.ts ./
COPY patches ./patches
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile
# Contracts first: some package tests import ../../contracts/dist directly and
# the root references do not order curriculum after contracts. Then the root
# project references build every package and app in dependency order.
RUN pnpm exec tsc -b packages/contracts && pnpm exec tsc -b
RUN pnpm --filter @cvg/api deploy --legacy --prod /out/api

# Operational image: forward-only migrations (`pnpm db:migrate`) and the
# least-privilege role/grant provisioning (`node scripts/provision-ci-postgres.mjs`,
# needs psql). Never serves traffic.
FROM build AS migrator
ENV NODE_ENV=production
RUN apt-get update \
    && apt-get install --yes --no-install-recommends postgresql-client \
    && rm -rf /var/lib/apt/lists/*
COPY scripts/provision-ci-postgres.mjs ./scripts/provision-ci-postgres.mjs
USER node
# drizzle-kit is invoked directly: the runtime network has no egress, so no
# package manager bootstrap (corepack download) may happen at start.
CMD ["node", "node_modules/drizzle-kit/bin.cjs", "migrate", "--config=drizzle.config.ts"]

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
ENV API_HOST=0.0.0.0
ENV API_PORT=3000
WORKDIR /app
COPY --from=build --chown=node:node /out/api ./
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.API_PORT ?? 3000}/health/live`).then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "dist/main.js"]
