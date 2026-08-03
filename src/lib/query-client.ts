import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

import { ApiError, isUnauthenticated } from './api'
import { currentUserQueryKey } from '../features/auth/use-auth'

/**
 * Give up on anything the server answered deliberately: 401, 403 and 404 are
 * how this API says "not signed in", "not yours", and "gone".
 */
export function shouldRetry(failureCount: number, error: unknown) {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

/**
 * Notice when the session has gone out from under us. A 403 is either an
 * expired session or a genuine denial; re-running the session query is what
 * tells them apart, and drops the app to sign-in when it is the former. A 401
 * is only ever the first, and costs the same one request to confirm.
 */
function revalidateSessionOnAuthError(client: QueryClient, error: unknown, queryKey?: readonly unknown[]) {
  if (!(error instanceof ApiError) || !isUnauthenticated(error.status)) return
  if (queryKey?.[0] === currentUserQueryKey[0]) return
  void client.invalidateQueries({ queryKey: currentUserQueryKey })
}

export function createQueryClient() {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: shouldRetry,
      },
      mutations: {
        retry: shouldRetry,
      },
    },
    queryCache: new QueryCache({
      onError: (error, query) => revalidateSessionOnAuthError(client, error, query.queryKey),
    }),
    mutationCache: new MutationCache({
      onError: (error) => revalidateSessionOnAuthError(client, error),
    }),
  })
  return client
}
