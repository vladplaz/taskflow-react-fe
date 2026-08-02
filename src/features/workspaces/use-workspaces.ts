import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { createWorkspace, getWorkspaceMembers, getWorkspaces } from '../../lib/api'

export const workspaceQueryKey = ['workspaces'] as const
export const workspaceMembersQueryKey = (workspaceId: number) => ['workspace-members', workspaceId] as const

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceQueryKey,
    queryFn: getWorkspaces,
  })
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkspace,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceQueryKey }),
  })
}

export function useWorkspaceMembers(workspaceId: number, enabled = true) {
  return useQuery({
    queryKey: workspaceMembersQueryKey(workspaceId),
    queryFn: () => getWorkspaceMembers(workspaceId),
    enabled,
  })
}
