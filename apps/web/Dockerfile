# syntax=docker/dockerfile:1.7
# CVG web (Next.js) — immutable artifact (M04). Build context: repository root.
#   docker build -f apps/web/Dockerfile -t cvg-web:<sha> .
# Uses Next standalone output (enabled only by CVG_NEXT_STANDALONE=true at build).
ARG NODE_IMAGE=node:22.22.0-bookworm-slim

FROM ${NODE_IMAGE} AS base
ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}
ENV CI=true
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
WORKDIR /workspace

FROM base AS build
# Next evaluates `rewrites()` at build time: the internal API origin used by
# the /api/v1 and /health rewrites is baked here and must match the service
# name of the API in the deployment (deploy/compose.yml: http://api:3000).
ARG CVG_API_INTERNAL_URL=http://api:3000
ENV CVG_API_INTERNAL_URL=${CVG_API_INTERNAL_URL}
ENV NEXT_TELEMETRY_DISABLED=1
ENV CVG_NEXT_STANDALONE=true
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json ./
COPY patches ./patches
COPY packages ./packages
COPY apps/web ./apps/web
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --filter "@cvg/web..."
RUN pnpm --filter "@cvg/web..." build

FROM ${NODE_IMAGE} AS runtime
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3100
WORKDIR /app
COPY --from=build --chown=node:node /workspace/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /workspace/apps/web/public ./apps/web/public
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD ["node", "-e", "fetch(`http://127.0.0.1:${process.env.PORT ?? 3100}/`).then((r) => process.exit(r.status < 500 ? 0 : 1)).catch(() => process.exit(1))"]
CMD ["node", "apps/web/server.js"]
