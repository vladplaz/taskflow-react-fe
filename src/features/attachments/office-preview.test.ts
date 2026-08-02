import { describe, expect, it } from 'vitest'

import { OFFICE_FRAME_SANDBOX, officeKind } from './office-preview'

const WORD = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const EXCEL = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const POWERPOINT = 'application/vnd.openxmlformats-officedocument.presentationml.presentation'

describe('officeKind', () => {
  it('recognises the OOXML content types', () => {
    expect(officeKind(WORD, 'spec.docx')).toBe('word')
    expect(officeKind(EXCEL, 'budget.xlsx')).toBe('spreadsheet')
    expect(officeKind(POWERPOINT, 'deck.pptx')).toBe('slides')
  })

  it('falls back to the filename when the type was lost', () => {
    // mimetypes does not know OOXML on every platform.
    expect(officeKind('application/octet-stream', 'spec.docx')).toBe('word')
    expect(officeKind('application/octet-stream', 'budget.xlsx')).toBe('spreadsheet')
    expect(officeKind('application/octet-stream', 'deck.pptx')).toBe('slides')
  })

  it('reads the legacy Excel format, which SheetJS genuinely supports', () => {
    expect(officeKind('application/vnd.ms-excel', 'old.xls')).toBe('spreadsheet')
  })

  it('refuses the legacy binary Word and PowerPoint formats', () => {
    // .doc and .ppt are not ZIP containers; no renderer here reads them.
    expect(officeKind('application/msword', 'old.doc')).toBeNull()
    expect(officeKind('application/vnd.ms-powerpoint', 'old.ppt')).toBeNull()
  })

  it('is not fooled by an unrelated file', () => {
    expect(officeKind('application/zip', 'bundle.zip')).toBeNull()
    expect(officeKind('image/png', 'photo.png')).toBeNull()
    expect(officeKind('application/octet-stream', 'no-extension')).toBeNull()
  })

  it('ignores case in both the type and the name', () => {
    expect(officeKind(WORD.toUpperCase(), 'SPEC.DOCX')).toBe('word')
  })
})

describe('OFFICE_FRAME_SANDBOX', () => {
  it('grants nothing at all', () => {
    // The renderers do not sanitize; the empty sandbox is the whole
    // mitigation. Granting any permission here reopens the stored-XSS route.
    expect(OFFICE_FRAME_SANDBOX).toBe('')
    expect(OFFICE_FRAME_SANDBOX).not.toContain('allow-scripts')
    expect(OFFICE_FRAME_SANDBOX).not.toContain('allow-same-origin')
  })
})
