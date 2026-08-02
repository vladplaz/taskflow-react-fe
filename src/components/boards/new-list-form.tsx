import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import { useCreateBoardList } from '../../features/boards/use-boards'
import { ApiError } from '../../lib/api'
import { validateField } from '../../lib/validation'
import { Icon } from '../ui/icon'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

export function NewListForm({ boardId, workspaceId }: { boardId: number; workspaceId: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const createList = useCreateBoardList(workspaceId, boardId)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formError = validateField(name, 'List name', { maxLength: 255 })
    setValidationError(formError)
    if (formError) return
    try {
      await createList.mutateAsync(name.trim())
      setName('')
      setIsOpen(false)
    } catch {
      return
    }
  }
  if (!isOpen)
    return (
      <Button
        className="flex h-fit w-72 shrink-0 items-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/10 px-5 py-4 text-left text-sm font-semibold text-white/80 transition hover:bg-white/15"
        onClick={() => {
          createList.reset()
          setValidationError(null)
          setIsOpen(true)
        }}
        type="button"
        variant="outline"
      >
        <Icon>
          <path d="M12 5v14m-7-7h14" />
        </Icon>
        Add another list
      </Button>
    )
  return (
    <form
      className="h-fit w-72 shrink-0 rounded-2xl bg-zinc-100 p-3 shadow-xl dark:bg-zinc-800"
      noValidate
      onSubmit={submit}
    >
      <Input
        autoFocus
        className="h-9 font-semibold"
        onChange={(event) => {
          setName(event.target.value)
          setValidationError(null)
        }}
        placeholder="List name"
        value={name}
      />
      <div className="mt-2 flex gap-2">
        <Button disabled={createList.isPending} type="submit">
          {createList.isPending && <LoaderCircle className="animate-spin" />}
          {createList.isPending ? 'Adding…' : 'Add list'}
        </Button>
        <Button
          disabled={createList.isPending}
          onClick={() => {
            setValidationError(null)
            setIsOpen(false)
          }}
          type="button"
          variant="ghost"
        >
          Cancel
        </Button>
      </div>
      {(validationError || createList.error) && (
        <p className="mt-2 text-sm text-rose-600">
          {validationError ??
            (createList.error instanceof ApiError ? createList.error.message : 'Unable to add the list')}
        </p>
      )}
    </form>
  )
}
