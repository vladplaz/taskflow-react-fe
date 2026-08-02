import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'

import {
  OFFICE_FRAME_SANDBOX,
  renderOfficeDocument,
  renderSlides,
} from '../../features/attachments/office-preview'
import type { OfficeKind, SlideDeck } from '../../features/attachments/office-preview'
import { attachmentSrc } from '../../lib/api'
import type { Attachment } from '../../lib/api'
import { Button } from '../ui/button'

/**
 * Preview for a Word document, workbook, or slide deck. The bytes are fetched
 * as a blob rather than framed: the serve endpoint sends
 * `Content-Disposition: attachment` for these types. `onUnsupported` falls
 * back to the download panel when a renderer cannot handle a document.
 */
export function OfficePreview({
  attachment,
  kind,
  onUnsupported,
}: {
  attachment: Attachment
  kind: OfficeKind
  onUnsupported: () => void
}) {
  return kind === 'slides' ? (
    <SlidesPreview attachment={attachment} onUnsupported={onUnsupported} />
  ) : (
    <DocumentPreview attachment={attachment} kind={kind} onUnsupported={onUnsupported} />
  )
}

function useAttachmentBlob(attachment: Attachment, onUnsupported: () => void) {
  // Stored with the id it came from rather than cleared on change, which
  // would show the previous file's blob for one render.
  const [loaded, setLoaded] = useState<{ id: number; blob: Blob } | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetch(attachmentSrc(attachment, { stream: true }), {
      credentials: 'include',
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error('unreadable'))))
      .then((blob) => setLoaded({ id: attachment.id, blob }))
      .catch(() => {
        if (!controller.signal.aborted) onUnsupported()
      })
    return () => controller.abort()
  }, [attachment, onUnsupported])

  return loaded?.id === attachment.id ? loaded.blob : null
}

function DocumentPreview({
  attachment,
  kind,
  onUnsupported,
}: {
  attachment: Attachment
  kind: 'word' | 'spreadsheet'
  onUnsupported: () => void
}) {
  const blob = useAttachmentBlob(attachment, onUnsupported)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!blob) return
    let cancelled = false
    renderOfficeDocument(kind, blob)
      .then((rendered) => !cancelled && setHtml(rendered))
      .catch(() => !cancelled && onUnsupported())
    return () => {
      cancelled = true
    }
  }, [blob, kind, onUnsupported])

  if (html === null) return <Loading label={`Rendering ${attachment.original_name}…`} />

  return (
    // Nothing granted: no scripts, opaque origin. See
    // features/attachments/office-preview.ts for why.
    <iframe
      className="h-full w-full rounded-lg border bg-white"
      sandbox={OFFICE_FRAME_SANDBOX}
      srcDoc={html}
      title={attachment.original_name}
    />
  )
}

function SlidesPreview({ attachment, onUnsupported }: { attachment: Attachment; onUnsupported: () => void }) {
  const blob = useAttachmentBlob(attachment, onUnsupported)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [deck, setDeck] = useState<SlideDeck | null>(null)
  const [slide, setSlide] = useState(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!blob || !canvas) return

    let cancelled = false
    let loaded: SlideDeck | null = null
    renderSlides(blob, canvas)
      .then((result) => {
        if (cancelled) {
          result.destroy()
          return
        }
        loaded = result
        setDeck(result)
        setSlide(0)
      })
      .catch(() => !cancelled && onUnsupported())

    return () => {
      cancelled = true
      loaded?.destroy()
    }
  }, [blob, onUnsupported])

  // The slide fits the canvas's pixel buffer, so a resize needs a repaint.
  useEffect(() => {
    if (!deck) return
    const onResize = () => void deck.redraw()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [deck])

  function show(index: number) {
    if (!deck || index < 0 || index >= deck.slideCount) return
    setSlide(index)
    void deck.goToSlide(index)
  }

  return (
    <div className="flex h-full w-full flex-col items-center gap-3">
      <div className="relative min-h-0 w-full flex-1">
        {/* Never behind a loading branch: the renderer measures this element,
            and a display:none canvas measures zero. */}
        <canvas className="absolute inset-0 size-full" ref={canvasRef} />
        {!deck && (
          <div className="absolute inset-0 grid place-items-center">
            <Loading label={`Rendering ${attachment.original_name}…`} />
          </div>
        )}
      </div>
      {deck && deck.slideCount > 1 && (
        <div className="flex shrink-0 items-center gap-2">
          <Button disabled={slide === 0} onClick={() => show(slide - 1)} size="icon-sm" variant="outline">
            <ChevronLeft />
          </Button>
          <span className="text-xs tabular-nums text-muted-foreground">
            Slide {slide + 1} of {deck.slideCount}
          </span>
          <Button
            disabled={slide === deck.slideCount - 1}
            onClick={() => show(slide + 1)}
            size="icon-sm"
            variant="outline"
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  )
}

function Loading({ label }: { label: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-muted-foreground">
      <LoaderCircle className="size-4 animate-spin" /> {label}
    </p>
  )
}
