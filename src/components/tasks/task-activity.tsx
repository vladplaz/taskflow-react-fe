import { ChevronDown, History, LoaderCircle, Paperclip, Pencil, Play, Send, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ClipboardEvent, DragEvent } from 'react'
import { Link } from 'react-router'

import { useAuthSession } from '../../features/auth/use-auth'
import {
  TASK_ACTIVITY_BATCH,
  useCreateTaskComment,
  useDeleteTaskComment,
  useTaskActivity,
  useUpdateTaskComment,
} from '../../features/tasks/use-tasks'
import { useBoardMembers } from '../../features/boards/use-boards'
import { splitCommentBody } from '../../features/tasks/comment-mentions'
import { filesFromDataTransfer, isVisualMedia } from '../../features/attachments/attachment-kinds'
import { useUploadAttachments } from '../../features/attachments/use-attachments'
import { attachmentSrc } from '../../lib/api'
import type { Attachment, TaskActivity } from '../../lib/api'
import { AttachmentChip } from '../attachments/attachment-tile'
import { AttachmentViewer } from '../attachments/attachment-viewer'
import { Button } from '../ui/button'
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
} from '../ui/alert-dialog'
import { Skeleton } from '../ui/skeleton'
import { Textarea } from '../ui/textarea'

export function TaskActivityTimeline({
  boardId,
  canEdit,
  taskId,
  workspaceId,
}: {
  boardId: number
  canEdit: boolean
  taskId: number
  workspaceId: number
}) {
  const activity = useTaskActivity(workspaceId, taskId)
  const events = activity.data?.pages.flatMap((page) => page.results) ?? []
  // Every page carries the same total.
  const total = activity.data?.pages[0]?.count ?? 0
  const hidden = Math.max(total - events.length, 0)

  return (
    <section className="pt-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-violet-500" /> Activity
        {total > events.length && (
          <span className="text-xs font-medium text-muted-foreground">
            {events.length} of {total}
          </span>
        )}
      </div>
      <div className="mt-4 space-y-4 border-l border-border pl-4">
        {activity.isPending ? (
          <>
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-52" />
          </>
        ) : (
          events.map((event) => (
            <ActivityItem
              canEdit={canEdit}
              event={event}
              key={event.id}
              taskId={taskId}
              workspaceId={workspaceId}
            />
          ))
        )}
        {/* A button rather than a scroll trigger: the composer sits
            underneath, and history must not grow as you reach for it. */}
        {activity.hasNextPage && (
          <Button
            className="text-muted-foreground"
            disabled={activity.isFetchingNextPage}
            onClick={() => void activity.fetchNextPage()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {activity.isFetchingNextPage ? <LoaderCircle className="animate-spin" /> : <ChevronDown />}
            Show {Math.min(hidden, TASK_ACTIVITY_BATCH)} more
          </Button>
        )}
      </div>
      {canEdit && <CommentComposer boardId={boardId} taskId={taskId} workspaceId={workspaceId} />}
    </section>
  )
}

function ActivityItem({
  canEdit,
  event,
  taskId,
  workspaceId,
}: {
  canEdit: boolean
  event: TaskActivity
  taskId: number
  workspaceId: number
}) {
  const session = useAuthSession()
  const updateComment = useUpdateTaskComment(workspaceId, taskId)
  const deleteComment = useDeleteTaskComment(workspaceId, taskId)
  const [editing, setEditing] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [body, setBody] = useState(event.comment_body ?? '')
  const isAuthor = event.author_id === session.data?.id

  function cancelEditing() {
    setBody(event.comment_body ?? '')
    setEditing(false)
  }

  return (
    <div
      className={`relative text-sm ${event.comment_id ? 'group/comment rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/50' : ''}`}
    >
      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-violet-500" />
      <p className="text-muted-foreground">
        {event.author_id && event.author_display_name && event.author_is_member ? (
          <Link
            className="font-semibold text-foreground hover:text-violet-500"
            to={`/workspaces/${workspaceId}/users/${event.author_id}`}
          >
            {event.author_display_name}
          </Link>
        ) : event.author_display_name ? (
          <span className="font-semibold text-foreground">{event.author_display_name}</span>
        ) : (
          'System'
        )}{' '}
        {event.comment_id ? 'commented' : eventText(event)}
      </p>
      {event.comment_id &&
        (editing ? (
          <div className="mt-2 space-y-2">
            <Textarea
              className="min-h-20"
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && cancelEditing()}
              value={body}
            />
            <div className="flex gap-2">
              <Button
                disabled={updateComment.isPending || !body.trim()}
                size="sm"
                onClick={() =>
                  updateComment.mutate(
                    {
                      commentId: event.comment_id!,
                      body,
                      mentionUserIds: event.comment_mentions
                        .filter((mention) => body.includes(`@${mention.display_name}`))
                        .map((mention) => mention.user_id),
                    },
                    { onSuccess: () => setEditing(false) },
                  )
                }
              >
                Save
              </Button>
              <Button disabled={updateComment.isPending} onClick={cancelEditing} size="sm" variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <CommentBody
            body={event.comment_body ?? ''}
            mentions={event.comment_mentions}
            workspaceId={workspaceId}
          />
        ))}
      {event.comment_id && !editing && event.comment_attachments.length > 0 && (
        <CommentAttachments attachments={event.comment_attachments} />
      )}
      {event.comment_id && canEdit && isAuthor && !editing && (
        <div className="absolute top-1 right-1 flex gap-1 opacity-0 transition-opacity group-hover/comment:opacity-100 group-focus-within/comment:opacity-100">
          <Button size="icon-sm" title="Edit comment" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil />
          </Button>
          <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
            <AlertDialogTrigger asChild>
              <Button size="icon-sm" title="Delete comment" variant="ghost">
                <Trash2 className="text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete comment?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes the comment from the activity history.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() =>
                    deleteComment.mutate(event.comment_id!, { onSuccess: () => setConfirmingDelete(false) })
                  }
                  variant="destructive"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
      <time className="mt-1 block text-xs text-muted-foreground" dateTime={event.created_at}>
        {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
          new Date(event.created_at),
        )}
      </time>
    </div>
  )
}

