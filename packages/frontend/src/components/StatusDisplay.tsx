interface StatusDisplayProps {
  jobId: string
  status: 'pending' | 'processing'
  fileName: string
  fileSize: number
}

export function StatusDisplay({ jobId, status, fileName, fileSize }: StatusDisplayProps) {
  const statusLabel = status === 'pending' ? 'Queued' : 'Processing'
  const formattedSize = formatBytes(fileSize)

  return (
    <div className="rounded-xl bg-[var(--color-surface)] p-6 space-y-5">
      <div className="flex items-center gap-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--color-accent)] opacity-75 animate-ping" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
        </span>
        <span className="text-sm font-medium text-[var(--color-text)]">{statusLabel}</span>
      </div>

      <dl className="space-y-3 text-[0.8125rem]">
        <div className="flex justify-between items-baseline">
          <dt className="text-[var(--color-text-secondary)]">File</dt>
          <dd className="font-mono text-[var(--color-text)] truncate ml-6 max-w-[65%] text-right">
            {fileName}
          </dd>
        </div>
        <div className="flex justify-between items-baseline">
          <dt className="text-[var(--color-text-secondary)]">Size</dt>
          <dd className="font-mono text-[var(--color-text)]">{formattedSize}</dd>
        </div>
        <div className="flex justify-between items-baseline">
          <dt className="text-[var(--color-text-secondary)]">Job</dt>
          <dd className="font-mono text-[0.6875rem] text-[var(--color-text-secondary)] truncate ml-6 max-w-[65%] text-right">
            {jobId}
          </dd>
        </div>
      </dl>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
