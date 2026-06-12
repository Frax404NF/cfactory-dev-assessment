import RedisMock from 'ioredis-mock'
import { beforeEach, describe, expect, it } from 'vitest'
import { RedisJobStore } from '../src/job-store.js'

describe('RedisJobStore', () => {
  let store: RedisJobStore

  beforeEach(() => {
    store = new RedisJobStore(new RedisMock())
  })

  it('creates a job with status pending', async () => {
    const job = await store.create('originals/test.jpg')
    expect(job.status).toBe('pending')
    expect(job.originalRef).toBe('originals/test.jpg')
    expect(job.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('transitions pending to processing', async () => {
    const job = await store.create('originals/test.jpg')
    await store.markProcessing(job.id)
    const updated = await store.get(job.id)
    expect(updated?.status).toBe('processing')
  })

  it('allows processing to processing re-entry (crash recovery)', async () => {
    const job = await store.create('originals/test.jpg')
    await store.markProcessing(job.id)
    await expect(store.markProcessing(job.id)).resolves.toBeUndefined()
    const updated = await store.get(job.id)
    expect(updated?.status).toBe('processing')
  })

  it('transitions processing to completed', async () => {
    const job = await store.create('originals/test.jpg')
    await store.markProcessing(job.id)
    await store.markCompleted(job.id, 'processed/test.webp')
    const updated = await store.get(job.id)
    expect(updated?.status).toBe('completed')
    expect(updated?.processedRef).toBe('processed/test.webp')
  })

  it('rejects completed to processing transition', async () => {
    const job = await store.create('originals/test.jpg')
    await store.markProcessing(job.id)
    await store.markCompleted(job.id, 'processed/test.webp')
    await expect(store.markProcessing(job.id)).rejects.toThrow()
  })

  it('transitions to failed with an error reason', async () => {
    const job = await store.create('originals/test.jpg')
    await store.markProcessing(job.id)
    await store.markFailed(job.id, 'Sharp error: unsupported format')
    const updated = await store.get(job.id)
    expect(updated?.status).toBe('failed')
    expect(updated?.errorReason).toBe('Sharp error: unsupported format')
  })

  it('returns null for an unknown job ID', async () => {
    const result = await store.get('nonexistent-id')
    expect(result).toBeNull()
  })
})
