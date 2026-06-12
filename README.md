# Image Processor

Upload an image. Get back a smaller, optimized WebP. The UI never blocks — you get a job ID immediately and the result appears when processing is done.

---

## Run with Docker

```bash
docker compose up --build
```

No setup needed. Open **http://localhost:5173**.

| Service       | URL                                             |
| ------------- | ----------------------------------------------- |
| Frontend      | http://localhost:5173                           |
| API           | http://localhost:3000                           |
| MinIO Console | http://localhost:9001 (minioadmin / minioadmin) |

---

## Run locally (without Docker)

Requires: Node 20+, pnpm 9+, Docker (for Redis and MinIO only)

```bash
# 1. Install dependencies
pnpm install

# 2. Start Redis and MinIO
docker compose up redis minio minio-init -d

# 3. Copy env and adjust endpoints for local use
cp .env.example .env
# Edit .env: set REDIS_URL=redis://localhost:6379 and S3_ENDPOINT=http://localhost:9000

# 4. Build shared packages
pnpm --filter @image-processor/shared run build
pnpm --filter @image-processor/infra run build

# 5. Start API, worker, and frontend in separate terminals
pnpm --filter @image-processor/backend dev
pnpm --filter @image-processor/worker dev
pnpm --filter @image-processor/frontend dev
```

---

## How it works

A user uploads a large image. The API acknowledges it immediately with a job ID and returns while processing happens in the background. The frontend polls for status and shows a download link when the result is ready.

```
Browser
  │  POST /jobs (multipart image)
  ▼
Hono API ─── stores original ───────▶ MinIO (object storage)
  │
  ├── creates job record ────────────▶ Redis  { status: "pending" }
  │
  └── enqueues message ─────────────▶ BullMQ queue
                                           │
                                     Worker (separate process)
                                           │
                                     downloads original ◀─── MinIO
                                     resizes to ≤ 1280px
                                     compresses at 80%
                                     converts to WebP
                                     uploads result ─────────▶ MinIO
                                     updates status ─────────▶ Redis { status: "completed" }

Frontend polls GET /jobs/:id (1s → 2s → 4s → ... → 30s, stops on terminal state)
When completed → Download WebP button → presigned URL direct from MinIO to browser
```

The API and worker are **separate processes in separate containers**. The API delegates; the worker executes. They share no memory and no filesystem — only Redis for state and MinIO for files. This is the standard production pattern for CPU-intensive or time-consuming tasks.

---

## Demo flow

1. Open http://localhost:5173
2. Drop or select a JPG, PNG, or WebP up to 20 MB
3. Preview the image and click **Start conversion**
4. Watch the job move through: `Queued → Processing → Done`
5. Click **Download WebP** — the file saves directly from storage to your browser
6. Try uploading a file over 20 MB or a PDF to see validation errors

---

## Architecture

### Components

| Component              | Responsibility                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **API (Hono)**         | Validates uploads, stores originals, creates job records, enqueues work. Returns a job ID immediately — never blocks on processing.                                                        |
| **Worker**             | Picks up jobs from the queue, runs the Sharp pipeline, uploads the result, and marks the job done or failed. Completely separate from the API.                                             |
| **Queue (BullMQ)**     | Connects the API and worker. Handles retries (3 attempts, exponential backoff) and re-queues stalled jobs if a worker crashes.                                                             |
| **JobStore (Redis)**   | Source of truth for job status. Guards transitions so no two components can write conflicting states.                                                                                      |
| **Storage (MinIO/S3)** | Object storage for original and processed files. Workers and API access it over the network — no shared filesystem. Presigned URLs mean downloads go directly from storage to the browser. |
| **Pipeline (Sharp)**   | Resize → compress → WebP. Runs only inside the worker process, never in the API.                                                                                                           |
| **Frontend (React)**   | Upload UI, image preview, status polling with exponential backoff, download button.                                                                                                        |

### Key decisions

**BullMQ over database polling.** The queue gives crash recovery, retries, and stalled-job detection without writing any custom code. If a worker dies mid-job, BullMQ detects the expired lock and re-queues automatically.

**S3-compatible object storage.** Backend and worker run in separate containers with no shared filesystem. Using object storage makes the separation real: workers can scale horizontally because they all read/write through the same network-accessible store.

**Single JobStore writer.** All status transitions go through one component with guard logic. No race condition where two processes write conflicting states. TypeScript strict mode (`"strict": true`) enforces this at compile time across all packages.

---

## Worker behavior

1. Mark job as `processing`
2. Download original from storage
3. Resize to max 1280px on the longest side (no upscaling if already smaller)
4. Compress to 80% quality and convert to WebP
5. Upload result, mark job as `completed` — or `failed` after 3 retries

---

## API

### `POST /jobs`

Upload an image. Accepts `multipart/form-data` with field name `file`. Returns immediately without waiting for processing.

**Success**

```
202 Accepted
{
  "job_id": "<uuid>",
  "status": "pending"
}
```

**Errors**

```
413 Payload Too Large     — file exceeds 20 MB
415 Unsupported Media Type — not a JPG, PNG, or WebP
```

---

### `GET /jobs/:id`

Poll for job status.

**Success**

```
200 OK — pending or processing
{ "job_id": "<uuid>", "status": "processing" }

200 OK — completed
{ "job_id": "<uuid>", "status": "completed", "download_url": "<presigned-url>" }

200 OK — failed
{ "job_id": "<uuid>", "status": "failed", "error": "<reason>" }
```

**Errors**

```
404 Not Found — unknown job ID
```

---

### `GET /jobs/:id/download`

Redirects `302` to a presigned storage URL. Returns `409 Conflict` if the job is not yet complete.

---

### `GET /health`

```
200 OK
{ "status": "ok" }
```

---

## Environment variables

Defaults are embedded in `docker-compose.yml` so Docker works with no configuration. For local dev or production, copy `.env.example` and adjust.

```env
# Redis
REDIS_URL=redis://redis:6379

# S3 / MinIO
S3_ENDPOINT=http://minio:9000       # internal (server → MinIO)
S3_PUBLIC_ENDPOINT=http://localhost:9000  # browser-facing (presigned URLs)
S3_REGION=us-east-1
S3_BUCKET=image-processor
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_FORCE_PATH_STYLE=true            # required for MinIO
S3_PRESIGN_TTL=3600                 # presigned URL expiry in seconds

# API
MAX_FILE_SIZE=20971520
API_PORT=3000

# Frontend (local dev only, not used in Docker)
VITE_API_URL=http://localhost:3000
```

---

## Stack

Node 20 · TypeScript (strict) · Hono · BullMQ · Redis 7 · Sharp · MinIO · React 18 · Vite · Tailwind CSS v4 · pnpm workspaces · Docker Compose
