import type { Attachment } from '../../lib/api'
import { officeKind } from './office-preview'

/** How a file is rendered, once it is open in the viewer. */
export type AttachmentKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'office' | 'other'

/** How the viewer should render a file. */
export function attachmentKind(contentType: string, filename = ''): AttachmentKind {
  const type = contentType.toLowerCase()
  // SVG can carry script, so the server refuses to serve it inline.
  if (type === 'image/svg+xml') return 'other'
  if (type.startsWith('image/')) return 'image'
  if (type.startsWith('video/')) return 'video'
  if (type.startsWith('audio/')) return 'audio'
  if (type === 'application/pdf') return 'pdf'
  // Office is checked before `text/`, because a CSV is both.
  if (officeKind(type, filename)) return 'office'
  if (type.startsWith('text/')) return 'text'
  return 'other'
}

/**
 * Whether the viewer can show this file rather than only offer it.
 *
 * Not simply `attachment.can_preview`: that flag says whether the *response*
 * may render in place, and the viewer renders Office files in JavaScript
 * instead. For everything else the server's flag stays the authority.
 */
export function canPreview(attachment: Attachment): boolean {
  const kind = attachmentKind(attachment.content_type, attachment.original_name)
  if (kind === 'office') return true
  return attachment.can_preview && kind !== 'other'
}

/** Files shown as media in a comment row; everything else becomes a chip. */
export function isVisualMedia(attachment: Attachment): boolean {
  const kind = attachmentKind(attachment.content_type)
  return (kind === 'image' || kind === 'video') && attachment.can_preview
}

const UNITS = ['B', 'KB', 'MB', 'GB']

export function formatFileSize(bytes: number): string {
  let size = bytes
  let unit = 0
  while (size >= 1024 && unit < UNITS.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${unit === 0 ? size : size.toFixed(size < 10 ? 1 : 0)} ${UNITS[unit]}`
}

/** Mirrors ATTACHMENT_MAX_BYTES; the server enforces it either way. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024

/** Reject a file before it is uploaded, or return null to go ahead. */
export function fileRejectionReason(file: File): string | null {
  if (file.size === 0) return `“${file.name}” is empty.`
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return `“${file.name}” is ${formatFileSize(file.size)}. The limit is ${formatFileSize(
      MAX_ATTACHMENT_BYTES,
    )}.`
  }
  return null
}

/**
 * Files carried by a paste or a drop. `DataTransfer.files` is empty for a
 * copied image in some browsers, which use `items`, so both are read.
 */
export function filesFromDataTransfer(data: DataTransfer | null): File[] {
  if (!data) return []
  const fromItems = Array.from(data.items ?? [])
    .filter((item) => item.kind === 'file')
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null)
  const files = fromItems.length ? fromItems : Array.from(data.files ?? [])
  const seen = new Set<string>()
  return files.filter((file) => {
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
