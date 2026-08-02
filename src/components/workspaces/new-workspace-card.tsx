import { useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, LoaderCircle, Plus } from 'lucide-react'

import { useCreateWorkspace } from '../../features/workspaces/use-workspaces'
import { ApiError } from '../../lib/api'
import { validateField } from '../../lib/validation'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'

function getErrorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : 'Something went wrong. Please try again'
}

export function NewWorkspaceCard() {
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const createWorkspace = useCreateWorkspace()

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formError = validateField(name, 'Workspace name', { maxLength: 255 })
    setValidationError(formError)
    if (formError) return
    try {
      await createWorkspace.mutateAsync({ name: name.trim(), description: description.trim() })
      setName('')
      setDescription('')
      setIsOpen(false)
    } catch {
      return
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) {
          createWorkspace.reset()
          setValidationError(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button className="h-11 shrink-0 rounded-xl px-5 shadow-lg shadow-violet-600/20" size="lg">
          <Plus />
          New workspace
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <span className="mb-3 grid size-11 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
              <Building2 className="size-5" />
            </span>
            <DialogTitle>Create a workspace</DialogTitle>
            <DialogDescription>
              Workspaces organize boards and the people responsible for administering them.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="workspace-name">Workspace name</Label>
              <Input
                autoFocus
                className="h-11"
                id="workspace-name"
                onChange={(event) => {
                  setName(event.target.value)
                  setValidationError(null)
                }}
                placeholder="Product engineering"
                value={name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="workspace-description">Description (optional)</Label>
              <Input
                className="h-11"
                id="workspace-description"
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What does this team own?"
                value={description}
              />
            </div>
          </div>
          {(validationError || createWorkspace.error) && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {validationError ?? getErrorMessage(createWorkspace.error)}
            </p>
          )}
          <DialogFooter className="mt-7">
            <Button
              disabled={createWorkspace.isPending}
              onClick={() => setIsOpen(false)}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={createWorkspace.isPending} type="submit">
              {createWorkspace.isPending ? <LoaderCircle className="animate-spin" /> : <Plus />}
              {createWorkspace.isPending ? 'Creating…' : 'Create workspace'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
