import { EditorContent, NodeViewWrapper, ReactNodeViewRenderer, useEditor } from '@tiptap/react'
import type { ReactNodeViewProps } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { createContext, use, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { Extension, Node } from '@tiptap/core'
import type { Editor } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Bold, Code2, FileCode2, Italic, List, ListOrdered, Paperclip } from 'lucide-react'

import {
  ATTACHMENT_IMAGE_NODE,
  ATTACHMENT_LINK_NODE,
  removeAttachmentReferences,
} from '../../features/attachments/attachment-doc'
import { attachmentKind, filesFromDataTransfer } from '../../features/attachments/attachment-kinds'
import { useUploadAttachments } from '../../features/attachments/use-attachments'
import { attachmentSrc } from '../../lib/api'
import type { Attachment } from '../../lib/api'
import { AttachmentChip } from '../attachments/attachment-tile'
import { Button } from '../ui/button'

export type RichTextContent = Record<string, unknown>

export type RichTextEditorHandle = {
  /** Drop any inline reference to a file that was deleted from the strip. */
  removeAttachment: (attachmentId: number) => void
}

const emptyDocument: RichTextContent = { type: 'doc', content: [{ type: 'paragraph' }] }

/**
 * Resolves the ids stored in the document to the files they name. Node views
 * sit inside TipTap's own React tree, out of reach of props.
 */
const AttachmentResolverContext = createContext<{
  attachments: Attachment[]
  onOpen: (attachmentId: number) => void
}>({ attachments: [], onOpen: () => {} })

function useResolvedAttachment(attachmentId: number | null) {
  const { attachments, onOpen } = use(AttachmentResolverContext)
  return {
    attachment: attachments.find((item) => item.id === attachmentId) ?? null,
    onOpen: () => attachmentId !== null && onOpen(attachmentId),
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize || null,
            renderHTML: (attributes) =>
              attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {},
          },
        },
      },
    ]
  },
})

/** Shared wiring for the two reference nodes: one attribute, stored as data. */
function attachmentNodeAttributes() {
  return {
    attachmentId: {
      default: null as number | null,
      parseHTML: (element: HTMLElement) => {
        const value = Number(element.getAttribute('data-attachment-id'))
        return Number.isInteger(value) ? value : null
      },
      renderHTML: (attributes: Record<string, unknown>) =>
        attributes.attachmentId === null ? {} : { 'data-attachment-id': attributes.attachmentId },
    },
  }
}

/** A photo, shown where it was pasted. */
const AttachmentImage = Node.create({
  name: ATTACHMENT_IMAGE_NODE,
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: attachmentNodeAttributes,
  parseHTML: () => [{ tag: 'figure[data-attachment-image]' }],
  renderHTML: ({ HTMLAttributes }) => ['figure', { 'data-attachment-image': '', ...HTMLAttributes }],
  addNodeView: () => ReactNodeViewRenderer(AttachmentImageView),
})

/** A file chip that flows inside a sentence, rather than breaking it. */
const AttachmentLink = Node.create({
  name: ATTACHMENT_LINK_NODE,
  group: 'inline',
  inline: true,
  atom: true,
  draggable: true,
  selectable: true,
  addAttributes: attachmentNodeAttributes,
  parseHTML: () => [{ tag: 'span[data-attachment-link]' }],
  renderHTML: ({ HTMLAttributes }) => ['span', { 'data-attachment-link': '', ...HTMLAttributes }],
  addNodeView: () => ReactNodeViewRenderer(AttachmentLinkView, { as: 'span' }),
})

/** The node's own attribute, narrowed: ProseMirror types `attrs` as unknown. */
function attachmentIdOf(node: ReactNodeViewProps['node']): number | null {
  const id: unknown = node.attrs.attachmentId
  return typeof id === 'number' ? id : null
}

function AttachmentImageView({ node }: ReactNodeViewProps) {
  const { attachment, onOpen } = useResolvedAttachment(attachmentIdOf(node))

  return (
    <NodeViewWrapper className="my-3" data-drag-handle>
      {attachment ? (
        <button
          className="block cursor-zoom-in overflow-hidden rounded-lg border"
          contentEditable={false}
          onClick={onOpen}
          title={`Open ${attachment.original_name}`}
          type="button"
        >
          <img
            alt={attachment.original_name}
            className="max-h-96 w-auto max-w-full object-contain"
            src={attachmentSrc(attachment, attachment.thumbnail_url ? { variant: 'thumb' } : {})}
          />
        </button>
      ) : (
        <RemovedFile />
      )}
    </NodeViewWrapper>
  )
}

