FROM node:22.22.0-bookworm-slim AS build

ARG SOURCE_SHA=unknown

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.json tsconfig.base.json drizzle.config.ts ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @cvg/api... build
RUN pnpm --filter @cvg/worker... build

FROM node:22.22.0-bookworm-slim AS runtime

ARG SOURCE_SHA=unknown

ENV NODE_ENV=production \
    CVG_SOURCE_SHA=$SOURCE_SHA
LABEL org.opencontainers.image.revision=$SOURCE_SHA
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/drizzle.config.ts ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps ./apps
COPY --from=build /app/packages ./packages
COPY --from=build /app/scripts ./scripts

USER node

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/health/ready').then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]
