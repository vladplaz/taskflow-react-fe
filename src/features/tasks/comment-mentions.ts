import type { TaskActivity } from '../../lib/api'

export type CommentMention = TaskActivity['comment_mentions'][number]

/** One run of comment text: either plain prose or a resolved `@mention`. */
export type CommentSegment = { text: string; mention: CommentMention | null }

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Split a comment body into plain runs and `@mention` runs.
 *
 * Longest name first: alternation is leftmost-first, so `@(?:Al|Alice)` would
 * match `@Al` inside `@Alice` and link the wrong person. And no names means no
 * pattern -- an empty alternation is `@(?:)`, which matches a bare `@`.
 */
export function splitCommentBody(body: string, mentions: CommentMention[]): CommentSegment[] {
  if (!mentions.length) return [{ text: body, mention: null }]

  const byText = new Map(mentions.map((mention) => [`@${mention.display_name}`, mention]))
  const names = [...mentions]
    .sort((a, b) => b.display_name.length - a.display_name.length)
    .map((mention) => escapeRegExp(mention.display_name))
  const pattern = new RegExp(`(@(?:${names.join('|')}))`, 'g')

  return body
    .split(pattern)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, mention: byText.get(part) ?? null }))
}
