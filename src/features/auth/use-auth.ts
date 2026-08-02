import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { login, logout, register, restoreSession, updateMyProfile } from '../../lib/api'
import type { User } from '../../lib/api'

export const currentUserQueryKey = ['auth', 'current-user'] as const

export function useAuthSession() {
  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: restoreSession,
    staleTime: Infinity,
    retry: false,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => login(email, password),
    onSuccess: (user) => {
      const previousUser = queryClient.getQueryData<User | null>(currentUserQueryKey)
      if (previousUser?.id !== user.id) {
        queryClient.removeQueries({
          predicate: (query) => query.queryKey[0] !== currentUserQueryKey[0],
        })
      }
      queryClient.setQueryData(currentUserQueryKey, user)
    },
  })
}

export function useRegister() {
  return useMutation({ mutationFn: register })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      queryClient.removeQueries({
        predicate: (query) => query.queryKey[0] !== currentUserQueryKey[0],
      })
      queryClient.setQueryData(currentUserQueryKey, null)
    },
  })
}

export function useUpdateMyProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (displayName: string) => updateMyProfile(displayName),
    onSuccess: (user) => queryClient.setQueryData(currentUserQueryKey, user),
  })
}
