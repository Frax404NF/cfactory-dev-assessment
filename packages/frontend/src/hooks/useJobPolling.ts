import { useEffect, useRef } from 'react'
import type { JobStatusResponse } from '@image-processor/shared'
import { getJobStatus } from '../api'

const INITIAL_INTERVAL = 1000
const MAX_INTERVAL = 30000

export function useJobPolling(jobId: string | null, onUpdate: (data: JobStatusResponse) => void) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!jobId) return

    let cancelled = false
    let delay = INITIAL_INTERVAL

    function schedule() {
      if (cancelled) return

      const timeout = setTimeout(async () => {
        if (cancelled) return

        try {
          const data = await getJobStatus(jobId!)
          if (cancelled) return

          onUpdateRef.current(data)

          if (data.status === 'completed' || data.status === 'failed') {
            return
          }
        } catch {
          // continue polling on transient errors
        }

        delay = Math.min(delay * 2, MAX_INTERVAL)
        schedule()
      }, delay)

      cleanupRef = () => clearTimeout(timeout)
    }

    let cleanupRef: (() => void) | null = null
    schedule()

    return () => {
      cancelled = true
      cleanupRef?.()
    }
  }, [jobId])
}
