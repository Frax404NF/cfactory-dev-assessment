# Image Processor

Upload an image. Get back an optimized WebP. Processing happens in the background so the server never blocks.

## Setup

```bash
cp .env.example .env
docker compose up --build
```

That's it. Open http://localhost:5173, upload something, wait a second or two, download the result.

Requires Docker and Docker Compose. No other dependencies.

## What's happening under the hood

The API (Hono on port 3000) accepts the upload and immediately returns a job ID. It doesn't process anything itself. Instead, it drops a message on a BullMQ queue backed by Redis.

A separate worker process picks up that message, downloads the original from MinIO (S3-compatible object storage), runs it through Sharp (resize to max 1280px, compress at 80%, convert to WebP), uploads the result back to MinIO, and marks the job complete.

The frontend polls for status using exponential backoff. When the job hits `completed`, it shows a download button pointing to a presigned MinIO URL. The download goes directly from storage to the browser; bytes never pass through the API.

## Why these choices

**Hono, not Express.** TypeScript-native. No `@types` package needed. ~14kb. Built for modern runtimes.

**BullMQ, not database polling.** Stalled-job detection handles worker crashes automatically. Retry with exponential backoff is built in (3 attempts, 1s base). I didn't write a single line of crash-recovery code; BullMQ does it.

**MinIO (S3-compatible), not local filesystem.** Backend and worker run in separate containers with no shared volume. They communicate through the network (Redis for state, MinIO for files). This is the production shape: scale workers horizontally without shared disk. Presigned URLs mean the API never proxies download traffic.

**Single JobStore writer.** Status transitions (pending → processing → completed/failed) are enforced in one place with guards. No component can write an invalid state. If you try to mark a `completed` job as `processing`, it throws.

**Shared infra package.** Storage, job store, and queue implementations live in `packages/infra`. Both backend and worker import from it. One source of truth, no duplication.

## Project structure

```
packages/
  shared/     Types, interfaces, Zod env schema
  infra/      S3 storage, Redis job store, BullMQ queue
  backend/    Hono API (upload, status, download endpoints)
  worker/     BullMQ consumer + Sharp pipeline
  frontend/   React + Vite + Tailwind
```

## Environment variables

All defined in `.env.example` with working defaults for Docker. Key ones:

| Variable             | What                                   | Default                  |
| -------------------- | -------------------------------------- | ------------------------ |
| `REDIS_URL`          | Redis connection                       | `redis://localhost:6379` |
| `S3_ENDPOINT`        | Internal S3 endpoint                   | `http://localhost:9000`  |
| `S3_PUBLIC_ENDPOINT` | Browser-facing S3 (for presigned URLs) | `http://localhost:9000`  |
| `S3_BUCKET`          | Bucket name                            | `image-processor`        |
| `MAX_FILE_SIZE`      | Upload limit in bytes                  | `20971520` (20 MB)       |
| `API_PORT`           | API port                               | `3000`                   |
| `VITE_API_URL`       | Frontend API target                    | `http://localhost:3000`  |

## Crash recovery

If the worker dies mid-process, BullMQ detects the stalled job (lock timeout expires) and re-queues it. Test it yourself:

```bash
docker compose restart worker
```

Upload an image right before restarting. It'll complete after the worker comes back.

## API

```
POST /jobs          Upload (multipart, field: "file") → 202 { job_id, status }
GET  /jobs/:id      Status → 200 { job_id, status, download_url?, error? }
GET  /jobs/:id/download  → 302 redirect to presigned URL (or 409 if not ready)
GET  /health        → 200 { status: "ok" }
```

## Error handling

| Case                               | HTTP                                         |
| ---------------------------------- | -------------------------------------------- |
| Wrong file type                    | 415                                          |
| File too large                     | 413                                          |
| Unknown job                        | 404                                          |
| Download before ready              | 409                                          |
| Worker failure (retries exhausted) | Job status: failed, error reason in response |

## Stack

Node 20, TypeScript (strict), Hono, BullMQ, Redis 7, Sharp, MinIO, React, Vite, Tailwind CSS, pnpm workspaces, Docker Compose.
