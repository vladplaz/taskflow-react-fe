import { describe, expect, it } from 'vitest'

import type { Attachment } from '../../lib/api'
import {
  attachmentKind,
  canPreview,
  fileRejectionReason,
  formatFileSize,
  isVisualMedia,
  MAX_ATTACHMENT_BYTES,
} from './attachment-kinds'

const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const POWERPOINT = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

function attachment(overrides: Partial<Attachment> = {}): Attachment {
  return {
    id: 1,
    original_name: 'file.bin',
    content_type: 'application/octet-stream',
    size: 10,
    url: '/api/v1/workspaces/1/attachments/1/',
    thumbnail_url: null,
    can_preview: false,
    placement: 'task',
    uploaded_by_id: 1,
    uploaded_by_display_name: 'Ada',
    created_at: '2026-07-28T10:00:00Z',
    ...overrides,
  }
}

function file(name: string, size: number): File {
  return { name, size } as File
}

describe('attachmentKind', () => {
  it('classifies what the browser can render natively', () => {
    expect(attachmentKind('image/png')).toBe('image')
    expect(attachmentKind('video/mp4')).toBe('video')
    expect(attachmentKind('audio/mpeg')).toBe('audio')
    expect(attachmentKind('application/pdf')).toBe('pdf')
    expect(attachmentKind('text/plain')).toBe('text')
  })

  it('does not treat SVG as an image', () => {
    // It can carry script, so the server refuses to serve it inline.
    expect(attachmentKind('image/svg+xml')).toBe('other')
  })

  it('classifies the Office formats it can render in JavaScript', () => {
    expect(attachmentKind(WORD)).toBe('office')
    expect(attachmentKind(EXCEL)).toBe('office')
    expect(attachmentKind(POWERPOINT)).toBe('office')
  })

  it('recognises an Office file by name when the type was lost', () => {
    // mimetypes does not know OOXML on every platform.
    expect(attachmentKind('application/octet-stream', 'report.docx')).toBe('office')
    expect(attachmentKind('application/octet-stream', 'budget.xlsx')).toBe('office')
  })

  it('treats a CSV as a spreadsheet rather than plain text', () => {
    expect(attachmentKind('text/csv', 'rows.csv')).toBe('office')
  })

  it('leaves the legacy binary formats alone', () => {
    expect(attachmentKind('application/msword', 'old.doc')).toBe('other')
    expect(attachmentKind('application/vnd.ms-powerpoint', 'old.ppt')).toBe('other')
  })

  it('falls back for anything else', () => {
    expect(attachmentKind('application/zip', 'bundle.zip')).toBe('other')
  })

  it('is case-insensitive', () => {
    expect(attachmentKind('IMAGE/PNG')).toBe('image')
  })
})

describe('canPreview', () => {
  it('needs the server to agree', () => {
    expect(canPreview(attachment({ content_type: 'image/png', can_preview: true }))).toBe(true)
    expect(canPreview(attachment({ content_type: 'image/png', can_preview: false }))).toBe(false)
  })

  it('previews Office files the server refuses to serve inline', () => {
    // Divergent on purpose: the flag governs the response, and the viewer
    // renders Office files itself rather than framing it.
    const docx = attachment({
      content_type: WORD,
      original_name: 'spec.docx',
      can_preview: false,
    })

    expect(canPreview(docx)).toBe(true)
  })

  it('refuses a type this app has no renderer for', () => {
    expect(canPreview(attachment({ content_type: 'application/zip', can_preview: true }))).toBe(false)
  })
})

describe('isVisualMedia', () => {
  it('is true for images and video the server will serve inline', () => {
    expect(isVisualMedia(attachment({ content_type: 'image/png', can_preview: true }))).toBe(true)
    expect(isVisualMedia(attachment({ content_type: 'video/mp4', can_preview: true }))).toBe(true)
  })

  it('is false for a PDF, which renders as a chip rather than a tile', () => {
    expect(isVisualMedia(attachment({ content_type: 'application/pdf', can_preview: true }))).toBe(false)
  })
})

describe('formatFileSize', () => {
  it('reads naturally at each scale', () => {
    expect(formatFileSize(0)).toBe('0 B')
    expect(formatFileSize(999)).toBe('999 B')
    expect(formatFileSize(1024)).toBe('1.0 KB')
    expect(formatFileSize(1536)).toBe('1.5 KB')
    expect(formatFileSize(20 * 1024)).toBe('20 KB')
    expect(formatFileSize(25 * 1024 * 1024)).toBe('25 MB')
  })
})

describe('fileRejectionReason', () => {
  it('accepts a file inside the limit', () => {
    expect(fileRejectionReason(file('notes.txt', 1024))).toBeNull()
    expect(fileRejectionReason(file('exact.bin', MAX_ATTACHMENT_BYTES))).toBeNull()
  })

  it('rejects an empty file', () => {
    expect(fileRejectionReason(file('empty.txt', 0))).toContain('empty')
  })

  it('rejects a file over the limit, naming both sizes', () => {
    const reason = fileRejectionReason(file('huge.mov', 30 * 1024 * 1024))

    expect(reason).toContain('huge.mov')
    expect(reason).toContain('30 MB')
    expect(reason).toContain('25 MB')
  })
})
