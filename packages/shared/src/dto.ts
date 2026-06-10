import type { JobStatus } from './types.js'

export interface CreateJobResponse {
  job_id: string
  status: JobStatus
}

export interface JobStatusResponse {
  job_id: string
  status: JobStatus
  download_url?: string
  error?: string
}
