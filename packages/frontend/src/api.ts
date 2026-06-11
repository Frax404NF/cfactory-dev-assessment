import type { CreateJobResponse, JobStatusResponse } from '@image-processor/shared'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export async function uploadImage(file: File): Promise<CreateJobResponse> {
  const form = new FormData()
  form.append('file', file)

  const res = await fetch(`${API_URL}/jobs`, {
    method: 'POST',
    body: form,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Upload failed (${res.status})`)
  }

  return res.json()
}

export async function getJobStatus(jobId: string): Promise<JobStatusResponse> {
  const res = await fetch(`${API_URL}/jobs/${jobId}`)

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `Status check failed (${res.status})`)
  }

  return res.json()
}

export function getDownloadUrl(jobId: string): string {
  return `${API_URL}/jobs/${jobId}/download`
}
