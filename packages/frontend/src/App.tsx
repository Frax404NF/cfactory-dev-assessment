import { useCallback, useState } from 'react'
import type { JobStatusResponse } from '@image-processor/shared'
import { UploadZone } from './components/UploadZone'
import { StatusDisplay } from './components/StatusDisplay'
import { ResultDisplay } from './components/ResultDisplay'
import { ErrorDisplay } from './components/ErrorDisplay'
import { useJobPolling } from './hooks/useJobPolling'
import { getDownloadUrl, uploadImage } from './api'

type AppState =
  | { phase: 'idle' }
  | { phase: 'uploading'; file: File }
  | {
      phase: 'polling'
      jobId: string
      status: 'pending' | 'processing'
      fileName: string
      fileSize: number
    }
  | { phase: 'completed'; jobId: string; downloadUrl: string; fileName: string; fileSize: number }
  | { phase: 'failed'; jobId: string; error: string; fileName: string }

export function App() {
  const [state, setState] = useState<AppState>({ phase: 'idle' })

  const pollingJobId = state.phase === 'polling' ? state.jobId : null

  const handlePollUpdate = useCallback((data: JobStatusResponse) => {
    setState((prev) => {
      if (prev.phase !== 'polling') return prev

      if (data.status === 'completed') {
        return {
          phase: 'completed',
          jobId: prev.jobId,
          downloadUrl: getDownloadUrl(prev.jobId),
          fileName: prev.fileName,
          fileSize: prev.fileSize,
        }
      }

      if (data.status === 'failed') {
        return {
          phase: 'failed',
          jobId: prev.jobId,
          error: data.error || 'Processing failed',
          fileName: prev.fileName,
        }
      }

      return {
        ...prev,
        status: data.status as 'pending' | 'processing',
      }
    })
  }, [])

  useJobPolling(pollingJobId, handlePollUpdate)

  const handleUpload = useCallback(async (file: File) => {
    setState({ phase: 'uploading', file })

    try {
      const response = await uploadImage(file)
      setState({
        phase: 'polling',
        jobId: response.job_id,
        status: response.status as 'pending' | 'processing',
        fileName: file.name,
        fileSize: file.size,
      })
    } catch (err) {
      setState({
        phase: 'failed',
        jobId: '',
        error: err instanceof Error ? err.message : 'Upload failed',
        fileName: file.name,
      })
    }
  }, [])

  const handleReset = useCallback(() => {
    setState({ phase: 'idle' })
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-[28rem]">
        <header className="mb-12">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Image Processor
          </h1>
          <p className="mt-2 text-[0.8125rem] text-[var(--color-text-secondary)] leading-relaxed">
            Resize, compress, and convert to WebP
          </p>
        </header>

        <section>
          {state.phase === 'idle' && <UploadZone onUpload={handleUpload} />}

          {state.phase === 'uploading' && (
            <UploadZone onUpload={handleUpload} uploading fileName={state.file.name} />
          )}

          {state.phase === 'polling' && (
            <StatusDisplay
              jobId={state.jobId}
              status={state.status}
              fileName={state.fileName}
              fileSize={state.fileSize}
            />
          )}

          {state.phase === 'completed' && (
            <ResultDisplay
              jobId={state.jobId}
              downloadUrl={state.downloadUrl}
              fileName={state.fileName}
              fileSize={state.fileSize}
              onReset={handleReset}
            />
          )}

          {state.phase === 'failed' && (
            <ErrorDisplay
              jobId={state.jobId}
              error={state.error}
              fileName={state.fileName}
              onReset={handleReset}
            />
          )}
        </section>

        <footer className="mt-16 text-center">
          <p className="text-[0.6875rem] font-mono text-[var(--color-text-secondary)] opacity-50">
            JPG · PNG · WebP · 20 MB max
          </p>
        </footer>
      </div>
    </main>
  )
}