function CommentBody({
  body,
  mentions,
  workspaceId,
}: {
  body: string
  mentions: TaskActivity['comment_mentions']
  workspaceId: number
}) {
  // A comment can be a file and nothing else.
  if (!body) return null

  return (
    <p className="mt-2 whitespace-pre-wrap text-foreground">
      {splitCommentBody(body, mentions).map((segment, index) =>
        segment.mention ? (
          <Link
            className="mx-0.5 inline-flex rounded bg-background/80 px-1 py-0.5 text-sm font-medium text-violet-600 hover:bg-violet-500/15 dark:text-violet-300"
            key={`${segment.mention.user_id}-${index}`}
            to={`/workspaces/${workspaceId}/users/${segment.mention.user_id}`}
          >
            {segment.text}
          </Link>
        ) : (
          segment.text
        ),
      )}
    </p>
  )
}

/** Files posted with a comment: media as thumbnails, everything else a chip. */
function CommentAttachments({ attachments }: { attachments: Attachment[] }) {
  const [openId, setOpenId] = useState<number | null>(null)
  const media = attachments.filter(isVisualMedia)
  const files = attachments.filter((attachment) => !isVisualMedia(attachment))

  return (
    <div className="mt-2 space-y-2">
      {media.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {media.map((attachment) => (
            <button
              className="relative size-24 cursor-zoom-in overflow-hidden rounded-lg border bg-muted/60 transition hover:border-foreground/25"
              key={attachment.id}
              onClick={() => setOpenId(attachment.id)}
              title={`Open ${attachment.original_name}`}
              type="button"
            >
              {attachment.thumbnail_url ? (
                <img
                  alt={attachment.original_name}
                  className="size-full object-cover"
                  loading="lazy"
                  src={attachmentSrc(attachment, { variant: 'thumb' })}
                />
              ) : (
                <span className="grid size-full place-items-center">
                  <span className="grid size-9 place-items-center rounded-full bg-foreground/10">
                    <Play className="size-4 translate-x-px" />
                  </span>
                </span>
              )}
            </button>
          ))}
        </div>
      )}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((attachment) => (
            <AttachmentChip
              attachment={attachment}
              key={attachment.id}
              onOpen={() => setOpenId(attachment.id)}
            />
          ))}
        </div>
      )}
      <AttachmentViewer
        attachments={attachments}
        onClose={() => setOpenId(null)}
        onNavigate={setOpenId}
        openId={openId}
      />
    </div>
  )
}

