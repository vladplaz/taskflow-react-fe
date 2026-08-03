import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createTask,
  createTaskComment,
  deleteTaskComment,
  getTask,
  getTaskActivityBatch,
  getTasks,
  moveTask,
  updateTask,
  updateTaskComment,
} from '../../lib/api'
import type { Paginated, TaskActivity, TaskPriority } from '../../lib/api'
import type { RichTextContent } from '../../lib/api'

export const tasksQueryKey = (workspaceId: number, listId?: number) =>
  listId === undefined ? (['tasks', workspaceId] as const) : (['tasks', workspaceId, listId] as const)

export function useTasks(workspaceId: number, listId: number, enabled = true) {
  return useQuery({
    queryKey: tasksQueryKey(workspaceId, listId),
    queryFn: () => getTasks(workspaceId, listId),
    enabled,
  })
}

export function useCreateTask(workspaceId: number, listId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: {
      title: string
      description: RichTextContent
      priority: TaskPriority | null
      assignee_membership_ids: number[]
      status_id: number | null
      label_ids: number[]
    }) => createTask(workspaceId, listId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId) }),
  })
}

export function useMoveTask(workspaceId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      targetListId,
      beforeTaskId,
    }: {
      taskId: number
      targetListId: number
      beforeTaskId?: number
    }) =>
      moveTask(workspaceId, taskId, {
        target_list_id: targetListId,
        ...(beforeTaskId ? { before_task_id: beforeTaskId } : {}),
      }),
    onSuccess: (_task, variables) => {
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: ['task-activity', workspaceId, variables.taskId] })
    },
  })
}

export function useTask(workspaceId: number, taskId: number, enabled = true) {
  return useQuery({
    queryKey: ['task', workspaceId, taskId],
    queryFn: () => getTask(workspaceId, taskId),
    enabled,
  })
}

/** How much history a card opens with, and how much each "show more" adds. */
export const TASK_ACTIVITY_FIRST_BATCH = 5
export const TASK_ACTIVITY_BATCH = 10

/** `undefined` ends the pagination -- React Query reads it as "no next page". */
export function nextTaskActivityBatch(lastPage: Paginated<TaskActivity>, loadedCount: number) {
  return lastPage.hasMore ? { limit: TASK_ACTIVITY_BATCH, offset: loadedCount } : undefined
}

export function useTaskActivity(workspaceId: number, taskId: number, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['task-activity', workspaceId, taskId],
    queryFn: ({ pageParam }) => getTaskActivityBatch(workspaceId, taskId, pageParam),
    initialPageParam: { limit: TASK_ACTIVITY_FIRST_BATCH, offset: 0 },
    getNextPageParam: (lastPage, loadedPages) =>
      nextTaskActivityBatch(
        lastPage,
        loadedPages.reduce((count, page) => count + page.items.length, 0),
      ),
    enabled,
  })
}

function useActivityMutation(workspaceId: number, taskId: number) {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['task-activity', workspaceId, taskId] })
}

export function useCreateTaskComment(workspaceId: number, taskId: number) {
  const invalidate = useActivityMutation(workspaceId, taskId)
  return useMutation({
    mutationFn: ({
      body,
      mentionUserIds,
      attachmentIds = [],
    }: {
      body: string
      mentionUserIds: number[]
      /** Already uploaded; posting is what claims them. */
      attachmentIds?: number[]
    }) => createTaskComment(workspaceId, taskId, body, mentionUserIds, attachmentIds),
    onSuccess: invalidate,
  })
}

export function useUpdateTaskComment(workspaceId: number, taskId: number) {
  const invalidate = useActivityMutation(workspaceId, taskId)
  return useMutation({
    mutationFn: ({
      commentId,
      body,
      mentionUserIds,
    }: {
      commentId: number
      body: string
      mentionUserIds: number[]
    }) => updateTaskComment(workspaceId, commentId, body, mentionUserIds),
    onSuccess: invalidate,
  })
}

export function useDeleteTaskComment(workspaceId: number, taskId: number) {
  const invalidate = useActivityMutation(workspaceId, taskId)
  return useMutation({
    mutationFn: (commentId: number) => deleteTaskComment(workspaceId, commentId),
    onSuccess: invalidate,
  })
}

export function useUpdateTask(workspaceId: number, taskId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      title: string
      description: RichTextContent
      priority: TaskPriority | null
      assignee_membership_ids: number[]
      status_id: number | null
      label_ids: number[]
    }) => updateTask(workspaceId, taskId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', workspaceId, taskId] })
      queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId) })
      queryClient.invalidateQueries({ queryKey: ['task-activity', workspaceId, taskId] })
    },
  })
}
