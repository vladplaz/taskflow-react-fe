import { describe, expect, it } from 'vitest'

import { getBoardRouteState } from './board-route-state'

const validRoute = {
  hasValidBoardRoute: true,
  hasValidTaskRoute: true,
}

describe('getBoardRouteState', () => {
  it('keeps loading while a missing board is being fetched over cached workspace data', () => {
    expect(
      getBoardRouteState({
        ...validRoute,
        hasBoard: false,
        isBoardsPending: false,
        isBoardsFetching: true,
      }),
    ).toBe('loading')
  })

  it('shows not found only after a valid route finishes without the board', () => {
    expect(
      getBoardRouteState({
        ...validRoute,
        hasBoard: false,
        isBoardsPending: false,
        isBoardsFetching: false,
      }),
    ).toBe('not-found')
  })

  it('keeps an existing board ready during a background refresh', () => {
    expect(
      getBoardRouteState({
        ...validRoute,
        hasBoard: true,
        isBoardsPending: false,
        isBoardsFetching: true,
      }),
    ).toBe('ready')
  })

  it('rejects malformed board and nested task routes immediately', () => {
    expect(
      getBoardRouteState({
        ...validRoute,
        hasValidTaskRoute: false,
        hasBoard: false,
        isBoardsPending: true,
        isBoardsFetching: true,
      }),
    ).toBe('not-found')
  })
})