function CommentComposer({
  boardId,
  taskId,
  workspaceId,
}: {
  boardId: number
  taskId: number
  workspaceId: number
}) {
  const [body, setBody] = useState('')
  const [mentionUserIds, setMentionUserIds] = useState<number[]>([])
  // Uploaded straight away; the server reaps them if the comment never comes.
  const [staged, setStaged] = useState<Attachment[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileInput = useRef<HTMLInputElement>(null)
  const createComment = useCreateTaskComment(workspaceId, taskId)
  const uploads = useUploadAttachments(workspaceId, taskId, { placement: 'comment' })
  const members = useBoardMembers(workspaceId, boardId)
  const mentionQuery = body.match(/(?:^|\s)@([^\s@]*)$/)?.[1]
  const matches =
    mentionQuery === undefined
      ? []
      : (members.data?.filter((member) =>
          member.display_name.toLowerCase().includes(mentionQuery.toLowerCase()),
        ) ?? [])

  function insertMention(userId: number, displayName: string) {
    setBody((current) => current.replace(/@[^\s@]*$/, `@${displayName} `))
    setMentionUserIds((ids) => (ids.includes(userId) ? ids : [...ids, userId]))
  }

  function stage(files: File[]) {
    if (!files.length) return
    void uploads.upload(files, (attachment) => setStaged((current) => [...current, attachment]))
  }

  function handlePaste(event: ClipboardEvent) {
    const files = filesFromDataTransfer(event.clipboardData)
    if (!files.length) return
    event.preventDefault()
    stage(files)
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    stage(filesFromDataTransfer(event.dataTransfer))
  }

  const canSend = Boolean(body.trim() || staged.length) && !uploads.pending.length

  function post() {
    createComment.mutate(
      { body, mentionUserIds, attachmentIds: staged.map((attachment) => attachment.id) },
      {
        onSuccess: () => {
          setBody('')
          setMentionUserIds([])
          setStaged([])
        },
      },
    )
  }

  return (
    <div
      className={`relative mt-6 rounded-xl transition ${isDragging ? 'ring-2 ring-violet-400' : ''}`}
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes('Files')) return
        // Counted, not toggled: a child's dragleave bubbles to the parent.
        dragDepth.current += 1
        setIsDragging(true)
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(dragDepth.current - 1, 0)
        if (!dragDepth.current) setIsDragging(false)
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Textarea
            className="min-h-20"
            onPaste={handlePaste}
            placeholder="Write a comment… Type @ to mention someone, or paste a file"
            value={body}
            onChange={(event) => {
              setBody(event.target.value)
              setMentionUserIds((ids) =>
                ids.filter((userId) => {
                  const member = members.data?.find((item) => item.user_id === userId)
                  return member ? event.target.value.includes(`@${member.display_name}`) : false
                }),
              )
            }}
          />
          {mentionQuery !== undefined && (
            <div className="absolute right-0 bottom-full left-0 z-20 mb-2 max-h-48 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
              {matches.length ? (
                matches.map((member) => (
                  <button
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted"
                    key={member.id}
                    onMouseDown={(event) => {
                      event.preventDefault()
                      insertMention(member.user_id, member.display_name)
                    }}
                    type="button"
                  >
                    <span className="grid size-6 place-items-center rounded-full bg-violet-500/15 text-xs font-bold text-violet-600">
                      {member.display_name.slice(0, 1)}
                    </span>
                    {member.display_name}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">No matching members</p>
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <input
            className="hidden"
            multiple
            onChange={(event) => {
              stage(Array.from(event.target.files ?? []))
              event.target.value = ''
            }}
            ref={fileInput}
            type="file"
          />
          <Button
            onClick={() => fileInput.current?.click()}
            size="icon"
            title="Attach a file"
            type="button"
            variant="outline"
          >
            <Paperclip />
          </Button>
          <Button
            disabled={createComment.isPending || !canSend}
            onClick={post}
            size="icon"
            title="Send comment"
          >
            <Send />
          </Button>
        </div>
      </div>

      {(staged.length > 0 || uploads.pending.length > 0) && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {staged.map((attachment) => (
            <AttachmentChip
              attachment={attachment}
              key={attachment.id}
              onOpen={() => window.open(attachmentSrc(attachment), '_blank', 'noopener')}
              onRemove={() =>
                // Dropped from the list only; the reaper collects it.
                setStaged((current) => current.filter((item) => item.id !== attachment.id))
              }
            />
          ))}
          {uploads.pending.map((upload) => (
            <span
              className="inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-xs text-muted-foreground"
              key={upload.key}
            >
              <LoaderCircle className="size-3.5 animate-spin" />
              {upload.name} {Math.round(upload.progress * 100)}%
            </span>
          ))}
        </div>
      )}

      {uploads.error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {uploads.error}
        </p>
      )}
      {createComment.error && (
        <p className="mt-2 text-sm text-destructive" role="alert">
          {createComment.error instanceof Error ? createComment.error.message : 'Unable to post the comment'}
        </p>
      )}
    </div>
  )
}

function eventText(event: TaskActivity) {
  const actions: Record<string, string> = {
    created: 'created this task',
    description_changed: 'changed the description',
    priority_changed: `changed priority to ${String(event.payload.to ?? 'none')}`,
    status_changed: `changed status to ${String(event.payload.to ?? 'none')}`,
    labels_changed: 'updated labels',
    assignees_changed: 'updated assignees',
    moved: `moved the task to ${String(event.payload.to)}`,
  }
  return event.action === 'title_changed'
    ? `renamed the task to “${String(event.payload.to)}”`
    : (actions[event.action] ?? 'updated this task')
}
