import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  acceptBoardInvitation,
  acceptWorkspaceInvitation,
  getMyBoardInvitations,
  getMyWorkspaceInvitations,
  getPublicBoardInvitation,
  getPublicWorkspaceInvitation,
  getWorkspaceInvitations,
  inviteToWorkspace,
  rejectBoardInvitation,
  rejectWorkspaceInvitation,
  removeWorkspaceMember,
  resendWorkspaceInvitation,
} from '../../lib/api'
import { myBoardsQueryKey } from '../boards/use-boards'
import { workspaceMembersQueryKey, workspaceQueryKey } from '../workspaces/use-workspaces'

export const myInvitationsQueryKey = ['workspace-invitations', 'mine'] as const
export const myBoardInvitationsQueryKey = ['board-invitations', 'mine'] as const
export const workspaceInvitationsQueryKey = (workspaceId: number) =>
  ['workspace-invitations', workspaceId] as const

export function useWorkspaceInvitations(workspaceId: number, enabled = true) {
  return useQuery({
    queryKey: workspaceInvitationsQueryKey(workspaceId),
    queryFn: () => getWorkspaceInvitations(workspaceId),
    enabled,
  })
}

export function useInviteToWorkspace(workspaceId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => inviteToWorkspace(workspaceId, email),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceInvitationsQueryKey(workspaceId) }),
  })
}

export function useResendWorkspaceInvitation(workspaceId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: number) => resendWorkspaceInvitation(workspaceId, invitationId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workspaceInvitationsQueryKey(workspaceId) }),
  })
}

export function useRemoveWorkspaceMember(workspaceId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (membershipId: number) => removeWorkspaceMember(workspaceId, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceMembersQueryKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useMyWorkspaceInvitations() {
  return useQuery({
    queryKey: myInvitationsQueryKey,
    queryFn: getMyWorkspaceInvitations,
  })
}

export function useMyBoardInvitations() {
  return useQuery({
    queryKey: myBoardInvitationsQueryKey,
    queryFn: getMyBoardInvitations,
  })
}

export function useRespondToWorkspaceInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invitationId, response }: { invitationId: number; response: 'accept' | 'reject' }) =>
      response === 'accept'
        ? acceptWorkspaceInvitation(invitationId)
        : rejectWorkspaceInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myInvitationsQueryKey })
      queryClient.invalidateQueries({ queryKey: workspaceQueryKey })
    },
  })
}

export function useRespondToBoardInvitation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ invitationId, response }: { invitationId: number; response: 'accept' | 'reject' }) =>
      response === 'accept' ? acceptBoardInvitation(invitationId) : rejectBoardInvitation(invitationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: myBoardInvitationsQueryKey })
      queryClient.invalidateQueries({ queryKey: myBoardsQueryKey })
    },
  })
}

export function usePublicWorkspaceInvitation(token: string | null) {
  return useQuery({
    queryKey: ['workspace-invitation-link', token],
    queryFn: () => getPublicWorkspaceInvitation(token!),
    enabled: Boolean(token),
    retry: false,
  })
}

export function usePublicBoardInvitation(token: string | null) {
  return useQuery({
    queryKey: ['board-invitation-link', token],
    queryFn: () => getPublicBoardInvitation(token!),
    enabled: Boolean(token),
    retry: false,
  })
}
