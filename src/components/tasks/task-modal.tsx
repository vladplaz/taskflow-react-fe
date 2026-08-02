import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Flag, LoaderCircle, Tag, UserRound } from 'lucide-react'
import { useBeforeUnload, useBlocker, useNavigate } from 'react-router'

import { useBoardLabels, useBoardMembers, useBoardStatuses } from '../../features/boards/use-boards'
import { extractAttachmentIds } from '../../features/attachments/attachment-doc'
import { useTask, useUpdateTask } from '../../features/tasks/use-tasks'
import type { Task, TaskPriority } from '../../lib/api'
import { validateField } from '../../lib/validation'
import { AttachmentStrip } from '../attachments/attachment-strip'
import { AttachmentViewer } from '../attachments/attachment-viewer'
import { Checkbox } from '../ui/checkbox'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { Input } from '../ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger } from '../ui/select'
import { Skeleton } from '../ui/skeleton'
import { TaskPriorityValue } from './task-priority'
import { TaskActivityTimeline } from './task-activity'
import { RichTextEditor } from './rich-text-editor'
import type { RichTextEditorHandle } from './rich-text-editor'

type TaskModalProps = {
  boardId: number
  canEdit: boolean
  onClose: () => void
  taskId: number
  workspaceId: number
}

export function TaskModal({ boardId, canEdit, onClose, taskId, workspaceId }: TaskModalProps) {
  const taskQuery = useTask(workspaceId, taskId)
  const closeHandler = useRef<() => Promise<void>>(async () => onClose())
  const isClosing = useRef(false)

  async function requestClose() {
    if (isClosing.current) return
    isClosing.current = true
    try {
      await closeHandler.current()
    } finally {
      isClosing.current = false
    }
  }

  return (
    <Dialog onOpenChange={(open) => !open && void requestClose()} open>
      <DialogContent
        aria-describedby={undefined}
        className="h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-2rem)]"
      >
        <DialogTitle className="sr-only">Edit card</DialogTitle>
        <DialogDescription className="sr-only">Edit task details and properties.</DialogDescription>
        {taskQuery.isPending ? (
          <TaskModalSkeleton />
        ) : taskQuery.isError || !taskQuery.data ? (
          <TaskModalError onClose={onClose} />
        ) : (
          <TaskEditor
            key={taskId}
            boardId={boardId}
            canEdit={canEdit}
            onClose={onClose}
            setCloseHandler={(handler) => {
              closeHandler.current = handler
            }}
            task={taskQuery.data}
            workspaceId={workspaceId}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function TaskEditor({
  boardId,
  canEdit,
  onClose,
  setCloseHandler,
  task,
  workspaceId,
}: {
  boardId: number
  canEdit: boolean
  onClose: () => void
  setCloseHandler: (handler: () => Promise<void>) => void
  task: Task
  workspaceId: number
}) {
  const [title, setTitle] = useState(task.title)
  const [description, setDescription] = useState(task.description)
  const [priority, setPriority] = useState<TaskPriority | null>(task.priority)
  const [statusId, setStatusId] = useState<number | null>(task.status_id)
  const [labelIds, setLabelIds] = useState(task.labels.map((label) => label.id))
  const [assigneeIds, setAssigneeIds] = useState(task.assignees.map((assignee) => assignee.membership_id))
  const [editingProperty, setEditingProperty] = useState<'assignees' | 'labels' | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [openAttachmentId, setOpenAttachmentId] = useState<number | null>(null)
  const assigneesPropertyRef = useRef<HTMLDivElement>(null)
  const labelsPropertyRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<RichTextEditorHandle>(null)
  const attachments = task.attachments ?? []
  // From the live editor document, not the saved task, so the "In
  // description" note tracks what is on screen.
  const describedIds = useMemo(() => new Set(extractAttachmentIds(description)), [description])
  const updateTask = useUpdateTask(workspaceId, task.id)
  const navigate = useNavigate()
  const members = useBoardMembers(workspaceId, boardId)
  const statuses = useBoardStatuses(workspaceId, boardId)
  const labels = useBoardLabels(workspaceId, boardId)
  const selectedStatus = statuses.data?.find((status) => status.id === statusId)
  const selectedAssignees = members.data?.filter((member) => assigneeIds.includes(member.id)) ?? []
  const selectedLabels = labels.data?.filter((label) => labelIds.includes(label.id)) ?? []

  useEffect(() => {
    if (!editingProperty) return

    function closeOnClickOutside(event: PointerEvent) {
      const activeProperty = editingProperty === 'assignees' ? assigneesPropertyRef : labelsPropertyRef
      if (!activeProperty.current?.contains(event.target as Node)) setEditingProperty(null)
    }

    document.addEventListener('pointerdown', closeOnClickOutside)
    return () => document.removeEventListener('pointerdown', closeOnClickOutside)
  }, [editingProperty])

  function toggleAssignee(membershipId: number) {
    setAssigneeIds((ids) =>
      ids.includes(membershipId) ? ids.filter((id) => id !== membershipId) : [...ids, membershipId],
    )
  }

  function toggleLabel(labelId: number) {
    setLabelIds((ids) => (ids.includes(labelId) ? ids.filter((id) => id !== labelId) : [...ids, labelId]))
  }

  function toggleProperty(property: 'assignees' | 'labels') {
    setEditingProperty((current) => (current === property ? null : property))
  }

  const payload = useMemo(
    () => ({
      title,
      description,
      priority,
      assignee_membership_ids: assigneeIds,
      status_id: statusId,
      label_ids: labelIds,
    }),
    [assigneeIds, description, labelIds, priority, statusId, title],
  )
  const payloadKey = useMemo(() => JSON.stringify(payload), [payload])
  const [lastPersistedPayloadKey, setLastPersistedPayloadKey] = useState<string | null>(null)
  const lastPersistedPayloadKeyRef = useRef<string | null>(null)
  // Same key order as `payload`: the two are compared as strings, and
  // adopting one has to leave the form looking unchanged.
  const serverPayload = useMemo(
    () => ({
      title: task.title,
      description: task.description,
      priority: task.priority,
      assignee_membership_ids: task.assignees.map((assignee) => assignee.membership_id),
      status_id: task.status_id,
      label_ids: task.labels.map((label) => label.id),
    }),
    [task],
  )
  const serverPayloadKey = useMemo(() => JSON.stringify(serverPayload), [serverPayload])
  const lastSeenServerPayloadKeyRef = useRef(serverPayloadKey)
  const persist = useCallback(async () => {
    await updateTask.mutateAsync(payload)
    lastPersistedPayloadKeyRef.current = payloadKey
    setLastPersistedPayloadKey(payloadKey)
  }, [payload, payloadKey, updateTask])

  const persistIfNeeded = useCallback(async () => {
    if (!canEdit) return true
    const validationError = validateField(title, 'Task title', { maxLength: 500 })
    if (validationError) {
      setSaveError(validationError)
      return false
    }
    if (lastPersistedPayloadKeyRef.current === payloadKey) return true

    setSaveError(null)
    try {
      await persist()
      return true
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Unable to save task changes')
      return false
    }
  }, [canEdit, payloadKey, persist, title])

  useEffect(() => {
    if (!title.trim()) return
    if (lastPersistedPayloadKeyRef.current === null) {
      lastPersistedPayloadKeyRef.current = payloadKey
      setLastPersistedPayloadKey(payloadKey)
      return
    }
    if (lastPersistedPayloadKeyRef.current === payloadKey) return

    const timer = window.setTimeout(() => {
      void persistIfNeeded()
    }, 2000)
    return () => window.clearTimeout(timer)
  }, [payloadKey, persistIfNeeded, title])

  /**
   * Follow the card when it changes somewhere else. The fields below are state
   * seeded from the task, so a refetch alone would update the cache and
   * nothing on screen. Unsaved local edits win over an incoming version.
   */
  useEffect(() => {
    if (lastSeenServerPayloadKeyRef.current === serverPayloadKey) return
    lastSeenServerPayloadKeyRef.current = serverPayloadKey
    if (lastPersistedPayloadKeyRef.current !== payloadKey) return

    setTitle(serverPayload.title)
    setDescription(serverPayload.description)
    setPriority(serverPayload.priority)
    setStatusId(serverPayload.status_id)
    setLabelIds(serverPayload.label_ids)
    setAssigneeIds(serverPayload.assignee_membership_ids)
    lastPersistedPayloadKeyRef.current = serverPayloadKey
    setLastPersistedPayloadKey(serverPayloadKey)
  }, [payloadKey, serverPayload, serverPayloadKey])

  const hasUnsavedChanges = canEdit && Boolean(title.trim()) && lastPersistedPayloadKey !== payloadKey
  const blocker = useBlocker(hasUnsavedChanges)

  useEffect(() => {
    if (blocker.state !== 'blocked') return

    const timer = window.setTimeout(() => {
      void persistIfNeeded().then((saved) => {
        if (saved) blocker.proceed()
        else blocker.reset()
      })
    }, 0)
    return () => window.clearTimeout(timer)
  }, [blocker, persistIfNeeded])

  useBeforeUnload((event) => {
    if (!hasUnsavedChanges) return
    event.preventDefault()
    event.returnValue = ''
  })

  useEffect(() => {
    setCloseHandler(async () => {
      if (await persistIfNeeded()) onClose()
    })
  }, [onClose, persistIfNeeded, setCloseHandler])

  async function manageLabels() {
    if (await persistIfNeeded()) {
      navigate(`/workspaces/${workspaceId}/boards/${boardId}/settings/labels`)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 720px, not Tailwind's `lg`: the properties panel has to move under
          the card before 360px of sidebar crowds the description. */}
      <div className="grid min-h-0 flex-1 min-[720px]:grid-cols-[minmax(0,1fr)_360px]">
        <main className="min-h-0 overflow-y-auto p-6 lg:p-12">
          <div className="max-w-3xl space-y-5">
            <Input
              aria-label="Title"
              className="h-14 border-transparent bg-foreground/[0.01] px-4 !text-[27px] font-semibold leading-tight shadow-none transition-colors placeholder:text-muted-foreground/70 focus-visible:border-transparent focus-visible:bg-foreground/[0.02] focus-visible:ring-0 dark:!bg-white/[0.015] dark:focus-visible:!bg-white/[0.025]"
              id="task-title"
              disabled={!canEdit}
              onChange={(event) => {
                setTitle(event.target.value)
                setSaveError(null)
              }}
              placeholder="What needs to be done?"
              value={title}
            />
            {saveError && (
              <p className="px-4 text-sm text-destructive" role="alert">
                {saveError}
              </p>
            )}
            <RichTextEditor
              attachments={attachments}
              editable={canEdit}
              onChange={setDescription}
              onOpenAttachment={setOpenAttachmentId}
              ref={editorRef}
              taskId={task.id}
              value={description}
              workspaceId={workspaceId}
            />
            <AttachmentStrip
              attachments={attachments}
              canEdit={canEdit}
              describedIds={describedIds}
              onDeleted={(attachmentId) => {
                editorRef.current?.removeAttachment(attachmentId)
                setOpenAttachmentId(null)
              }}
              onOpen={setOpenAttachmentId}
              taskId={task.id}
              workspaceId={workspaceId}
            />
            <TaskActivityTimeline
              boardId={boardId}
              canEdit={canEdit}
              taskId={task.id}
              workspaceId={workspaceId}
            />
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto border-t bg-muted/30 p-6 min-[720px]:border-t-0 min-[720px]:border-l lg:p-8">
          <p className="text-xs font-semibold tracking-wider text-muted-foreground">PROPERTIES</p>
          <div className="mt-5 space-y-2">
            <Select
              disabled={!canEdit}
              onValueChange={(value) => setPriority(value === 'none' ? null : (value as TaskPriority))}
              value={priority ?? 'none'}
            >
              <SelectTrigger className="min-h-16 w-full gap-3 whitespace-normal border-transparent bg-transparent px-3 py-3 shadow-none hover:border-border hover:bg-background/70 focus-visible:border-border focus-visible:bg-background/70 focus-visible:ring-0 dark:!bg-transparent dark:hover:!bg-background/70 dark:focus-visible:!bg-background/70">
                <PropertyValue
                  icon={<Flag className="size-4 text-sky-500" />}
                  label="Priority"
                  value={priority ? <TaskPriorityValue priority={priority} /> : 'Set priority'}
                />
              </SelectTrigger>
              <SelectContent align="start" position="popper" side="bottom">
                <SelectItem value="none">Clear priority</SelectItem>
                {(['low', 'medium', 'high', 'urgent'] as const).map((priorityOption) => (
                  <SelectItem key={priorityOption} value={priorityOption}>
                    <TaskPriorityValue priority={priorityOption} />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              disabled={!canEdit || statuses.isPending}
              onValueChange={(value) => setStatusId(value === 'none' ? null : Number(value))}
              value={statusId === null ? 'none' : String(statusId)}
            >
              <SelectTrigger className="min-h-16 w-full gap-3 whitespace-normal border-transparent bg-transparent px-3 py-3 shadow-none hover:border-border hover:bg-background/70 focus-visible:border-border focus-visible:bg-background/70 focus-visible:ring-0 dark:!bg-transparent dark:hover:!bg-background/70 dark:focus-visible:!bg-background/70">
                <PropertyValue
                  icon={<Flag className="size-4 text-violet-500" />}
                  label="Status"
                  value={selectedStatus?.name ?? 'Set status'}
                />
              </SelectTrigger>
              <SelectContent align="start" position="popper" side="bottom">
                <SelectItem value="none">Clear status</SelectItem>
                {statuses.data?.map((status) => (
                  <SelectItem key={status.id} value={String(status.id)}>
                    {status.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <PropertyRow
              icon={<UserRound className="size-4 text-emerald-500" />}
              isEditing={editingProperty === 'assignees'}
              disabled={!canEdit}
              label="Assignees"
              onClick={() => toggleProperty('assignees')}
              propertyRef={assigneesPropertyRef}
              value={
                selectedAssignees.length
                  ? selectedAssignees.map((member) => member.display_name).join(', ')
                  : 'Set assignees'
              }
            >
              <div className="flex flex-wrap gap-2">
                {members.isPending ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  members.data?.map((member) => (
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition ${assigneeIds.includes(member.id) ? 'border-primary/60 bg-primary/10' : 'border-border hover:bg-muted'}`}
                      key={member.id}
                    >
                      <Checkbox
                        checked={assigneeIds.includes(member.id)}
                        onCheckedChange={() => toggleAssignee(member.id)}
                      />
                      <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                        {member.display_name.slice(0, 1).toUpperCase()}
                      </span>
                      {member.display_name}
                    </label>
                  ))
                )}
              </div>
            </PropertyRow>

            <PropertyRow
              icon={<Tag className="size-4 text-amber-500" />}
              isEditing={editingProperty === 'labels'}
              disabled={!canEdit}
              label="Labels"
              onClick={() => toggleProperty('labels')}
              propertyRef={labelsPropertyRef}
              value={
                selectedLabels.length ? (
                  <span className="flex flex-wrap gap-x-2 gap-y-1">
                    {selectedLabels.map((label) => (
                      <span className="inline-flex items-center gap-1" key={label.id}>
                        <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
                        {label.name}
                      </span>
                    ))}
                  </span>
                ) : (
                  'Set labels'
                )
              }
            >
              <div className="flex flex-wrap gap-2">
                {labels.isPending ? (
                  <Skeleton className="h-9 w-full" />
                ) : (
                  labels.data?.map((label) => (
                    <label
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm transition ${labelIds.includes(label.id) ? 'border-primary/60 bg-primary/10' : 'border-border hover:bg-muted'}`}
                      key={label.id}
                    >
                      <Checkbox
                        checked={labelIds.includes(label.id)}
                        onCheckedChange={() => toggleLabel(label.id)}
                      />
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                      {label.name}
                    </label>
                  ))
                )}
              </div>
              {canEdit && (
                <Button
                  className="mt-3 inline-flex text-xs font-semibold text-violet-600 hover:text-violet-500 dark:text-violet-300"
                  disabled={updateTask.isPending}
                  onClick={() => void manageLabels()}
                  type="button"
                  variant="link"
                >
                  Manage labels
                </Button>
              )}
            </PropertyRow>
          </div>
          {updateTask.isPending && (
            <p aria-live="polite" className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <LoaderCircle className="size-3 animate-spin" /> Saving changes…
            </p>
          )}
        </aside>
      </div>

      <AttachmentViewer
        attachments={attachments}
        onClose={() => setOpenAttachmentId(null)}
        onNavigate={setOpenAttachmentId}
        openId={openAttachmentId}
      />
    </div>
  )
}

function PropertyRow({
  children,
  disabled = false,
  icon,
  isEditing,
  label,
  onClick,
  propertyRef,
  value,
}: {
  children: ReactNode
  disabled?: boolean
  icon: ReactNode
  isEditing: boolean
  label: string
  onClick: () => void
  propertyRef: RefObject<HTMLDivElement | null>
  value: ReactNode
}) {
  return (
    <div
      className={`rounded-xl border transition ${isEditing ? 'border-border bg-background/70' : 'border-transparent hover:border-border hover:bg-background/70'}`}
      ref={propertyRef}
    >
      <button
        className="flex w-full items-center gap-3 px-3 py-3 text-left enabled:cursor-pointer"
        disabled={disabled}
        onClick={onClick}
        type="button"
      >
        <PropertyValue icon={icon} label={label} value={value} />
      </button>
      {isEditing && <div className="border-t px-3 py-3">{children}</div>}
    </div>
  )
}

function PropertyValue({ icon, label, value }: { icon: ReactNode; label: string; value: ReactNode }) {
  const isEmpty = typeof value === 'string' && value.startsWith('Set ')
  return (
    <>
      {icon}
      <span className="min-w-0 flex-1 text-left">
        <span className="block text-xs font-medium text-muted-foreground">{label}</span>
        <span
          className={`mt-0.5 block truncate text-sm ${isEmpty ? 'text-muted-foreground/70' : 'font-medium text-foreground'}`}
        >
          {value}
        </span>
      </span>
    </>
  )
}

function TaskModalSkeleton() {
  return (
    <div className="grid grid-cols-1 min-[720px]:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6 p-6 lg:p-12">
        <div className="space-y-3">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-11 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
      <div className="space-y-3 border-t p-6 min-[720px]:border-t-0 min-[720px]:border-l lg:p-8">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    </div>
  )
}

function TaskModalError({ onClose }: { onClose: () => void }) {
  return (
    <div className="grid h-full place-items-center p-8 text-center">
      <div>
        <p className="text-lg font-semibold">Task unavailable</p>
        <p className="mt-2 text-muted-foreground">
          It may have been deleted or you may no longer have access.
        </p>
        <Button className="mt-5" onClick={onClose} type="button">
          Return to board
        </Button>
      </div>
    </div>
  )
}
