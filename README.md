# Image Processor

Async image processing web app. Upload → background worker (resize/compress/WebP) → download.

## Quick Start

> Requires Docker and Docker Compose.

```bash
cp .env.example .env
docker compose up
```

Frontend: http://localhost:5173 — API: http://localhost:3000

## Stack

- **Hono** (API) + **BullMQ** + **Redis** (queue) + **Sharp** (image processing)
- **React** + **Vite** (frontend)
- **MinIO** (S3-compatible object storage)
- **TypeScript** strict across all packages
- **pnpm** workspaces monorepo

## Environment Variables

See [`.env.example`](./.env.example) for all variables and defaults.
