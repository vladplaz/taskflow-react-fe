export type BoardRouteState = 'loading' | 'ready' | 'not-found'

type BoardRouteStateInput = {
  hasValidBoardRoute: boolean
  hasValidTaskRoute: boolean
  hasBoard: boolean
  isBoardsPending: boolean
  isBoardsFetching: boolean
}

export function getBoardRouteState({
  hasValidBoardRoute,
  hasValidTaskRoute,
  hasBoard,
  isBoardsPending,
  isBoardsFetching,
}: BoardRouteStateInput): BoardRouteState {
  if (!hasValidBoardRoute || !hasValidTaskRoute) return 'not-found'
  if (hasBoard) return 'ready'
  if (isBoardsPending || isBoardsFetching) return 'loading'
  return 'not-found'
}
