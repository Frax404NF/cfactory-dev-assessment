FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate
WORKDIR /app

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json .npmrc ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/infra/package.json ./packages/infra/
COPY packages/backend/package.json ./packages/backend/
COPY packages/worker/package.json ./packages/worker/
COPY packages/frontend/package.json ./packages/frontend/
RUN pnpm install --frozen-lockfile
COPY packages/shared ./packages/shared
COPY packages/frontend ./packages/frontend
RUN pnpm exec tsc -b packages/shared
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN pnpm exec vite build packages/frontend

FROM nginx:alpine AS runner
COPY --from=build /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]
