/**
 * Office document previews, rendered in the browser and loaded on demand.
 *
 * The markup these renderers produce is treated as hostile: none of them
 * sanitizes, and `docx-preview` copies hyperlink hrefs verbatim, so a
 * `javascript:` target survives. On a shared board that is stored XSS
 * (GHSA-hcwp-82g6-8wxc). It therefore never enters this app's document -- it
 * goes into a fully sandboxed `<iframe srcdoc>`; see `OFFICE_FRAME_SANDBOX`.
 */

export type OfficeKind = 'word' | 'spreadsheet' | 'slides'

/**
 * A sandbox with nothing granted: no `allow-scripts`, so nothing executes, and
 * no `allow-same-origin`, so the frame's origin is opaque. The opaque origin is
 * why images below are inlined as data URIs -- a `blob:` URL would not resolve.
 */
export const OFFICE_FRAME_SANDBOX = ''

const BY_CONTENT_TYPE: Record<string, OfficeKind> = {
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'word',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'spreadsheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'slides',
  'application/vnd.ms-excel': 'spreadsheet',
  'application/vnd.oasis.opendocument.spreadsheet': 'spreadsheet',
}

/**
 * Fallback for uploads stored as `application/octet-stream`. `.doc` and `.ppt`
 * are absent because no library here reads them; `.xls` works in SheetJS.
 */
const BY_EXTENSION: Record<string, OfficeKind> = {
  docx: 'word',
  xlsx: 'spreadsheet',
  xlsm: 'spreadsheet',
  xls: 'spreadsheet',
  csv: 'spreadsheet',
  ods: 'spreadsheet',
  pptx: 'slides',
}

export function officeKind(contentType: string, filename: string): OfficeKind | null {
  const byType = BY_CONTENT_TYPE[contentType.toLowerCase()]
  if (byType) return byType
  const extension = filename.split('.').pop()?.toLowerCase() ?? ''
  return BY_EXTENSION[extension] ?? null
}

/** Wrap rendered markup in a standalone document for the sandboxed frame. */
function documentShell(styles: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="script-src 'none'">
<style>
  html { color-scheme: light; }
  body { margin: 0; padding: 16px; background: #fff; color: #111;
         font: 14px/1.5 system-ui, sans-serif; }
  table { border-collapse: collapse; margin-bottom: 24px; }
  td, th { border: 1px solid #d4d4d8; padding: 4px 8px; white-space: pre-wrap; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: #71717a; }
  img { max-width: 100%; }
${styles}
</style></head><body>${body}</body></html>`
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character,
  )
}

/**
 * Render a Word document to standalone HTML. `docx-preview` builds DOM, so the
 * container stays detached and is never inserted into this page.
 */
async function renderWord(blob: Blob): Promise<string> {
  const { renderAsync } = await import('docx-preview')
  const body = document.createElement('div')
  const styles = document.createElement('div')

  await renderAsync(blob, body, styles, {
    // Defaults to true, which frames the embedded HTML part unsandboxed.
    renderAltChunks: false,
    renderComments: false,
    renderChanges: false,
    // A `blob:` URL would not resolve inside an opaque origin.
    useBase64URL: true,
    inWrapper: true,
    breakPages: true,
  })

  return documentShell(styles.textContent ?? '', body.innerHTML)
}

/** Render every sheet of a workbook as a table. */
async function renderSpreadsheet(blob: Blob): Promise<string> {
  const XLSX = await import('xlsx')
  const workbook = XLSX.read(await blob.arrayBuffer(), { type: 'array' })

  const sheets = workbook.SheetNames.map((name) => {
    const table = XLSX.utils.sheet_to_html(workbook.Sheets[name], { header: '', footer: '' })
    return `<h2>${escapeHtml(name)}</h2>${table}`
  })

  if (!sheets.length) throw new Error('This workbook has no sheets.')
  return documentShell('', sheets.join('\n'))
}

/** HTML for a Word document or a workbook, ready for a sandboxed frame. */
export async function renderOfficeDocument(kind: 'word' | 'spreadsheet', blob: Blob): Promise<string> {
  return kind === 'word' ? renderWord(blob) : renderSpreadsheet(blob)
}

export type SlideDeck = {
  slideCount: number
  goToSlide: (index: number) => Promise<void>
  redraw: () => Promise<void>
  destroy: () => void
}

/**
 * Match the canvas's pixel buffer to the box it occupies. A canvas defaults to
 * 300x150 whatever its CSS size, and `slideSizeMode: 'fit'` fits the buffer.
 */
function fitCanvasToBox(canvas: HTMLCanvasElement): void {
  const ratio = window.devicePixelRatio || 1
  // Fallback for an element that has not been laid out yet.
  const width = canvas.clientWidth || 960
  const height = canvas.clientHeight || 540
  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
}

/** Paint a presentation onto a canvas. Pixels cannot execute, so no sandbox. */
export async function renderSlides(blob: Blob, canvas: HTMLCanvasElement): Promise<SlideDeck> {
  const { PPTXViewer } = await import('pptxviewjs')
  const viewer = new PPTXViewer({ canvas, slideSizeMode: 'fit' })
  await viewer.loadFile(await blob.arrayBuffer())

  const slideCount = viewer.getSlideCount()
  if (!slideCount) throw new Error('This presentation has no slides.')

  const draw = async (index?: number) => {
    fitCanvasToBox(canvas)
    if (index === undefined) await viewer.render(canvas)
    else await viewer.goToSlide(index, canvas)
  }

  await draw()
  return {
    slideCount,
    goToSlide: (index: number) => draw(index),
    redraw: () => draw(viewer.getCurrentSlideIndex()),
    destroy: () => viewer.destroy(),
  }
}
