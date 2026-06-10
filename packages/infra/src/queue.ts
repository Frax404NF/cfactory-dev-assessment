import { Queue } from 'bullmq'
import type { JobQueue } from '@image-processor/shared'

export class BullMQJobQueue implements JobQueue {
  constructor(private readonly queue: Queue) {}

  async enqueue(jobId: string): Promise<void> {
    await this.queue.add(jobId, { jobId })
  }
}

export function createJobQueue(redisUrl: string): JobQueue {
  const parsed = new URL(redisUrl)
  const connection = {
    host: parsed.hostname,
    port: Number(parsed.port) || 6379,
    ...(parsed.password ? { password: decodeURIComponent(parsed.password) } : {}),
  }

  const queue = new Queue('image-processing', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200,
    },
  })

  return new BullMQJobQueue(queue)
}
