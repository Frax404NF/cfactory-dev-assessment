import { randomUUID } from 'node:crypto'
import { Redis } from 'ioredis'
import type { Job, JobStatus } from '@image-processor/shared'
import type { JobStore } from '@image-processor/shared'

function toJob(data: Record<string, string>): Job {
  return {
    id: data.id,
    status: data.status as JobStatus,
    originalRef: data.originalRef,
    processedRef: data.processedRef || undefined,
    errorReason: data.errorReason || undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

export class RedisJobStore implements JobStore {
  constructor(private readonly redis: Redis) {}

  async create(originalRef: string): Promise<Job> {
    const id = randomUUID()
    const now = new Date().toISOString()

    const job: Record<string, string> = {
      id,
      status: 'pending',
      originalRef,
      processedRef: '',
      errorReason: '',
      createdAt: now,
      updatedAt: now,
    }

    await this.redis.hset(`job:${id}`, job)

    return toJob(job)
  }

  async get(id: string): Promise<Job | null> {
    const data = await this.redis.hgetall(`job:${id}`)
    if (!data || Object.keys(data).length === 0) return null
    return toJob(data)
  }

  async markProcessing(id: string): Promise<void> {
    const job = await this.get(id)
    if (!job) throw new Error(`Job ${id} not found`)
    if (job.status !== 'pending') {
      throw new Error(`Job ${id} cannot transition from ${job.status} to processing`)
    }
    await this.redis.hset(`job:${id}`, {
      status: 'processing',
      updatedAt: new Date().toISOString(),
    })
  }

  async markCompleted(id: string, processedRef: string): Promise<void> {
    const job = await this.get(id)
    if (!job) throw new Error(`Job ${id} not found`)
    if (job.status !== 'processing') {
      throw new Error(`Job ${id} cannot transition from ${job.status} to completed`)
    }
    await this.redis.hset(`job:${id}`, {
      status: 'completed',
      processedRef,
      updatedAt: new Date().toISOString(),
    })
  }

  async markFailed(id: string, reason: string): Promise<void> {
    const job = await this.get(id)
    if (!job) throw new Error(`Job ${id} not found`)
    if (job.status !== 'pending' && job.status !== 'processing') {
      throw new Error(`Job ${id} cannot transition from ${job.status} to failed`)
    }
    await this.redis.hset(`job:${id}`, {
      status: 'failed',
      errorReason: reason,
      updatedAt: new Date().toISOString(),
    })
  }
}

export function createJobStore(redisUrl: string): JobStore {
  const redis = new Redis(redisUrl)
  return new RedisJobStore(redis)
}
