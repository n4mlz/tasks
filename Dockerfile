FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable

FROM base AS builder
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json vitest.config.ts vitest.workspace.ts ./
COPY apps/web/package.json apps/web/package.json
COPY apps/mcp/package.json apps/mcp/package.json
COPY packages/application/package.json packages/application/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/domain/package.json packages/domain/package.json
COPY packages/infrastructure/package.json packages/infrastructure/package.json

RUN pnpm install --frozen-lockfile \
  --fetch-retries=5 \
  --fetch-retry-factor=2 \
  --fetch-retry-mintimeout=10000 \
  --fetch-retry-maxtimeout=120000 \
  --network-concurrency=1

COPY . .
RUN pnpm --filter web build

FROM base AS runner
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/mcp ./apps/mcp
COPY --from=builder /app/packages ./packages
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml ./

EXPOSE 3000 3100
ENV HOST=0.0.0.0
ENV PORT=3000
CMD ["sh", "-c", "node apps/web/server.js & node --import tsx apps/mcp/src/main.ts --transport=http & wait"]
