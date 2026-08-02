import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'

import { useCreateBoard } from '../../features/boards/use-boards'
import { ApiError } from '../../lib/api'
import { validateField } from '../../lib/validation'
import { Icon } from '../ui/icon'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'

function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again'
}

export function NewBoardCard({ workspaceId }: { workspaceId: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [visibility, setVisibility] = useState<'private' | 'workspace'>('private')
  const [validationError, setValidationError] = useState<string | null>(null)
  const createBoard = useCreateBoard(workspaceId)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formError = validateField(name, 'Board name', { maxLength: 255 })
    setValidationError(formError)
    if (formError) return
    try {
      await createBoard.mutateAsync({ name: name.trim(), description: '', visibility })
      setName('')
      setIsOpen(false)
    } catch {
      return
    }
  }

  if (!isOpen) {
    return (
      <Button
        className="grid h-full min-h-40 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white/30 text-sm font-semibold text-zinc-500 transition hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 dark:border-white/15 dark:bg-white/[0.03] dark:text-zinc-400 dark:hover:bg-violet-500/10 dark:hover:text-violet-300"
        onClick={() => {
          createBoard.reset()
          setValidationError(null)
          setIsOpen(true)
        }}
        type="button"
        variant="outline"
      >
        <span className="flex items-center gap-2">
          <Icon>
            <path d="M12 5v14m-7-7h14" />
          </Icon>
          Create board
        </span>
      </Button>
    )
  }

  return (
    <form
      className="h-full min-h-40 rounded-2xl border border-violet-400/70 bg-white p-5 dark:bg-zinc-900"
      noValidate
      onSubmit={submit}
    >
      <div className="space-y-2">
        <Label htmlFor="board-name">Board name</Label>
        <Input
          autoFocus
          className="h-10 text-lg font-semibold"
          id="board-name"
          onChange={(event) => {
            setName(event.target.value)
            setValidationError(null)
          }}
          placeholder="Q3 planning"
          value={name}
        />
      </div>
      <div className="mt-3 space-y-2">
        <Label htmlFor="board-visibility">Who can discover it?</Label>
        <Select onValueChange={(value) => setVisibility(value as 'private' | 'workspace')} value={visibility}>
          <SelectTrigger className="w-full min-w-0" id="board-visibility">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="private">Private</SelectItem>
            <SelectItem value="workspace">Workspace</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          {visibility === 'private'
            ? 'Only invited board members can open it.'
            : 'Every workspace member can find and view it.'}
        </p>
      </div>
      {(validationError || createBoard.error) && (
        <p className="mt-3 text-sm text-rose-600" role="alert">
          {validationError ?? getErrorMessage(createBoard.error)}
        </p>
      )}
      <div className="mt-5 flex gap-2">
        <Button disabled={createBoard.isPending} type="submit">
          {createBoard.isPending && <LoaderCircle className="animate-spin" />}
          {createBoard.isPending ? 'Creating…' : 'Create'}
        </Button>
        <Button
          disabled={createBoard.isPending}
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
    </form>
  )
}
