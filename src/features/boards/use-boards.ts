import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createBoard,
  createBoardLabel,
  createBoardList,
  createBoardStatus,
  deleteBoardStatus,
  deleteBoardLabel,
  getBoardInvitations,
  getBoardLists,
  getBoardLabels,
  getBoardMembers,
  getBoardStatuses,
  getBoards,
  getMyBoards,
  inviteToBoard,
  moveBoardList,
  removeBoardMember,
  resendBoardInvitation,
  updateBoard,
  updateBoardList,
  updateBoardMember,
  updateBoardStatus,
  updateBoardLabel,
} from '../../lib/api'
import { tasksQueryKey } from '../tasks/use-tasks'

export const boardsQueryKey = (workspaceId: number) => ['boards', workspaceId] as const
export const myBoardsQueryKey = ['boards', 'mine'] as const
export const boardListsQueryKey = (workspaceId: number, boardId: number) =>
  ['board-lists', workspaceId, boardId] as const

export function useBoards(workspaceId: number | null) {
  return useQuery({
    queryKey: boardsQueryKey(workspaceId ?? 0),
    queryFn: () => getBoards(workspaceId!),
    enabled: workspaceId !== null,
  })
}

export function useMyBoards() {
  return useQuery({
    queryKey: myBoardsQueryKey,
    queryFn: getMyBoards,
  })
}

export function useCreateBoard(workspaceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: { name: string; description: string; visibility: 'private' | 'workspace' }) =>
      createBoard(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardsQueryKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: myBoardsQueryKey })
    },
  })
}

export function useUpdateBoard(workspaceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      boardId,
      ...payload
    }: {
      boardId: number
      name?: string
      visibility?: 'private' | 'workspace'
    }) => updateBoard(workspaceId, boardId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardsQueryKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: myBoardsQueryKey })
    },
  })
}

export function useBoardLists(workspaceId: number, boardId: number, enabled = true) {
  return useQuery({
    queryKey: boardListsQueryKey(workspaceId, boardId),
    queryFn: () => getBoardLists(workspaceId, boardId),
    enabled,
  })
}

export function useCreateBoardList(workspaceId: number, boardId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (name: string) => createBoardList(workspaceId, boardId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardListsQueryKey(workspaceId, boardId) }),
  })
}

export function useUpdateBoardList(workspaceId: number, boardId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, name }: { listId: number; name: string }) =>
      updateBoardList(workspaceId, boardId, listId, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardListsQueryKey(workspaceId, boardId) }),
  })
}

export function useMoveBoardList(workspaceId: number, boardId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listId, beforeListId }: { listId: number; beforeListId?: number }) =>
      moveBoardList(workspaceId, boardId, listId, beforeListId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardListsQueryKey(workspaceId, boardId) }),
  })
}

export const boardStatusesQueryKey = (workspaceId: number, boardId: number) =>
  ['board-statuses', workspaceId, boardId] as const

export function useBoardStatuses(workspaceId: number, boardId: number, enabled = true) {
  return useQuery({
    queryKey: boardStatusesQueryKey(workspaceId, boardId),
    queryFn: () => getBoardStatuses(workspaceId, boardId),
    enabled,
  })
}

export function useStatusActions(workspaceId: number, boardId: number) {
  const client = useQueryClient()
  const invalidate = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: boardStatusesQueryKey(workspaceId, boardId) }),
      client.invalidateQueries({ queryKey: tasksQueryKey(workspaceId) }),
    ])

  return {
    create: useMutation({
      mutationFn: (name: string) => createBoardStatus(workspaceId, boardId, name),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, name }: { id: number; name: string }) =>
        updateBoardStatus(workspaceId, boardId, id, name),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => deleteBoardStatus(workspaceId, boardId, id),
      onSuccess: invalidate,
    }),
  }
}

export const boardLabelsQueryKey = (workspaceId: number, boardId: number) =>
  ['board-labels', workspaceId, boardId] as const

export function useBoardLabels(workspaceId: number, boardId: number, enabled = true) {
  return useQuery({
    queryKey: boardLabelsQueryKey(workspaceId, boardId),
    queryFn: () => getBoardLabels(workspaceId, boardId),
    enabled,
  })
}

export function useLabelActions(workspaceId: number, boardId: number) {
  const client = useQueryClient()
  const invalidate = () =>
    Promise.all([
      client.invalidateQueries({ queryKey: boardLabelsQueryKey(workspaceId, boardId) }),
      client.invalidateQueries({ queryKey: tasksQueryKey(workspaceId) }),
    ])

  return {
    create: useMutation({
      mutationFn: (payload: { name: string; color: string }) =>
        createBoardLabel(workspaceId, boardId, payload),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, ...payload }: { id: number; name: string; color: string }) =>
        updateBoardLabel(workspaceId, boardId, id, payload),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => deleteBoardLabel(workspaceId, boardId, id),
      onSuccess: invalidate,
    }),
  }
}

export const boardMembersQueryKey = (workspaceId: number, boardId: number) =>
  ['board-members', workspaceId, boardId] as const
export const boardInvitationsQueryKey = (workspaceId: number, boardId: number) =>
  ['board-invitations', workspaceId, boardId] as const

export function useBoardMembers(workspaceId: number, boardId: number, enabled = true) {
  return useQuery({
    queryKey: boardMembersQueryKey(workspaceId, boardId),
    queryFn: () => getBoardMembers(workspaceId, boardId),
    enabled,
  })
}

export function useBoardInvitations(workspaceId: number, boardId: number, enabled = true) {
  return useQuery({
    queryKey: boardInvitationsQueryKey(workspaceId, boardId),
    queryFn: () => getBoardInvitations(workspaceId, boardId),
    enabled,
  })
}

export function useInviteToBoard(workspaceId: number, boardId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { email: string; role: 'member' | 'viewer' }) =>
      inviteToBoard(workspaceId, boardId, payload),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: boardInvitationsQueryKey(workspaceId, boardId) }),
  })
}

export function useUpdateBoardMember(workspaceId: number, boardId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ membershipId, role }: { membershipId: number; role: 'admin' | 'member' | 'viewer' }) =>
      updateBoardMember(workspaceId, boardId, membershipId, role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: boardMembersQueryKey(workspaceId, boardId) }),
  })
}

export function useRemoveBoardMember(workspaceId: number, boardId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (membershipId: number) => removeBoardMember(workspaceId, boardId, membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: boardMembersQueryKey(workspaceId, boardId) })
      queryClient.invalidateQueries({ queryKey: ['tasks', workspaceId] })
    },
  })
}

export function useResendBoardInvitation(workspaceId: number, boardId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (invitationId: number) => resendBoardInvitation(workspaceId, boardId, invitationId),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: boardInvitationsQueryKey(workspaceId, boardId) }),
  })
}
