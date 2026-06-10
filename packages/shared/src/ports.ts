import type { Job } from './types.js'

export interface StorageService {
  putOriginal(id: string, bytes: Buffer, mime: string): Promise<string>
  putProcessed(id: string, bytes: Buffer): Promise<string>
  getOriginal(ref: string): Promise<Buffer>
  getDownloadUrl(ref: string): Promise<string>
}

export interface JobStore {
  create(originalRef: string): Promise<Job>
  get(id: string): Promise<Job | null>
  markProcessing(id: string): Promise<void>
  markCompleted(id: string, processedRef: string): Promise<void>
  markFailed(id: string, reason: string): Promise<void>
}

export interface JobQueue {
  enqueue(jobId: string): Promise<void>
}
