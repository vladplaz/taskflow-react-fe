import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, Plus, X } from 'lucide-react'

import { runCardCreationOnce } from '../../features/tasks/card-creation-lock'
import { useCreateTask } from '../../features/tasks/use-tasks'
import { ApiError } from '../../lib/api'
import { validateField } from '../../lib/validation'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'

function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again'
}

export function NewTaskButton({ listId, workspaceId }: { listId: number; workspaceId: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const isSubmitting = useRef(false)
  const createTask = useCreateTask(workspaceId, listId)

  function close() {
    if (createTask.isPending) return
    setTitle('')
    setValidationError(null)
    setIsOpen(false)
    createTask.reset()
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedTitle = title.trim()
    const formError = validateField(title, 'Card title', { maxLength: 500 })
    setValidationError(formError)
    if (formError) return

    try {
      const created = await runCardCreationOnce(isSubmitting, () =>
        createTask.mutateAsync({
          title: trimmedTitle,
          description: {},
          priority: null,
          assignee_membership_ids: [],
          status_id: null,
          label_ids: [],
        }),
      )
      if (!created) return
      setTitle('')
      setIsOpen(false)
    } catch {
      return
    }
  }

  if (!isOpen) {
    return (
      <Button
        className="mt-3 w-full justify-start text-muted-foreground"
        onClick={() => setIsOpen(true)}
        type="button"
        variant="ghost"
      >
        <Plus />
        Add a card
      </Button>
    )
  }

  return (
    <form
      className="mt-3 rounded-xl border border-white/80 bg-white p-2.5 shadow-lg shadow-violet-950/10 dark:border-white/10 dark:bg-slate-900"
      noValidate
      onSubmit={submit}
    >
      <Textarea
        aria-label="Card title"
        autoFocus
        className="min-h-20 resize-none bg-transparent"
        disabled={createTask.isPending}
        onChange={(event) => {
          setTitle(event.target.value)
          setValidationError(null)
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') close()
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter')
            event.currentTarget.form?.requestSubmit()
        }}
        placeholder="Enter a title for this card…"
        value={title}
      />
      {(validationError || createTask.error) && (
        <p className="mt-2 text-xs text-destructive" role="alert">
          {validationError ?? getErrorMessage(createTask.error)}
        </p>
      )}
      <div className="mt-2.5 flex items-center gap-1.5">
        <Button disabled={createTask.isPending} type="submit">
          {createTask.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
          {createTask.isPending ? 'Adding…' : 'Add card'}
        </Button>
        <Button
          aria-label="Cancel adding card"
          disabled={createTask.isPending}
          onClick={close}
          size="icon"
          title="Cancel"
          type="button"
          variant="ghost"
        >
          <X />
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground">⌘/Ctrl + Enter</span>
      </div>
    </form>
  )
}
