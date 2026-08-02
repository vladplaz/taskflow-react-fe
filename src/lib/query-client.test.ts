import { describe, expect, it, vi } from 'vitest'

import { ApiError } from './api'
import { createQueryClient, shouldRetry } from './query-client'
import { currentUserQueryKey } from '../features/auth/use-auth'

describe('shouldRetry', () => {
  it('gives up on anything the server answered deliberately', () => {
    for (const status of [400, 401, 403, 404, 409, 429]) {
      expect(shouldRetry(0, new ApiError(status, 'no'))).toBe(false)
    }
  })

  it('retries server faults and dropped connections', () => {
    expect(shouldRetry(0, new ApiError(500, 'boom'))).toBe(true)
    expect(shouldRetry(0, new TypeError('Failed to fetch'))).toBe(true)
  })

  it('stops retrying eventually', () => {
    expect(shouldRetry(1, new ApiError(503, 'later'))).toBe(true)
    expect(shouldRetry(2, new ApiError(503, 'later'))).toBe(false)
  })
})

describe('session revalidation', () => {
  // `retry: false` throughout: shouldRetry is covered above, and letting the
  // real policy run would spend seconds of backoff proving nothing.
  function failing(client: ReturnType<typeof createQueryClient>, key: readonly unknown[], error: Error) {
    return client.fetchQuery({ queryKey: key, queryFn: () => Promise.reject(error), retry: false })
  }

  it('re-checks the session when a query is refused', async () => {
    const client = createQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()

    await failing(
      client,
      ['boards', 1],
      new ApiError(403, 'Authentication credentials were not provided'),
    ).catch(() => {})

    expect(invalidate).toHaveBeenCalledWith({ queryKey: currentUserQueryKey })
  })

  it('leaves the session alone for every other failure', async () => {
    const client = createQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()

    for (const error of [new ApiError(404, 'gone'), new ApiError(500, 'boom')]) {
      await failing(client, ['boards', error.status], error).catch(() => {})
    }

    expect(invalidate).not.toHaveBeenCalled()
  })

  it('does not re-check the session because the session check itself failed', async () => {
    const client = createQueryClient()
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue()

    await failing(client, currentUserQueryKey, new ApiError(403, 'no')).catch(() => {})

    expect(invalidate).not.toHaveBeenCalled()
  })
})
