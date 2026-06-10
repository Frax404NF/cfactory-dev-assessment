export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Job {
  id: string
  status: JobStatus
  originalRef: string
  processedRef?: string
  errorReason?: string
  createdAt: string
  updatedAt: string
}
