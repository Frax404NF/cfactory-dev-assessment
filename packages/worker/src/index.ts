import { Worker } from 'bullmq'
import { envSchema } from '@image-processor/shared'
import { createStorageService, createJobStore } from '@image-processor/infra'
import { processImage } from './pipeline.js'

const env = envSchema.parse(process.env)
const storage = createStorageService(env)
const jobStore = createJobStore(env.REDIS_URL)

const redisUrl = new URL(env.REDIS_URL)
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port) || 6379,
  ...(redisUrl.password ? { password: decodeURIComponent(redisUrl.password) } : {}),
}

const worker = new Worker(
  'image-processing',
  async (job) => {
    const { jobId } = job.data as { jobId: string }

    await jobStore.markProcessing(jobId)

    const record = await jobStore.get(jobId)
    if (!record) throw new Error(`Job ${jobId} not found`)

    const original = await storage.getOriginal(record.originalRef)
    const processed = await processImage(original)
    const processedRef = await storage.putProcessed(jobId, processed)

    await jobStore.markCompleted(jobId, processedRef)
  },
  { connection, concurrency: 2, lockDuration: 60000 },
)

worker.on('failed', async (job, err) => {
  if (!job) return
  const { jobId } = job.data as { jobId: string }
  await jobStore.markFailed(jobId, err.message).catch(() => {})
})

worker.on('ready', () => {
  console.log('Worker ready, waiting for jobs...')
})
