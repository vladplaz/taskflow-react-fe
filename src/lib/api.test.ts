import { afterEach, describe, expect, it, vi } from 'vitest'

import { ApiError, getTaskActivityBatch, getCurrentUser, getWorkspaces, isUnauthenticated } from './api'

/**
 * The client has to read two backends: Django (DRF envelopes) and NestJS. Both
 * shapes are recognised at the fetch boundary, so nothing above it changes when
 * the backend does. These tests pin both dialects.
 */

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response
}

/** Answer each call with the next body, and record the URLs asked for. */
function mockFetch(...bodies: { body: unknown; status?: number }[]) {
  const urls: string[] = []
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    urls.push(String(input))
    const next = bodies.shift()
    if (!next) throw new Error('fetch called more times than the test allowed')
    return Promise.resolve(jsonResponse(next.body, next.status))
  })
  vi.stubGlobal('fetch', fetchMock)
  return urls
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isUnauthenticated', () => {
  it('covers both backends, and nothing else', () => {
    expect(isUnauthenticated(401)).toBe(true)
    expect(isUnauthenticated(403)).toBe(true)
    expect(isUnauthenticated(404)).toBe(false)
    expect(isUnauthenticated(429)).toBe(false)
    expect(isUnauthenticated(500)).toBe(false)
  })
})

describe('error bodies', () => {
  async function failWith(body: unknown, status = 400): Promise<ApiError> {
    mockFetch({ body, status })
    const error = await getCurrentUser().then(
      () => null,
      (reason: unknown) => reason,
    )
    expect(error).toBeInstanceOf(ApiError)
    return error as ApiError
  }

  it('reads a Django non-field error', async () => {
    const error = await failWith({ detail: 'This invitation is no longer pending.' }, 400)

    expect(error.message).toBe('This invitation is no longer pending')
  })

  it('reads a Django non-field error that arrived as a list', async () => {
    // `ValidationError({"detail": "..."})` renders the value wrapped in a list.
    const error = await failWith({ detail: ['The workspace owner cannot be removed.'] })

    expect(error.message).toBe('The workspace owner cannot be removed')
  })

  it('reads Django field errors', async () => {
    const error = await failWith({
      email: ['A user with this email already exists.'],
      password: ['This password is too short.'],
    })

    expect(error.message).toBe('A user with this email already exists')
    expect(error.fields).toEqual({
      email: ['A user with this email already exists'],
      password: ['This password is too short'],
    })
  })

  it('reads a NestJS exception body', async () => {
    const error = await failWith({ statusCode: 403, message: 'Forbidden resource', error: 'Forbidden' }, 403)

    expect(error.status).toBe(403)
    expect(error.message).toBe('Forbidden resource')
    // `error` and `statusCode` describe the failure; neither names a field.
    expect(error.fields).toEqual({})
  })

  it('reads NestJS field errors out of `errors`', async () => {
    const error = await failWith({
      statusCode: 400,
      message: 'Validation failed',
      errors: { email: ['A user with this email already exists.'] },
    })

    // The field message, not the summary: it is the one that says what to fix.
    expect(error.message).toBe('A user with this email already exists')
    expect(error.fields).toEqual({ email: ['A user with this email already exists'] })
  })

  it('falls back when the body is not something it recognises', async () => {
    const error = await failWith(null, 500)

    expect(error.message).toBe('Something went wrong. Please try again')
  })
})

describe('paginated lists', () => {
  it('follows Django page links to the end', async () => {
    const urls = mockFetch(
      {
        body: {
          count: 2,
          next: 'http://localhost:8000/api/v1/workspaces/?page=2',
          previous: null,
          results: [{ id: 1 }],
        },
      },
      { body: { count: 2, next: null, previous: null, results: [{ id: 2 }] } },
    )

    await expect(getWorkspaces()).resolves.toEqual([{ id: 1 }, { id: 2 }])
    expect(urls).toEqual([
      'http://localhost:8000/api/v1/workspaces/',
      'http://localhost:8000/api/v1/workspaces/?page=2',
    ])
  })

  it('asks NestJS for the next page by number', async () => {
    const urls = mockFetch(
      { body: { items: [{ id: 1 }], total: 2, page: 1, page_size: 1 } },
      { body: { items: [{ id: 2 }], total: 2, page: 2, page_size: 1 } },
    )

    await expect(getWorkspaces()).resolves.toEqual([{ id: 1 }, { id: 2 }])
    expect(urls).toEqual([
      'http://localhost:8000/api/v1/workspaces/',
      'http://localhost:8000/api/v1/workspaces/?page=2',
    ])
  })

  it('stops on an empty page even when the total disagrees', async () => {
    // A miscounted total would otherwise page forever.
    mockFetch({ body: { items: [], total: 99, page: 1, page_size: 50 } })

    await expect(getWorkspaces()).resolves.toEqual([])
  })

  it('normalizes an offset batch from either backend', async () => {
    mockFetch({ body: { count: 34, next: 'http://api/next', previous: null, results: [{ id: 1 }] } })
    await expect(getTaskActivityBatch(1, 2, { limit: 5, offset: 0 })).resolves.toMatchObject({
      items: [{ id: 1 }],
      total: 34,
      hasMore: true,
    })

    vi.unstubAllGlobals()

    mockFetch({ body: { items: [{ id: 1 }], total: 34, limit: 5, offset: 0 } })
    await expect(getTaskActivityBatch(1, 2, { limit: 5, offset: 0 })).resolves.toMatchObject({
      items: [{ id: 1 }],
      total: 34,
      hasMore: true,
    })
  })

  it('ends an offset walk on the last batch', async () => {
    mockFetch({ body: { items: [{ id: 1 }], total: 6, limit: 5, offset: 5 } })

    await expect(getTaskActivityBatch(1, 2, { limit: 5, offset: 5 })).resolves.toMatchObject({
      hasMore: false,
    })
  })
})
