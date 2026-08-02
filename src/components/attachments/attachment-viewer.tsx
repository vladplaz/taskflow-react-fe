import { useCallback, useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, FileQuestion } from 'lucide-react'

import { attachmentKind, canPreview, formatFileSize } from '../../features/attachments/attachment-kinds'
import { officeKind } from '../../features/attachments/office-preview'
import { attachmentSrc } from '../../lib/api'
import type { Attachment } from '../../lib/api'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog'
import { OfficePreview } from './office-preview'

/** The full-screen file viewer; every preview here is a native element. */
export function AttachmentViewer({
  attachments,
  onClose,
  onNavigate,
  openId,
}: {
  attachments: Attachment[]
  onClose: () => void
  /** Which file is open is the caller's state, so paging is too. */
  onNavigate: (attachmentId: number) => void
  openId: number | null
}) {
  const current = attachments.findIndex((attachment) => attachment.id === openId)
  const attachment = attachments[current]

  useEffect(() => {
    if (!attachment || attachments.length < 2) return

    function onKeyDown(event: KeyboardEvent) {
      const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0
      if (!step) return
      const next = attachments[current + step]
      if (next) onNavigate(next.id)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [attachment, attachments, current, onNavigate])

  if (!attachment) return null

  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="flex h-[calc(100vh-3rem)] max-w-[calc(100vw-3rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-3rem)]">
        <DialogTitle className="sr-only">{attachment.original_name}</DialogTitle>
        <DialogDescription className="sr-only">Preview and download the attached file.</DialogDescription>

        <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3 pr-14">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{attachment.original_name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(attachment.size)}
              {attachment.uploaded_by_display_name
                ? ` · added by ${attachment.uploaded_by_display_name}`
                : ''}
            </p>
          </div>
          {attachments.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                disabled={current === 0}
                onClick={() => onNavigate(attachments[current - 1].id)}
                size="icon-sm"
                title="Previous file"
                variant="ghost"
              >
                <ChevronLeft />
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {current + 1} / {attachments.length}
              </span>
              <Button
                disabled={current === attachments.length - 1}
                onClick={() => onNavigate(attachments[current + 1].id)}
                size="icon-sm"
                title="Next file"
                variant="ghost"
              >
                <ChevronRight />
              </Button>
            </div>
          )}
          <DownloadButton attachment={attachment} />
        </header>

        <div className="grid min-h-0 flex-1 place-items-center overflow-auto bg-muted/40 p-4">
          <AttachmentPreview attachment={attachment} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function DownloadButton({
  attachment,
  variant = 'outline',
}: {
  attachment: Attachment
  variant?: 'outline' | 'ghost'
}) {
  return (
    <Button asChild variant={variant}>
      {/* A plain link, so the browser's own download manager handles it.
          `download` is advisory cross-origin -- hence the server's header. */}
      <a download={attachment.original_name} href={attachmentSrc(attachment, { download: true })}>
        <Download /> Download
      </a>
    </Button>
  )
}

function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const source = attachmentSrc(attachment)
  // Keyed by id, so opening a second file starts from a clean slate.
  const [unrenderable, setUnrenderable] = useState<number | null>(null)
  const onUnsupported = useCallback(() => setUnrenderable(attachment.id), [attachment.id])

  if (!canPreview(attachment) || unrenderable === attachment.id) {
    return <UnsupportedPreview attachment={attachment} />
  }

  switch (attachmentKind(attachment.content_type, attachment.original_name)) {
    case 'image':
      return (
        <img alt={attachment.original_name} className="max-h-full max-w-full object-contain" src={source} />
      )
    case 'video':
      return (
        // Seeking works because the serve endpoint answers byte ranges.
        <video className="max-h-full max-w-full" controls preload="metadata" src={source} />
      )
    case 'audio':
      return <audio className="w-full max-w-xl" controls preload="metadata" src={source} />
    case 'pdf':
      return (
        <iframe
          className="h-full w-full rounded-lg border bg-background"
          src={source}
          title={attachment.original_name}
        />
      )
    case 'office':
      return (
        <OfficePreview
          attachment={attachment}
          kind={officeKind(attachment.content_type, attachment.original_name) ?? 'word'}
          onUnsupported={onUnsupported}
        />
      )
    case 'text':
      return <TextPreview attachment={attachment} />
    default:
      return <UnsupportedPreview attachment={attachment} />
  }
}

function TextPreview({ attachment }: { attachment: Attachment }) {
  const [content, setContent] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(attachmentSrc(attachment, { stream: true }), {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.text() : Promise.reject(new Error('unreadable'))))
      // Bounded, so a large log cannot lock up the tab.
      .then((text) => setContent(text.slice(0, 200_000)))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setFailed(Boolean(error))
      })
    return () => controller.abort()
  }, [attachment])

  if (failed) return <UnsupportedPreview attachment={attachment} />
  if (content === null) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <pre className="h-full w-full overflow-auto rounded-lg border bg-background p-4 text-left font-mono text-xs whitespace-pre-wrap">
      {content}
    </pre>
  )
}

function UnsupportedPreview({ attachment }: { attachment: Attachment }) {
  // Either a type with no renderer, or an Office file its renderer gave up
  // on; the wording has to fit both.
  const renderable = officeKind(attachment.content_type, attachment.original_name) !== null

  return (
    <div className="max-w-md text-center">
      <FileQuestion className="mx-auto size-12 text-muted-foreground/60" />
      <p className="mt-4 font-semibold">
        {renderable ? 'This file couldn’t be previewed' : 'Preview isn’t available for this file type'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {renderable
          ? 'The preview covers most documents but not every feature. Download it to open in the app it belongs to.'
          : `Nothing in the browser can render ${describeType(attachment.content_type)} in place. Download it to open in the app it belongs to.`}
      </p>
      <div className="mt-5 flex justify-center">
        <DownloadButton attachment={attachment} />
      </div>
    </div>
  )
}

/** A content type a person can read, for the "no preview" message. */
function describeType(contentType: string): string {
  const known: Record<string, string> = {
    'application/msword': 'a legacy Word document',
    'application/vnd.ms-powerpoint': 'a legacy PowerPoint file',
    'application/zip': 'an archive',
    'image/svg+xml': 'an SVG',
  }
  return known[contentType] ?? `a ${contentType.split('/').pop() ?? 'file'} file`
}
