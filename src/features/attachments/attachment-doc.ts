import type { RichTextContent } from '../../lib/api'

/**
 * The two node types a description uses to point at an attachment: a block
 * image and an inline chip. Both carry only an id, resolved at render time --
 * a stored URL would go stale and would tie the document to one backend.
 */
export const ATTACHMENT_IMAGE_NODE = 'attachmentImage'
export const ATTACHMENT_LINK_NODE = 'attachmentLink'

const REFERENCE_NODES = new Set<string>([ATTACHMENT_IMAGE_NODE, ATTACHMENT_LINK_NODE])

type DocNode = { type?: string; attrs?: Record<string, unknown>; content?: unknown }

function isNode(value: unknown): value is DocNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function referencedId(node: DocNode): number | null {
  if (!node.type || !REFERENCE_NODES.has(node.type)) return null
  const id = node.attrs?.attachmentId
  return typeof id === 'number' ? id : null
}

/**
 * Every attachment id a document references, in document order. Explicit
 * stack, like the server's walk in `apps/attachments/services.py`.
 */
export function extractAttachmentIds(content: RichTextContent | null | undefined): number[] {
  const found: number[] = []
  const seen = new Set<number>()
  const stack: unknown[] = [content]

  while (stack.length) {
    const current = stack.pop()
    if (Array.isArray(current)) {
      stack.push(...current)
      continue
    }
    if (!isNode(current)) continue

    const id = referencedId(current)
    if (id !== null && !seen.has(id)) {
      seen.add(id)
      found.push(id)
    }
    if (Array.isArray(current.content)) stack.push(...[...current.content].reverse())
  }

  return found
}

/**
 * A copy of the document with the named attachments no longer referenced, for
 * when a file is deleted from the strip while the editor is open.
 */
export function removeAttachmentReferences(
  content: RichTextContent,
  removedIds: Iterable<number>,
): RichTextContent {
  const removed = new Set(removedIds)
  if (!removed.size) return content

  const strip = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(strip)
    if (!isNode(value)) return value
    if (!Array.isArray(value.content)) return { ...value }
    return {
      ...value,
      content: value.content
        .filter((child) => {
          if (!isNode(child)) return true
          const id = referencedId(child)
          return id === null || !removed.has(id)
        })
        .map(strip),
    }
  }

  return strip(content) as RichTextContent
}

/** Whether a document holds nothing but empty paragraphs. */
export function isEmptyDocument(content: RichTextContent | null | undefined): boolean {
  if (!content) return true
  if (extractAttachmentIds(content).length) return false
  const text = JSON.stringify(content).match(/"text":"((?:[^"\\]|\\.)*)"/g) ?? []
  return text.every((match) => match.slice(8, -1).trim() === '')
}
