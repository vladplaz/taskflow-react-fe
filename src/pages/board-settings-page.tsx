import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'

import { BoardMembersSettings } from '../components/boards/board-members-settings'
import { AppHeader } from '../components/layout/app-header'
import { NotFoundPage } from './not-found-page'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Skeleton } from '../components/ui/skeleton'
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs'
import {
  useBoardLabels,
  useBoardStatuses,
  useBoards,
  useLabelActions,
  useStatusActions,
} from '../features/boards/use-boards'
import type { BoardLabel, BoardStatus } from '../lib/api'
import { ApiError } from '../lib/api'
import { validateField } from '../lib/validation'

type BoardSettingsSection = 'members' | 'statuses' | 'labels'

export function BoardSettingsPage({ section }: { section: BoardSettingsSection }) {
  const { boardId: boardIdParam, workspaceId: workspaceIdParam } = useParams()
  const navigate = useNavigate()
  const workspaceId = parseId(workspaceIdParam)
  const boardId = parseId(boardIdParam)
  const isValidRoute = workspaceId !== null && boardId !== null
  const boards = useBoards(workspaceId)
  const board = boards.data?.find((item) => item.id === boardId)
  const statuses = useBoardStatuses(workspaceId ?? 0, boardId ?? 0, isValidRoute)
  const labels = useBoardLabels(workspaceId ?? 0, boardId ?? 0, isValidRoute)
  const actions = useStatusActions(workspaceId ?? 0, boardId ?? 0)
  const labelActions = useLabelActions(workspaceId ?? 0, boardId ?? 0)
  const [newName, setNewName] = useState('')
  const [newLabelName, setNewLabelName] = useState('')
  const [newLabelColor, setNewLabelColor] = useState('#7C3AED')
  const [statusValidationError, setStatusValidationError] = useState<string | null>(null)
  const [labelValidationError, setLabelValidationError] = useState<string | null>(null)
  const error =
    actions.create.error ??
    actions.update.error ??
    actions.remove.error ??
    labelActions.create.error ??
    labelActions.update.error ??
    labelActions.remove.error

  async function createStatus(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newName.trim()
    const formError = validateField(newName, 'Status name', { maxLength: 80 })
    setStatusValidationError(formError)
    if (formError) return
    try {
      await actions.create.mutateAsync(name)
      setNewName('')
    } catch {
      return
    }
  }

  if (!isValidRoute) {
    return (
      <NotFoundPage
        description="This board was deleted, archived, or is not shared with your account."
        title="Board not found"
      />
    )
  }
  if (!boards.isPending && (!board || !board.can_admin)) {
    return <Navigate replace to={board ? `/workspaces/${workspaceId}/boards/${boardId}` : '/'} />
  }

  async function createLabel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = newLabelName.trim()
    const formError = validateField(newLabelName, 'Label name', { maxLength: 80 })
    setLabelValidationError(formError)
    if (formError) return
    try {
      await labelActions.create.mutateAsync({ name, color: newLabelColor })
      setNewLabelName('')
    } catch {
      return
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <AppHeader />
      {/* One width for all three sections, or the tab strip jumps on
          every switch. */}
      <div className="mx-auto max-w-5xl px-5 py-10">
        <Link
          className="text-sm font-semibold text-primary hover:underline"
          to={`/workspaces/${workspaceId}/boards/${boardId}`}
        >
          ← Back to board
        </Link>
        <Tabs
          className="mt-6"
          onValueChange={(value) =>
            navigate(`/workspaces/${workspaceId}/boards/${boardId}/settings/${value}`)
          }
          value={section}
        >
          <TabsList
            aria-label="Board settings sections"
            className="w-full justify-start gap-1 overflow-x-auto"
            variant="line"
          >
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="statuses">Statuses</TabsTrigger>
            <TabsTrigger value="labels">Labels</TabsTrigger>
          </TabsList>
        </Tabs>
        {section === 'members' && (
          <BoardMembersSettings board={board} boardId={boardId} workspaceId={workspaceId} />
        )}
        {error && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
            {error instanceof ApiError ? error.message : 'Unable to save board settings'}
          </p>
        )}
        {section === 'statuses' && (
          <Card className="mt-6 rounded-3xl py-6 shadow-xl shadow-violet-950/5 sm:py-9">
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight">Statuses</CardTitle>
              <CardDescription className="mt-2 max-w-xl leading-6">
                Status is optional on every task. Removing a status leaves existing tasks intact and clears
                their status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="mt-7 flex gap-3" noValidate onSubmit={createStatus}>
                <Input
                  className="h-10 min-w-0 flex-1"
                  onChange={(event) => {
                    setNewName(event.target.value)
                    setStatusValidationError(null)
                  }}
                  placeholder="e.g. Blocked"
                  value={newName}
                />
                <Button disabled={actions.create.isPending} type="submit">
                  {actions.create.isPending && <LoaderCircle className="animate-spin" />}
                  {actions.create.isPending ? 'Adding…' : 'Add status'}
                </Button>
              </form>
              {statusValidationError && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {statusValidationError}
                </p>
              )}
              <div className="mt-6 space-y-3">
                {statuses.isPending && <StatusesSkeleton />}
                {statuses.data?.map((status) => (
                  <StatusRow actions={actions} key={status.id} status={status} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
        {section === 'labels' && (
          <Card className="mt-6 rounded-3xl py-6 shadow-xl shadow-violet-950/5 sm:py-9">
            <CardHeader>
              <CardTitle className="text-3xl font-bold tracking-tight">Labels</CardTitle>
              <CardDescription className="mt-2 max-w-xl leading-6">
                Labels can be applied to multiple tasks. Pick a color that is easy to recognize on a board.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="mt-7 flex flex-wrap gap-3" noValidate onSubmit={createLabel}>
                <Input
                  aria-label="Label color"
                  className="h-10 w-12 cursor-pointer p-1"
                  onChange={(event) => setNewLabelColor(event.target.value.toUpperCase())}
                  type="color"
                  value={newLabelColor}
                />
                <Input
                  className="h-10 min-w-40 flex-1"
                  onChange={(event) => {
                    setNewLabelName(event.target.value)
                    setLabelValidationError(null)
                  }}
                  placeholder="e.g. Customer request"
                  value={newLabelName}
                />
                <Button disabled={labelActions.create.isPending} type="submit">
                  {labelActions.create.isPending && <LoaderCircle className="animate-spin" />}
                  {labelActions.create.isPending ? 'Adding…' : 'Add label'}
                </Button>
              </form>
              {labelValidationError && (
                <p className="mt-3 text-sm text-destructive" role="alert">
                  {labelValidationError}
                </p>
              )}
              <div className="mt-6 space-y-3">
                {labels.isPending && <StatusesSkeleton />}
                {labels.data?.map((label) => (
                  <LabelRow actions={labelActions} key={label.id} label={label} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function parseId(value: string | undefined) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function StatusRow({
  actions,
  status,
}: {
  actions: ReturnType<typeof useStatusActions>
  status: BoardStatus
}) {
  const [name, setName] = useState(status.name)
  const changed = name.trim() !== status.name
  // One mutation object serves every row, so `isPending` alone would put a
  // spinner on all of them; `variables` narrows it to the row in flight.
  const isSaving = actions.update.isPending && actions.update.variables?.id === status.id
  const isDeleting = actions.remove.isPending && actions.remove.variables === status.id

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
      <span className="size-2 rounded-full bg-violet-500" />
      <Input
        className="h-8 min-w-40 flex-1 border-transparent bg-transparent font-semibold"
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <Button
        disabled={!changed || !name.trim() || isSaving}
        onClick={() => actions.update.mutate({ id: status.id, name: name.trim() })}
        type="button"
        variant="ghost"
      >
        {isSaving && <LoaderCircle className="animate-spin" />}
        {isSaving ? 'Saving…' : 'Save'}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={isDeleting} type="button" variant="destructive">
            {isDeleting && <LoaderCircle className="animate-spin" />}
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{status.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Tasks using this status will remain, but their status will be cleared. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => actions.remove.mutate(status.id)}
              variant="destructive"
            >
              {isDeleting && <LoaderCircle className="animate-spin" />}
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function StatusesSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
      <Skeleton className="h-14 w-full rounded-2xl" />
    </div>
  )
}

function LabelRow({ actions, label }: { actions: ReturnType<typeof useLabelActions>; label: BoardLabel }) {
  const [name, setName] = useState(label.name)
  const [color, setColor] = useState(label.color)
  const changed = name.trim() !== label.name || color !== label.color
  // See StatusRow.
  const isSaving = actions.update.isPending && actions.update.variables?.id === label.id
  const isDeleting = actions.remove.isPending && actions.remove.variables === label.id

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-muted/40 p-3">
      <Input
        aria-label={`${label.name} color`}
        className="h-8 w-10 cursor-pointer p-1"
        onChange={(event) => setColor(event.target.value.toUpperCase())}
        type="color"
        value={color}
      />
      <Input
        className="h-8 min-w-40 flex-1 border-transparent bg-transparent font-semibold"
        onChange={(event) => setName(event.target.value)}
        value={name}
      />
      <Button
        disabled={!changed || !name.trim() || isSaving}
        onClick={() => actions.update.mutate({ id: label.id, name: name.trim(), color })}
        type="button"
        variant="ghost"
      >
        {isSaving && <LoaderCircle className="animate-spin" />}
        {isSaving ? 'Saving…' : 'Save'}
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button disabled={isDeleting} type="button" variant="destructive">
            {isDeleting && <LoaderCircle className="animate-spin" />}
            {isDeleting ? 'Deleting…' : 'Delete'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{label.name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the label from every task on this board. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={() => actions.remove.mutate(label.id)}
              variant="destructive"
            >
              {isDeleting && <LoaderCircle className="animate-spin" />}
              {isDeleting ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
