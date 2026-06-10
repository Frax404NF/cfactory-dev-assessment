import { randomUUID } from 'node:crypto'
import { Hono } from 'hono'
import type { StorageService, JobStore, JobQueue, Env } from '@image-processor/shared'
import type { CreateJobResponse, JobStatusResponse } from '@image-processor/shared'

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp'])

export function createRoutes(
  storage: StorageService,
  jobStore: JobStore,
  queue: JobQueue,
  env: Env,
): Hono {
  const api = new Hono()

  api.get('/health', (c) => c.json({ status: 'ok' }))

  api.post('/jobs', async (c) => {
    const body = await c.req.parseBody()
    const file = body['file']

    if (!(file instanceof File)) {
      return c.json({ error: 'Missing file field' }, 400)
    }

    if (!ALLOWED_MIMES.has(file.type)) {
      return c.json({ error: 'Unsupported file type' }, 415)
    }

    if (file.size > env.MAX_FILE_SIZE) {
      return c.json({ error: 'File too large' }, 413)
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const storageId = randomUUID()

    let originalRef: string
    try {
      originalRef = await storage.putOriginal(storageId, buffer, file.type)
    } catch {
      return c.json({ error: 'Failed to store file' }, 500)
    }

    let job
    try {
      job = await jobStore.create(originalRef)
    } catch {
      return c.json({ error: 'Failed to create job' }, 500)
    }

    try {
      await queue.enqueue(job.id)
    } catch {
      await jobStore.markFailed(job.id, 'Failed to enqueue job').catch(() => {})
      return c.json({ error: 'Failed to enqueue job' }, 500)
    }

    const response: CreateJobResponse = { job_id: job.id, status: job.status }
    return c.json(response, 202)
  })

  api.get('/jobs/:id', async (c) => {
    const id = c.req.param('id')
    const job = await jobStore.get(id)

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    const response: JobStatusResponse = { job_id: job.id, status: job.status }

    if (job.status === 'completed' && job.processedRef) {
      response.download_url = await storage.getDownloadUrl(job.processedRef)
    }

    if (job.status === 'failed' && job.errorReason) {
      response.error = job.errorReason
    }

    return c.json(response)
  })

  api.get('/jobs/:id/download', async (c) => {
    const id = c.req.param('id')
    const job = await jobStore.get(id)

    if (!job) {
      return c.json({ error: 'Job not found' }, 404)
    }

    if (job.status !== 'completed') {
      return c.json({ error: 'Job is not completed' }, 409)
    }

    const url = await storage.getDownloadUrl(job.processedRef!)
    return c.redirect(url, 302)
  })

  return api
}
