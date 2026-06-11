import { useCallback, useState } from 'react'

interface ResultDisplayProps {
  jobId: string
  downloadUrl: string
  fileName: string
  fileSize: number
  onReset: () => void
}

export function ResultDisplay({
  jobId,
  downloadUrl,
  fileName,
  fileSize,
  onReset,
}: ResultDisplayProps) {
  const formattedSize = formatBytes(fileSize)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    try {
      const res = await fetch(downloadUrl)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = fileName.replace(/\.\w+$/, '.webp')
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      window.open(downloadUrl, '_blank')
    } finally {
      setDownloading(false)
    }
  }, [downloadUrl, fileName])

  return (
    <div className="rounded-xl bg-[var(--color-surface)] p-6 space-y-6">
      <div className="flex items-center gap-3">
        <span className="flex h-2.5 w-2.5 rounded-full bg-[var(--color-success)]" />
        <span className="text-sm font-medium text-[var(--color-success)]">Complete</span>
      </div>

      <dl className="space-y-3 text-[0.8125rem]">
        <div className="flex justify-between items-baseline">
          <dt className="text-[var(--color-text-secondary)]">Original</dt>
          <dd className="font-mono text-[var(--color-text)] truncate ml-6 max-w-[65%] text-right">
            {fileName}
          </dd>
        </div>
        <div className="flex justify-between items-baseline">
          <dt className="text-[var(--color-text-secondary)]">Input size</dt>
          <dd className="font-mono text-[var(--color-text)]">{formattedSize}</dd>
        </div>
        <div className="flex justify-between items-baseline">
          <dt className="text-[var(--color-text-secondary)]">Job</dt>
          <dd className="font-mono text-[0.6875rem] text-[var(--color-text-secondary)] truncate ml-6 max-w-[65%] text-right">
            {jobId}
          </dd>
        </div>
      </dl>

      <div className="pt-2 space-y-3">
        <button
          onClick={handleDownload}
          disabled={downloading}
          type="button"
          className={[
            'inline-flex items-center justify-center w-full',
            'px-5 py-3 rounded-lg font-medium text-sm',
            'bg-[var(--color-accent)] text-[var(--color-bg)]',
            'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
            'hover:brightness-110',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          {downloading ? 'Downloading...' : 'Download WebP'}
        </button>

        <button
          onClick={onReset}
          type="button"
          className={[
            'w-full text-[0.8125rem] text-[var(--color-text-secondary)] py-2',
            'transition-colors duration-200 ease-out',
            'hover:text-[var(--color-text)]',
            'focus-visible:outline-none focus-visible:text-[var(--color-text)] focus-visible:underline',
          ].join(' ')}
        >
          Process another
        </button>
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
