interface ErrorDisplayProps {
  jobId: string
  error: string
  fileName: string
  onReset: () => void
}

export function ErrorDisplay({ jobId, error, fileName, onReset }: ErrorDisplayProps) {
  return (
    <div className="rounded-xl bg-[var(--color-surface)] p-6 space-y-6">
      <div className="space-y-4">
        <p className="text-[0.8125rem] text-[var(--color-error)] leading-relaxed">{error}</p>

        <dl className="space-y-3 text-[0.8125rem]">
          <div className="flex justify-between items-baseline">
            <dt className="text-[var(--color-text-secondary)]">File</dt>
            <dd className="font-mono text-[var(--color-text)] truncate ml-6 max-w-[65%] text-right">
              {fileName}
            </dd>
          </div>
          {jobId && (
            <div className="flex justify-between items-baseline">
              <dt className="text-[var(--color-text-secondary)]">Job</dt>
              <dd className="font-mono text-[0.6875rem] text-[var(--color-text-secondary)] truncate ml-6 max-w-[65%] text-right">
                {jobId}
              </dd>
            </div>
          )}
        </dl>
      </div>

      <button
        onClick={onReset}
        type="button"
        className={[
          'inline-flex items-center justify-center w-full',
          'px-5 py-3 rounded-lg font-medium text-sm',
          'bg-[var(--color-accent)] text-[var(--color-bg)]',
          'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'hover:brightness-110',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
        ].join(' ')}
      >
        Try again
      </button>
    </div>
  )
}
