import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { getWebSocketUrl } from '../../lib/api'
import { boardListsQueryKey } from '../boards/use-boards'
import { tasksQueryKey } from '../tasks/use-tasks'

type TaskEventType =
  | 'task.archived'
  | 'task.comment_created'
  | 'task.comment_deleted'
  | 'task.comment_updated'
  | 'task.created'
  | 'task.moved'
  | 'task.restored'
  | 'task.updated'

type ListEventType = 'list.archived' | 'list.created' | 'list.moved' | 'list.restored' | 'list.updated'

type BoardEvent = {
  type: 'task.event'
  event_type: TaskEventType | ListEventType
  workspace_id: number
  board_id: number
  list_id: number
  /** Null on list events, which are about the column rather than a card. */
  task_id: number | null
}

export function useWorkspaceTaskEvents(workspaceId: number, boardId: number) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (
      !Number.isSafeInteger(workspaceId) ||
      workspaceId < 1 ||
      !Number.isSafeInteger(boardId) ||
      boardId < 1
    )
      return

    let socket: WebSocket | null = null
    let reconnectTimer: number | undefined
    let isDisposed = false
    let reconnectAttempt = 0

    function connect() {
      socket = new WebSocket(getWebSocketUrl(`/ws/workspaces/${workspaceId}/boards/${boardId}/tasks/`))

      socket.addEventListener('open', () => {
        reconnectAttempt = 0
      })
      socket.addEventListener('message', (message) => {
        let event: BoardEvent
        try {
          event = JSON.parse(message.data) as BoardEvent
        } catch {
          return
        }
        if (event.type !== 'task.event' || event.workspace_id !== workspaceId || event.board_id !== boardId)
          return

        if (event.event_type.startsWith('list.')) {
          // Archiving a column also hides its cards, so both are stale.
          void queryClient.invalidateQueries({ queryKey: boardListsQueryKey(workspaceId, boardId) })
          void queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId) })
          return
        }

        if (event.event_type === 'task.moved') {
          void queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId) })
        } else if (!event.event_type.startsWith('task.comment_')) {
          void queryClient.invalidateQueries({ queryKey: tasksQueryKey(workspaceId, event.list_id) })
        }

        void queryClient.invalidateQueries({ queryKey: ['task', workspaceId, event.task_id] })
        void queryClient.invalidateQueries({ queryKey: ['task-activity', workspaceId, event.task_id] })
      })
      socket.addEventListener('close', (event) => {
        if (isDisposed || event.code === 4401 || event.code === 4403) return
        const delay = Math.min(1_000 * 2 ** reconnectAttempt, 15_000)
        reconnectAttempt += 1
        reconnectTimer = window.setTimeout(connect, delay)
      })
    }

    connect()
    return () => {
      isDisposed = true
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [boardId, queryClient, workspaceId])
}
