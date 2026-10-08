# syntax=docker/dockerfile:1.7
# CVG worker — immutable artifact (M04). Build context: repository root.
#   docker build -f apps/worker/Dockerfile -t cvg-worker:<sha> .
ARG NODE_IMAGE=node:22.22.0-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace

FROM base AS build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
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
RUN pnpm --filter @cvg/worker deploy --legacy --prod /out/worker

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/worker ./
USER node
CMD ["node", "dist/main.js"]
