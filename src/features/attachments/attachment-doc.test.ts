import { describe, expect, it } from 'vitest'

import { extractAttachmentIds, isEmptyDocument, removeAttachmentReferences } from './attachment-doc'

const image = (attachmentId: number) => ({ type: 'attachmentImage', attrs: { attachmentId } })
const link = (attachmentId: number) => ({ type: 'attachmentLink', attrs: { attachmentId } })
const text = (value: string) => ({ type: 'text', text: value })
const doc = (...content: unknown[]) => ({ type: 'doc', content })

/** What the editor produces for "I have this file [x], please check". */
const sentence = (attachmentId: number) => ({
  type: 'paragraph',
  content: [text('I have this file '), link(attachmentId), text(', please check')],
})

describe('extractAttachmentIds', () => {
  it('finds references at every depth, in document order', () => {
    const content = doc(image(11), sentence(22), {
      type: 'bulletList',
      content: [{ type: 'listItem', content: [image(33)] }],
    })

    expect(extractAttachmentIds(content)).toEqual([11, 22, 33])
  })

  it('reports a repeated reference once', () => {
    expect(extractAttachmentIds(doc(image(7), sentence(7)))).toEqual([7])
  })

  it('ignores nodes that merely look similar', () => {
    // A pasted <img> is a plain image node with a remote src.
    const content = doc(
      { type: 'image', attrs: { attachmentId: 4, src: 'https://example.com/a.png' } },
      { type: 'paragraph', content: [text('attachmentId: 5')] },
    )

    expect(extractAttachmentIds(content)).toEqual([])
  })

  it('ignores an id that is not a number', () => {
    const content = doc({ type: 'attachmentImage', attrs: { attachmentId: '4 OR 1=1' } })

    expect(extractAttachmentIds(content)).toEqual([])
  })

  it('handles an empty or missing document', () => {
    expect(extractAttachmentIds(undefined)).toEqual([])
    expect(extractAttachmentIds({})).toEqual([])
  })

  it('does not recurse into a stack overflow', () => {
    let content: unknown = image(9)
    for (let depth = 0; depth < 20_000; depth += 1) {
      content = { type: 'blockquote', content: [content] }
    }

    expect(extractAttachmentIds(doc(content))).toEqual([9])
  })
})

describe('removeAttachmentReferences', () => {
  it('drops the reference and keeps the sentence around it', () => {
    const result = removeAttachmentReferences(doc(sentence(22)), [22])

    expect(result).toEqual(
      doc({ type: 'paragraph', content: [text('I have this file '), text(', please check')] }),
    )
  })

  it('removes a block image', () => {
    expect(removeAttachmentReferences(doc(image(1), sentence(2)), [1])).toEqual(doc(sentence(2)))
  })

  it('leaves the references it was not asked about', () => {
    const content = doc(image(1), image(2))

    expect(extractAttachmentIds(removeAttachmentReferences(content, [1]))).toEqual([2])
  })

  it('reaches references nested in a list', () => {
    const content = doc({ type: 'bulletList', content: [{ type: 'listItem', content: [image(3)] }] })

    expect(extractAttachmentIds(removeAttachmentReferences(content, [3]))).toEqual([])
  })

  it('returns the document untouched when nothing was removed', () => {
    const content = doc(image(1))

    expect(removeAttachmentReferences(content, [])).toBe(content)
  })

  it('does not mutate the document it was given', () => {
    const content = doc(sentence(5))
    const before = structuredClone(content)

    removeAttachmentReferences(content, [5])

    expect(content).toEqual(before)
  })
})

describe('isEmptyDocument', () => {
  it('treats a blank editor as empty', () => {
    expect(isEmptyDocument(doc({ type: 'paragraph' }))).toBe(true)
    expect(isEmptyDocument(doc({ type: 'paragraph', content: [text('   ')] }))).toBe(true)
    expect(isEmptyDocument(undefined)).toBe(true)
  })

  it('treats a lone attachment as content', () => {
    expect(isEmptyDocument(doc({ type: 'paragraph' }, image(1)))).toBe(false)
  })

  it('treats text as content', () => {
    expect(isEmptyDocument(doc({ type: 'paragraph', content: [text('Ship it')] }))).toBe(false)
  })
})
