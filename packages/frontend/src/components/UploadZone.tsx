import { useCallback, useRef, useState } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 20 * 1024 * 1024

interface UploadZoneProps {
  onUpload: (file: File) => void
  uploading?: boolean
  fileName?: string
}

export function UploadZone({ onUpload, uploading, fileName }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'Unsupported format. Use JPEG, PNG, or WebP.'
    }
    if (file.size > MAX_SIZE) {
      return 'File exceeds 20 MB limit.'
    }
    return null
  }, [])

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validate(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setError(null)
      onUpload(file)
    },
    [validate, onUpload],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      if (inputRef.current) inputRef.current.value = ''
    },
    [handleFile],
  )

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }, [])

  const handleClick = useCallback(() => {
    if (!uploading) inputRef.current?.click()
  }, [uploading])

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image. Accepts JPEG, PNG, or WebP up to 20 MB."
        aria-disabled={uploading}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        className={[
          'relative flex flex-col items-center justify-center gap-4',
          'min-h-[280px] rounded-xl cursor-pointer',
          'border border-dashed',
          'transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg)]',
          dragOver
            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface)]',
          uploading ? 'pointer-events-none' : '',
        ].join(' ')}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3 px-6 text-center">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse" />
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-[var(--color-accent)] animate-pulse [animation-delay:300ms]" />
            </div>
            <span className="text-sm font-mono text-[var(--color-text-secondary)] truncate max-w-[90%]">
              {fileName}
            </span>
            <span className="text-xs text-[var(--color-text-secondary)]">Uploading</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="p-3 rounded-lg bg-[var(--color-accent)]/10">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[var(--color-accent)]"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-text)]">Drop an image here</p>
              <p className="text-xs text-[var(--color-text-secondary)]">or click to browse</p>
            </div>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {error && (
        <p role="alert" className="mt-4 text-[0.8125rem] text-[var(--color-error)]">
          {error}
        </p>
      )}
    </div>
  )
}
