# Image Processor

Async image processing web app. Upload a JPG, PNG, or WebP and get back a resized, compressed WebP. Processing happens in the background so the server never blocks.

## Getting Started

```bash
docker compose up --build
```

Open **http://localhost:5173**. No setup required beyond Docker.

|               | URL                                             |
| ------------- | ----------------------------------------------- |
| App           | http://localhost:5173                           |
| API           | http://localhost:3000                           |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |

## Demo Flow

Here's the full loop in under a minute:

1. Drop or select a JPG, PNG, or WebP image (up to 20 MB)
2. Preview it and click **Start conversion**
3. Watch the status: `Queued → Processing → Done`
4. Click **Download WebP** — file saves directly from storage to your browser
5. Try uploading a PDF or a file over 20 MB to see validation errors in action

## How It Works

A user uploads an image. The API acknowledges it immediately with a job ID and returns while processing happens in the background. This is the key design requirement: the server delegates, the worker executes.

```
Browser
  │  POST /jobs (image)
  ▼
Hono API ─── stores original ───────▶ MinIO
  │
  ├── creates job record ────────────▶ Redis  { status: "pending" }
  │
  └── enqueues task ─────────────────▶ BullMQ
                                           │
                                     Worker (separate process)
                                           │
                                     fetches original ◀─── MinIO
                                     resize to 1280px max
                                     compress at 80%
                                     convert to WebP
                                     uploads result ─────────▶ MinIO
                                     updates status ─────────▶ Redis { status: "completed" }

Frontend polls GET /jobs/:id (1s → 2s → 4s → ... → 30s)
When done → Download WebP → presigned URL direct from MinIO to browser
```

The API and worker run in **separate containers with no shared filesystem**. They communicate only through Redis (state) and MinIO (files). This is the standard production pattern for CPU-intensive work: the API stays fast regardless of processing load, and workers scale independently.

## Architecture

### Components

| Component              | Responsibility                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **API (Hono)**         | Validates uploads, stores originals, creates job records, enqueues work. Returns a job ID immediately and never blocks on processing.      |
| **Worker**             | Picks up jobs from the queue, runs the Sharp pipeline, uploads the result, marks the job done or failed. Completely separate from the API. |
| **Queue (BullMQ)**     | Connects the API and worker. Handles retries (3 attempts, exponential backoff) and re-queues stalled jobs if a worker crashes.             |
| **JobStore (Redis)**   | Source of truth for job status. Guards transitions so status can only move forward: `pending → processing → completed/failed`.             |
| **Storage (MinIO/S3)** | Stores originals and processed results. Presigned URLs let downloads bypass the API entirely.                                              |
| **Pipeline (Sharp)**   | Resize, compress, convert to WebP. Only ever runs inside the worker.                                                                       |
| **Frontend (React)**   | Upload UI, image preview, status polling with exponential backoff, download button.                                                        |

### Key decisions

**BullMQ over database polling.** Crash recovery, retries, and stalled-job detection come built-in. If a worker dies mid-job, BullMQ re-queues it after the lock expires with no custom recovery code needed.

**S3-compatible object storage.** Backend and worker share no filesystem. Both access storage over the network. Swapping MinIO for AWS S3, Supabase, or Cloudflare R2 is an environment variable change — the code is identical.

**Single JobStore writer.** All status transitions go through one component with guard logic. The guard is idempotent for `processing → processing` re-entry, so BullMQ retries succeed after a worker crash.

**TypeScript strict mode** across all five packages (`shared`, `infra`, `backend`, `worker`, `frontend`).

## Worker Behavior

The worker processes each job in sequence:

1. Mark job as `processing`
2. Download the original image from storage
3. Resize to max 1280px on the longest side (no upscaling if already smaller)
4. Compress to 80% quality and convert to WebP
5. Upload the result, then mark `completed`

On any processing error, BullMQ retries up to 3 times with exponential backoff. Only after all retries fail is the job marked `failed`.

## API

### `POST /jobs`

Multipart form data, field name `file`.

**Success**

```
202 Accepted
{ "job_id": "<uuid>", "status": "pending" }
```

**Errors**

```
413 — file exceeds 20 MB
415 — unsupported file type (must be JPG, PNG, or WebP)
```

### `GET /jobs/:id`

**Pending or processing**

```
200 OK
{ "job_id": "<uuid>", "status": "processing" }
```

**Completed**

```
200 OK
{ "job_id": "<uuid>", "status": "completed", "download_url": "<presigned-url>" }
```

**Failed**

```
200 OK
{ "job_id": "<uuid>", "status": "failed", "error": "<reason>" }
```

**Not found**

```
404 Not Found
```

### `GET /jobs/:id/download`

Redirects `302` to a presigned storage URL. Returns `409 Conflict` if the job is not yet complete.

### `GET /health`

```
200 OK  { "status": "ok" }
```

## Local Development

To run services individually:

```bash
# Start Redis and MinIO only
docker compose up redis minio minio-init -d

# Install deps and build shared packages
pnpm install
pnpm --filter @image-processor/shared run build
pnpm --filter @image-processor/infra run build

# Copy env and point to localhost
cp .env.example .env
# Edit .env: REDIS_URL=redis://localhost:6379 and S3_ENDPOINT=http://localhost:9000

# Start each service in a separate terminal
pnpm --filter @image-processor/backend dev
pnpm --filter @image-processor/worker dev
pnpm --filter @image-processor/frontend dev
```

## Environment Variables

All defaults are embedded in `docker-compose.yml`. Docker works without any `.env` file. For local dev or production, copy `.env.example`.

```env
# Redis
REDIS_URL=redis://redis:6379

# S3 / MinIO
S3_ENDPOINT=http://minio:9000             # internal (server to MinIO)
S3_PUBLIC_ENDPOINT=http://localhost:9000  # browser-facing (presigned URLs)
S3_REGION=us-east-1
S3_BUCKET=image-processor
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true
S3_PRESIGN_TTL=3600                       # presigned URL expiry in seconds

# API
MAX_FILE_SIZE=20971520                    # 20 MB in bytes
API_PORT=3000

# Frontend (local dev only, not used in Docker)
VITE_API_URL=http://localhost:3000
```

## Tests

```bash
pnpm test
```

11 tests, all passing.

- **Pipeline** (4 tests) — output is WebP, longest side at most 1280px, aspect ratio preserved, no upscaling on small inputs
- **JobStore** (7 tests) — status transitions including the crash-recovery re-entry fix

## Stack

Node 20 · TypeScript (strict) · Hono · BullMQ · Redis 7 · Sharp · MinIO · React 18 · Vite · Tailwind CSS · pnpm workspaces · Docker Compose