function AttachmentLinkView({ node }: ReactNodeViewProps) {
  const { attachment, onOpen } = useResolvedAttachment(attachmentIdOf(node))

  return (
    <NodeViewWrapper as="span" className="mx-0.5" data-drag-handle>
      <span contentEditable={false}>
        {attachment ? <AttachmentChip attachment={attachment} onOpen={onOpen} /> : <RemovedFile inline />}
      </span>
    </NodeViewWrapper>
  )
}

/**
 * Stands in for an id that no longer resolves -- a collaborator deleted the
 * file in another session. The server drops the reference on the next save.
 */
function RemovedFile({ inline = false }: { inline?: boolean }) {
  const Tag = inline ? 'span' : 'div'
  return (
    <Tag
      className={`inline-flex items-center gap-1.5 rounded-lg border border-dashed px-2 py-1 text-xs text-muted-foreground ${inline ? '' : 'my-2'}`}
      contentEditable={false}
    >
      <Paperclip className="size-3.5" /> File removed
    </Tag>
  )
}

export function RichTextEditor({
  attachments,
  editable = true,
  onChange,
  onOpenAttachment,
  ref,
  taskId,
  value,
  workspaceId,
}: {
  attachments: Attachment[]
  editable?: boolean
  onChange: (content: RichTextContent) => void
  onOpenAttachment: (attachmentId: number) => void
  ref?: RefObject<RichTextEditorHandle | null>
  taskId: number
  value: RichTextContent
  workspaceId: number
}) {
  const { upload, pending, error, clearError } = useUploadAttachments(workspaceId, taskId)
  // `editorProps` closes over its config at creation, and its handlers get a
  // ProseMirror view rather than the TipTap editor.
  const editorRef = useRef<Editor | null>(null)
  // Typing round-trips through the parent, so this tells "my own change coming
  // back" apart from "somebody else's document arriving".
  const lastEmittedRef = useRef<RichTextContent | null>(null)

  /** Upload, then place each file where it was dropped. */
  const insertFiles = useCallback(
    (files: File[], at: number) => {
      let position = at
      void upload(files, (attachment) => {
        const editor = editorRef.current
        if (!editor) return
        const isImage = attachmentKind(attachment.content_type) === 'image' && attachment.can_preview
        const target = Math.min(position, editor.state.doc.content.size)
        editor
          .chain()
          .focus()
          .insertContentAt(
            target,
            isImage
              ? { type: ATTACHMENT_IMAGE_NODE, attrs: { attachmentId: attachment.id } }
              : [
                  { type: ATTACHMENT_LINK_NODE, attrs: { attachmentId: attachment.id } },
                  { type: 'text', text: ' ' },
                ],
          )
          .run()
        // Keeps a batch in the order it was dropped.
        position = editor.state.selection.to
      })
    },
    [upload],
  )

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      FontSize,
      AttachmentImage,
      AttachmentLink,
      Placeholder.configure({ placeholder: 'Add description…' }),
    ],
    content: Object.keys(value).length ? value : emptyDocument,
    editable,
    editorProps: {
      attributes: {
        class:
          'min-h-72 px-4 py-3 leading-6 outline-none prose prose-sm max-w-none dark:prose-invert prose-pre:bg-zinc-950 prose-pre:text-zinc-100 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1 [&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground/70 [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)]',
      },
      handlePaste: (view, event) => {
        if (!editable) return false
        const files = filesFromDataTransfer(event.clipboardData)
        // Text and HTML pastes stay with TipTap's own handling.
        if (!files.length) return false
        event.preventDefault()
        insertFiles(files, view.state.selection.from)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        // `moved` is a node being dragged within the document, not a new file.
        if (!editable || moved) return false
        const files = filesFromDataTransfer(event.dataTransfer)
        if (!files.length) return false
        event.preventDefault()
        const dropped = view.posAtCoords({ left: event.clientX, top: event.clientY })
        insertFiles(files, dropped?.pos ?? view.state.selection.from)
        return true
      },
    },
    onUpdate: ({ editor: nextEditor }) => {
      const document = nextEditor.getJSON()
      lastEmittedRef.current = document
      onChange(document)
    },
  })

  useEffect(() => {
    editorRef.current = editor ?? null
  }, [editor])

  /**
   * Take in a document written somewhere else. `content` is read once, at
   * creation, so a description saved in another window never arrives without
   * this. The identity check is the cheap path for typing; `setContent` resets
   * the selection, so anything else is compared properly first.
   */
  useEffect(() => {
    if (!editor || value === lastEmittedRef.current) return
    const next = Object.keys(value).length ? value : emptyDocument
    if (JSON.stringify(editor.getJSON()) === JSON.stringify(next)) return
    lastEmittedRef.current = value
    editor.commands.setContent(next, { emitUpdate: false })
  }, [editor, value])

  useImperativeHandle(
    ref,
    () => ({
      removeAttachment: (attachmentId: number) => {
        if (!editor) return
        const next = removeAttachmentReferences(editor.getJSON() as RichTextContent, [attachmentId])
        // `emitUpdate` so the next save no longer carries the reference.
        editor.commands.setContent(next, { emitUpdate: true })
      },
    }),
    [editor],
  )

  const resolver = useMemo(() => ({ attachments, onOpen: onOpenAttachment }), [attachments, onOpenAttachment])

  if (!editor) return <div className="min-h-72 animate-pulse rounded-lg bg-foreground/5" />

  return (
    <AttachmentResolverContext value={resolver}>
      <div className="rounded-lg bg-foreground/[0.01] transition-colors focus-within:bg-foreground/[0.02] dark:bg-white/[0.015] dark:focus-within:bg-white/[0.025]">
        {editable && (
          <BubbleMenu
            className="flex items-center gap-1 rounded-lg border bg-popover p-1 shadow-lg"
            editor={editor}
          >
            <EditorButton
              active={editor.isActive('bold')}
              icon={<Bold />}
              onClick={() => editor.chain().focus().toggleBold().run()}
            />
            <EditorButton
              active={editor.isActive('italic')}
              icon={<Italic />}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            />
            <EditorButton
              active={editor.isActive('code')}
              icon={<Code2 />}
              onClick={() => editor.chain().focus().toggleCode().run()}
            />
            <EditorButton
              active={editor.isActive('codeBlock')}
              icon={<FileCode2 />}
              onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            />
            <EditorButton
              icon={<span className="text-xs">A−</span>}
              onClick={() => editor.chain().focus().setMark('textStyle', { fontSize: '14px' }).run()}
            />
            <EditorButton
              icon={<span className="text-sm">A</span>}
              onClick={() => editor.chain().focus().setMark('textStyle', { fontSize: '18px' }).run()}
            />
            <EditorButton
              icon={<span className="text-base">A+</span>}
              onClick={() => editor.chain().focus().setMark('textStyle', { fontSize: '24px' }).run()}
            />
            <EditorButton
              active={editor.isActive('bulletList')}
              icon={<List />}
              onClick={() => editor.chain().focus().toggleBulletList().run()}
            />
            <EditorButton
              active={editor.isActive('orderedList')}
              icon={<ListOrdered />}
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
            />
          </BubbleMenu>
        )}
        <EditorContent editor={editor} />
        {(pending.length > 0 || error) && (
          <div className="border-t px-4 py-2 text-xs">
            {pending.map((upload) => (
              <p className="text-muted-foreground" key={upload.key}>
                Uploading {upload.name}… {Math.round(upload.progress * 100)}%
              </p>
            ))}
            {error && (
              <p className="flex items-start gap-2 text-destructive" role="alert">
                <span className="flex-1">{error}</span>
                <Button onClick={clearError} size="xs" type="button" variant="ghost">
                  Dismiss
                </Button>
              </p>
            )}
          </div>
        )}
      </div>
    </AttachmentResolverContext>
  )
}

function EditorButton({
  active = false,
  icon,
  onClick,
}: {
  active?: boolean
  icon: ReactNode
  onClick: () => void
}) {
  return (
    <Button
      className={active ? 'bg-muted' : ''}
      onClick={onClick}
      onMouseDown={(event) => event.preventDefault()}
      size="icon-sm"
      type="button"
      variant="ghost"
    >
      {icon}
    </Button>
  )
}
