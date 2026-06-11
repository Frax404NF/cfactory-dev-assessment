import { useCallback, useRef, useState } from 'react'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 20 * 1024 * 1024

interface UploadZoneProps {
  onFileSelect: (file: File) => void
}

export function UploadZone({ onFileSelect }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validate = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return 'This file type isn\u2019t supported. Try a JPEG, PNG, or WebP image.'
    }
    if (file.size > MAX_SIZE) {
      return 'This file is over 20 MB. Try a smaller image.'
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
      onFileSelect(file)
    },
    [validate, onFileSelect],
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

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload image. Accepts JPEG, PNG, or WebP up to 20 MB."
        onClick={() => inputRef.current?.click()}
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
        ].join(' ')}
      >
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
