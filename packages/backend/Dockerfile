FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/infra/package.json ./packages/infra/
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY packages/infra ./packages/infra
COPY packages/backend ./packages/backend
RUN npx tsc -b packages/shared packages/infra packages/backend

FROM base AS runner
ENV NODE_ENV=production
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/infra/package.json ./packages/infra/
COPY packages/backend/package.json ./packages/backend/
RUN pnpm install --frozen-lockfile --prod
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/infra/dist ./packages/infra/dist
COPY --from=build /app/packages/backend/dist ./packages/backend/dist
EXPOSE 3000
CMD ["node", "packages/backend/dist/index.js"]
