interface PreviewDisplayProps {
  file: File
  previewUrl: string
  uploading: boolean
  onStart: () => void
  onCancel: () => void
}

export function PreviewDisplay({
  file,
  previewUrl,
  uploading,
  onStart,
  onCancel,
}: PreviewDisplayProps) {
  const formattedSize = formatBytes(file.size)

  return (
    <div className="space-y-5">
      <div className="rounded-xl overflow-hidden bg-[var(--color-surface)]">
        <img
          src={previewUrl}
          alt={`Preview of ${file.name}`}
          className="w-full h-48 object-contain bg-[var(--color-bg)]"
        />
        <div className="p-4 space-y-1">
          <p className="text-sm font-mono text-[var(--color-text)] truncate">{file.name}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">
            {file.type.split('/')[1].toUpperCase()} · {formattedSize}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <button
          onClick={onStart}
          disabled={uploading}
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
          {uploading ? 'Uploading...' : 'Start conversion'}
        </button>

        {!uploading && (
          <button
            onClick={onCancel}
            type="button"
            className={[
              'w-full text-[0.8125rem] text-[var(--color-text-secondary)] py-2',
              'transition-colors duration-200 ease-out',
              'hover:text-[var(--color-text)]',
              'focus-visible:outline-none focus-visible:text-[var(--color-text)] focus-visible:underline',
            ].join(' ')}
          >
            Choose different file
          </button>
        )}
      </div>
    </div>
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
