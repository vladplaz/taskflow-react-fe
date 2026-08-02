import {
  Download,
  File,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  Image as ImageIcon,
  Play,
  Presentation,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { attachmentKind, formatFileSize } from '../../features/attachments/attachment-kinds'
import { attachmentSrc } from '../../lib/api'
import type { Attachment } from '../../lib/api'
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

/** One file in the attachment strip. */
export function AttachmentTile({
  attachment,
  canDelete,
  isInDescription = false,
  onDelete,
  onOpen,
}: {
  attachment: Attachment
  canDelete: boolean
  isInDescription?: boolean
  onDelete: () => void
  onOpen: () => void
}) {
  const kind = attachmentKind(attachment.content_type, attachment.original_name)

  return (
    <div className="group/tile relative flex w-40 flex-col overflow-hidden rounded-xl border bg-background transition hover:border-foreground/25 hover:shadow-sm">
      <button
        className="grid aspect-[4/3] cursor-pointer place-items-center overflow-hidden bg-muted/60"
        onClick={onOpen}
        title={`Open ${attachment.original_name}`}
        type="button"
      >
        {attachment.thumbnail_url ? (
          <img
            alt=""
            className="size-full object-cover"
            loading="lazy"
            src={attachmentSrc(attachment, { variant: 'thumb' })}
          />
        ) : kind === 'video' ? (
          // No poster frame: extracting one needs ffmpeg server-side.
          <span className="grid size-10 place-items-center rounded-full bg-foreground/10">
            <Play className="size-4 translate-x-px" />
          </span>
        ) : (
          <KindIcon className="size-8 text-muted-foreground" kind={kind} name={attachment.original_name} />
        )}
      </button>

      <div className="min-w-0 border-t px-2.5 py-2">
        <p className="truncate text-xs font-medium" title={attachment.original_name}>
          {attachment.original_name}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          {formatFileSize(attachment.size)}
          {isInDescription && ' · In description'}
        </p>
      </div>

      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 transition-opacity group-hover/tile:opacity-100 group-focus-within/tile:opacity-100">
        <DownloadIconButton attachment={attachment} />
        {canDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="bg-background/90 backdrop-blur-sm"
                size="icon-sm"
                title="Delete file"
                variant="ghost"
              >
                <Trash2 className="text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete “{attachment.original_name}”?</AlertDialogTitle>
                <AlertDialogDescription>
                  {isInDescription
                    ? 'This removes the file from storage and takes it out of the description too. It cannot be undone.'
                    : 'This permanently removes the file from storage. It cannot be undone.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={onDelete}
                  variant="destructive"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  )
}

/** A compact file reference, for comment rows and inline description chips. */
export function AttachmentChip({
  attachment,
  onOpen,
  onRemove,
}: {
  attachment: Attachment
  onOpen: () => void
  onRemove?: () => void
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border bg-background py-1 pr-1 pl-2 align-middle text-xs">
      <button
        className="flex min-w-0 cursor-pointer items-center gap-2 hover:text-violet-500"
        onClick={onOpen}
        title={`Open ${attachment.original_name}`}
        type="button"
      >
        <KindIcon
          className="size-3 shrink-0 text-muted-foreground"
          kind={attachmentKind(attachment.content_type, attachment.original_name)}
          name={attachment.original_name}
        />
        <span className="truncate font-medium">{attachment.original_name}</span>
        <span className="shrink-0 text-muted-foreground">{formatFileSize(attachment.size)}</span>
      </button>
      {onRemove ? (
        <Button onClick={onRemove} size="icon-xs" title="Remove file" type="button" variant="ghost">
          <Trash2 className="text-destructive" />
        </Button>
      ) : (
        <DownloadIconButton attachment={attachment} size="icon-xs" />
      )}
    </span>
  )
}

function DownloadIconButton({
  attachment,
  size = 'icon-sm',
}: {
  attachment: Attachment
  size?: 'icon-xs' | 'icon-sm'
}) {
  return (
    <Button asChild className="bg-background/90 backdrop-blur-sm" size={size} variant="ghost">
      {/* A plain link, so the browser's own download manager handles it. */}
      <a
        download={attachment.original_name}
        href={attachmentSrc(attachment, { download: true })}
        title={`Download ${attachment.original_name}`}
      >
        <Download />
        <span className="sr-only">Download {attachment.original_name}</span>
      </a>
    </Button>
  )
}

/**
 * Extensions worth their own icon, where the content type is too generic.
 * Components, not elements: lucide draws at 24px unless the caller's `size-*`
 * reaches the `<svg>` itself, and a sized wrapper only sizes the box.
 */
const EXTENSION_ICONS: Record<string, LucideIcon> = {
  doc: FileType,
  docx: FileType,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  xlsm: FileSpreadsheet,
  ods: FileSpreadsheet,
  csv: FileSpreadsheet,
  ppt: Presentation,
  pptx: Presentation,
  zip: FileArchive,
  rar: FileArchive,
  gz: FileArchive,
  '7z': FileArchive,
}

function KindIcon({
  className,
  kind,
  name,
}: {
  className?: string
  kind: ReturnType<typeof attachmentKind>
  name: string
}) {
  const extension = name.split('.').pop()?.toLowerCase() ?? ''
  const byKind: Record<string, LucideIcon> = {
    image: ImageIcon,
    video: FileVideo,
    audio: FileAudio,
    pdf: FileText,
    text: FileText,
  }
  const Icon = byKind[kind] ?? EXTENSION_ICONS[extension] ?? File

  return <Icon className={className} />
}
