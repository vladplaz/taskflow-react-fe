import { useRef, useState } from 'react'
import { LoaderCircle } from 'lucide-react'

import { ApiError } from '../../lib/api'
import { validateField } from '../../lib/validation'
import { Input } from './input'
import { useToast } from './toast-context'

/**
 * A name that turns into a field when you click it. Commits on Enter and on
 * blur; Escape cancels. A rejected rename keeps the field open with the text.
 */
export function InlineRename({
  className = '',
  disabled = false,
  inputClassName = '',
  maxLength = 255,
  name,
  onEditingChange,
  onRename,
  subject,
}: {
  className?: string
  disabled?: boolean
  inputClassName?: string
  maxLength?: number
  name: string
  /** Lets a draggable container stand down while this field has focus. */
  onEditingChange?: (isEditing: boolean) => void
  onRename: (name: string) => Promise<unknown>
  /** "Board", "List" -- names the field and every message about it. */
  subject: string
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [value, setValue] = useState(name)
  // Escape unmounts the field, and the blur that follows must not save.
  const isCancelling = useRef(false)
  const showToast = useToast()
  const label = `${subject} name`

  function startEditing() {
    // Seeded on open, not synced from the prop: a rename arriving from
    // another window must not overwrite what is being typed here now.
    setValue(name)
    setIsEditing(true)
    onEditingChange?.(true)
  }

  function stopEditing() {
    setIsEditing(false)
    onEditingChange?.(false)
  }

  async function commit() {
    const next = value.trim()
    if (!next || next === name) {
      setValue(name)
      stopEditing()
      return
    }

    const validationError = validateField(next, label, { maxLength })
    if (validationError) {
      showToast({ description: validationError, title: `Check the ${label.toLowerCase()}`, variant: 'error' })
      return
    }

    setIsSaving(true)
    try {
      await onRename(next)
      stopEditing()
      showToast({ description: `Now called “${next}”.`, title: `${subject} renamed`, variant: 'success' })
    } catch (error) {
      showToast({
        description: error instanceof ApiError ? error.message : 'Please try again',
        title: `Could not rename this ${subject.toLowerCase()}`,
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!isEditing) {
    return (
      <button
        className={`block max-w-full truncate text-left transition enabled:cursor-pointer disabled:cursor-default ${className}`}
        disabled={disabled}
        onClick={startEditing}
        title={disabled ? undefined : `Rename ${subject.toLowerCase()}`}
        type="button"
      >
        {name}
      </button>
    )
  }

  return (
    <span className="flex min-w-0 items-center gap-2">
      <Input
        aria-label={label}
        autoFocus
        className={inputClassName}
        disabled={isSaving}
        onBlur={() => {
          if (isCancelling.current) {
            isCancelling.current = false
            return
          }
          void commit()
        }}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void commit()
          }
          if (event.key === 'Escape') {
            isCancelling.current = true
            setValue(name)
            stopEditing()
          }
        }}
        value={value}
      />
      {isSaving && <LoaderCircle aria-hidden className="size-4 shrink-0 animate-spin opacity-70" />}
    </span>
  )
}
