import { describe, expect, it } from 'vitest'

import { splitCommentBody } from './comment-mentions'

const al = { user_id: 3, display_name: 'Al' }
const alice = { user_id: 1, display_name: 'Alice' }

/** The rendered result: mention runs marked with the user they link to. */
function render(body: string, mentions: { user_id: number; display_name: string }[]) {
  return splitCommentBody(body, mentions)
    .map((segment) => (segment.mention ? `[${segment.text}->${segment.mention.user_id}]` : segment.text))
    .join('')
}

describe('splitCommentBody', () => {
  it('links a mention to its author', () => {
    expect(render('Ping @Alice about the release', [alice])).toBe('Ping [@Alice->1] about the release')
  })

  it('does not let a shorter name swallow the start of a longer one', () => {
    // Alternation is leftmost-first, so @Al would match inside @Alice.
    expect(render('@Al and @Alice please review', [al, alice])).toBe('[@Al->3] and [@Alice->1] please review')
  })

  it('is order-independent', () => {
    expect(render('@Alice and @Al please review', [alice, al])).toBe('[@Alice->1] and [@Al->3] please review')
  })

  it('leaves a body with no mentions completely alone', () => {
    // An empty alternation compiles to @(?:), which matches a bare @.
    expect(splitCommentBody('mail me at a@b.example', [])).toEqual([
      { text: 'mail me at a@b.example', mention: null },
    ])
  })

  it('treats a name that is not mentioned as ordinary text', () => {
    expect(render('@Bob is not on this card', [alice])).toBe('@Bob is not on this card')
  })

  it('handles a display name containing regex metacharacters', () => {
    const odd = { user_id: 7, display_name: 'a.b*c' }
    expect(render('hi @a.b*c bye', [odd])).toBe('hi [@a.b*c->7] bye')
    expect(render('hi @axbyc bye', [odd])).toBe('hi @axbyc bye')
  })

  it('links every occurrence of the same mention', () => {
    expect(render('@Al @Al', [al])).toBe('[@Al->3] [@Al->3]')
  })
})
