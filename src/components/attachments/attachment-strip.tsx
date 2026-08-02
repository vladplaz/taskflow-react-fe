import { useRef, useState } from 'react'
import type { DragEvent } from 'react'
import { LoaderCircle, Paperclip } from 'lucide-react'

import { filesFromDataTransfer, formatFileSize } from '../../features/attachments/attachment-kinds'
import { useDeleteAttachment, useUploadAttachments } from '../../features/attachments/use-attachments'
import type { PendingUpload } from '../../features/attachments/use-attachments'
import type { Attachment } from '../../lib/api'
import { Button } from '../ui/button'
import { AttachmentTile } from './attachment-tile'

/**
 * The canonical list of a task's files. The description points at these rows
 * rather than owning them, so deleting here is the only destructive action.
 */
export function AttachmentStrip({
  attachments,
  canEdit,
  describedIds,
  onDeleted,
  onOpen,
  taskId,
  workspaceId,
}: {
  attachments: Attachment[]
  canEdit: boolean
  /** Ids the description currently references, for the "In description" note. */
  describedIds: Set<number>
  onDeleted: (attachmentId: number) => void
  /** The viewer is owned by the task modal, so the editor can open it too. */
  onOpen: (attachmentId: number) => void
  taskId: number
  workspaceId: number
}) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const { upload, pending, error, clearError } = useUploadAttachments(workspaceId, taskId)
  const deleteAttachment = useDeleteAttachment(workspaceId, taskId)

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    dragDepth.current = 0
    setIsDragging(false)
    if (!canEdit) return
    const files = filesFromDataTransfer(event.dataTransfer)
    if (files.length) void upload(files)
  }

  function handleDelete(attachment: Attachment) {
    deleteAttachment.mutate(attachment.id, {
      // Lets the editor drop any inline node that pointed here.
      onSuccess: () => onDeleted(attachment.id),
    })
  }

  const isEmpty = !attachments.length && !pending.length

  return (
    <section
      className={`rounded-xl border border-dashed p-3 transition ${
        isDragging ? 'border-violet-400 bg-violet-500/5' : 'border-transparent'
      }`}
      onDragEnter={(event) => {
        if (!canEdit || !event.dataTransfer.types.includes('Files')) return
        // Counted, not toggled: a child's dragleave bubbles to the parent.
        dragDepth.current += 1
        setIsDragging(true)
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(dragDepth.current - 1, 0)
        if (!dragDepth.current) setIsDragging(false)
      }}
      onDragOver={(event) => canEdit && event.preventDefault()}
      onDrop={handleDrop}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Paperclip className="size-4 text-violet-500" />
          Attachments
          {attachments.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {attachments.length}
            </span>
          )}
        </h3>
        {canEdit && (
          <>
            <input
              className="hidden"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                if (files.length) void upload(files)
                event.target.value = ''
              }}
              ref={fileInput}
              type="file"
            />
            <Button onClick={() => fileInput.current?.click()} size="sm" type="button" variant="outline">
              <Paperclip /> Attach
            </Button>
          </>
        )}
      </div>

      {error && (
        <p className="mt-2 flex items-start gap-2 text-sm text-destructive" role="alert">
          <span className="flex-1">{error}</span>
          <Button onClick={clearError} size="xs" type="button" variant="ghost">
            Dismiss
          </Button>
        </p>
      )}

      {isEmpty ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {canEdit
            ? 'Drop a file here, paste one into the description, or use Attach. Up to 25 MB each.'
            : 'No files attached.'}
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-3">
          {attachments.map((attachment) => (
            <AttachmentTile
              attachment={attachment}
              canDelete={canEdit}
              isInDescription={describedIds.has(attachment.id)}
              key={attachment.id}
              onDelete={() => handleDelete(attachment)}
              onOpen={() => onOpen(attachment.id)}
            />
          ))}
          {pending.map((upload) => (
            <UploadingTile key={upload.key} upload={upload} />
          ))}
        </div>
      )}
    </section>
  )
}

function UploadingTile({ upload }: { upload: PendingUpload }) {
  return (
    <div className="flex w-40 flex-col overflow-hidden rounded-xl border bg-background">
      <div className="grid aspect-[4/3] place-items-center bg-muted/60">
        <LoaderCircle className="size-6 animate-spin text-muted-foreground" />
      </div>
      <div className="min-w-0 border-t px-2.5 py-2">
        <p className="truncate text-xs font-medium" title={upload.name}>
          {upload.name}
        </p>
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-violet-500 transition-[width] duration-150"
            style={{ width: `${Math.round(upload.progress * 100)}%` }}
          />
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {Math.round(upload.progress * 100)}% of {formatFileSize(upload.size)}
        </p>
      </div>
    </div>
  )
}
