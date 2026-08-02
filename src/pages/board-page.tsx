import { lazy, Suspense, useState } from 'react'
import type { DragEvent } from 'react'
import { Eye, ListFilter, LoaderCircle, Settings2 } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router'

import { AppHeader } from '../components/layout/app-header'
import { BoardColumn } from '../components/boards/board-column'
import { BoardFilters } from '../components/boards/board-filters'
import { NewListForm } from '../components/boards/new-list-form'
import { NotFoundPage } from './not-found-page'
import { Button } from '../components/ui/button'
import { InlineRename } from '../components/ui/inline-rename'
import { Skeleton } from '../components/ui/skeleton'
import { useBoardLists, useBoards, useMoveBoardList, useUpdateBoard } from '../features/boards/use-boards'
import { useMoveTask } from '../features/tasks/use-tasks'
import {
  emptyTaskFilters,
  isTaskFilterActive,
  taskFilterCount,
  toggleTaskFilter,
  type TaskFilters,
} from '../features/filters/task-filters'
import { getBoardRouteState } from '../features/boards/board-route-state'
import { useWorkspaceTaskEvents } from '../features/realtime/use-workspace-task-events'
import type { Board, Task } from '../lib/api'

const TaskModal = lazy(async () => ({ default: (await import('../components/tasks/task-modal')).TaskModal }))

export function BoardPage() {
  const { boardId: boardIdParam, taskId: taskIdParam, workspaceId: workspaceIdParam } = useParams()
  const navigate = useNavigate()
  const workspaceId = parseId(workspaceIdParam)
  const boardId = parseId(boardIdParam)
  const taskId = taskIdParam ? parseId(taskIdParam) : null
  const hasValidBoardRoute = workspaceId !== null && boardId !== null
  const hasValidTaskRoute = !taskIdParam || taskId !== null
  const boards = useBoards(workspaceId)
  const board = boards.data?.find((item) => item.id === boardId)
  const canEdit = board?.can_edit ?? false
  const lists = useBoardLists(workspaceId ?? 0, boardId ?? 0, hasValidBoardRoute)
  const moveTask = useMoveTask(workspaceId ?? 0)
  const moveBoardList = useMoveBoardList(workspaceId ?? 0, boardId ?? 0)
  useWorkspaceTaskEvents(workspaceId ?? 0, boardId ?? 0)
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [draggedListId, setDraggedListId] = useState<number | null>(null)
  const [taskPreview, setTaskPreview] = useState<{ listId: number; beforeTaskId?: number } | null>(null)
  const [listPreviewBeforeId, setListPreviewBeforeId] = useState<number | null>(null)
  const [filters, setFilters] = useState<TaskFilters>(emptyTaskFilters)
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const isMoving = moveTask.isPending || moveBoardList.isPending
  const filterCount = taskFilterCount(filters)
  function move(targetListId: number, beforeTaskId?: number) {
    if (!draggedTask || draggedTask.id === beforeTaskId) {
      setDraggedTask(null)
      setTaskPreview(null)
      return
    }
    moveTask.mutate(
      { taskId: draggedTask.id, targetListId, beforeTaskId },
      {
        onSettled: () => {
          setDraggedTask(null)
          setTaskPreview(null)
        },
      },
    )
  }
  const boardRouteState = getBoardRouteState({
    hasValidBoardRoute,
    hasValidTaskRoute,
    hasBoard: Boolean(board),
    isBoardsPending: boards.isPending,
    isBoardsFetching: boards.isFetching,
  })
  if (boardRouteState === 'not-found')
    return (
      <NotFoundPage
        description="This board was deleted, archived, or is not shared with your account."
        title="Board not found"
      />
    )
  return (
    <main className="relative flex h-screen flex-col overflow-hidden bg-[#155e75] text-zinc-950 dark:bg-[#080d1d] dark:text-zinc-50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_12%,rgba(45,212,191,0.45),transparent_28rem),radial-gradient(circle_at_88%_75%,rgba(168,85,247,0.38),transparent_32rem),linear-gradient(135deg,rgba(14,116,144,0.75),rgba(30,64,175,0.72))] dark:bg-[radial-gradient(circle_at_12%_10%,rgba(20,184,166,0.22),transparent_28rem),radial-gradient(circle_at_88%_75%,rgba(139,92,246,0.28),transparent_32rem),linear-gradient(135deg,rgba(8,47,73,0.9),rgba(30,27,75,0.92))]" />
      <AppHeader />
      <div className="relative shrink-0 border-b border-white/20 bg-slate-950/20 px-5 py-2.5 backdrop-blur-xl dark:bg-slate-950/45">
        <div className="mx-auto flex max-w-[1600px] items-center gap-4">
          <Link
            className="rounded-lg px-2 py-1 text-xs font-semibold text-white/65 hover:bg-white/10 hover:text-white"
            to="/"
          >
            ← {board?.workspace_name ?? 'My boards'}
          </Link>
          {board?.can_admin && (
            <Button
              asChild
              className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
              size="icon-sm"
              variant="outline"
            >
              <Link
                aria-label="Board settings"
                title="Board settings"
                to={`/workspaces/${workspaceId}/boards/${boardId}/settings/members`}
              >
                <Settings2 />
              </Link>
            </Button>
          )}
          <span className="h-5 w-px bg-white/20" />
          <div className="flex min-w-0 items-center gap-2">
            {boards.isPending || !board ? (
              <Skeleton className="h-8 w-44 bg-white/20" />
            ) : (
              <h1 className="min-w-0 max-w-[min(40vw,24rem)] text-lg font-bold tracking-tight text-white">
                <BoardNameEditor board={board} workspaceId={workspaceId!} />
              </h1>
            )}
            {board && !board.can_edit && (
              <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
                <Eye className="size-3.5" /> View only
              </span>
            )}
          </div>
          {isMoving && (
            <span aria-live="polite" className="flex items-center gap-1.5 text-xs font-medium text-white/75">
              <LoaderCircle className="size-3.5 animate-spin" />
              Saving order…
            </span>
          )}
          <div className="ml-auto shrink-0">
            <Button
              aria-expanded={isFiltersOpen}
              aria-label={isFiltersOpen ? 'Hide filters' : 'Show filters'}
              aria-pressed={isFiltersOpen}
              className={`relative border-white/20 text-white shadow-lg shadow-slate-950/25 backdrop-blur-xl hover:text-white ${isFiltersOpen ? 'bg-violet-500/70 hover:bg-violet-500/85' : 'bg-slate-950/45 hover:bg-slate-950/65'}`}
              onClick={() => setIsFiltersOpen((open) => !open)}
              size="icon"
              title={isFiltersOpen ? 'Hide filters' : 'Show filters'}
              variant="outline"
            >
              <ListFilter />
              {filterCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 grid size-4 place-items-center rounded-full bg-violet-500 text-[10px] font-bold text-white ring-2 ring-slate-950/50">
                  {filterCount}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
      <div
        className={`relative mx-auto flex min-h-0 w-full max-w-[1600px] flex-1 px-5 py-6 transition-[gap] duration-300 ${isFiltersOpen ? 'gap-4' : 'gap-0'}`}
      >
        <div className="min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex h-full gap-4">
            {lists.isPending ? (
              <>
                <Skeleton className="h-64 w-72 shrink-0 rounded-2xl" />
                <Skeleton className="h-64 w-72 shrink-0 rounded-2xl" />
              </>
            ) : (
              lists.data?.map((list) => (
                <div
                  key={list.id}
                  onDragEnd={() => {
                    setDraggedListId(null)
                    setListPreviewBeforeId(null)
                  }}
                  onDragOver={(event) => {
                    if (canEdit && draggedListId) {
                      event.preventDefault()
                      setListPreviewBeforeId(list.id)
                    }
                  }}
                  onDrop={(event) => {
                    if (canEdit && draggedListId && draggedListId !== list.id) {
                      event.preventDefault()
                      moveBoardList.mutate(
                        { listId: draggedListId, beforeListId: list.id },
                        {
                          onSettled: () => {
                            setDraggedListId(null)
                            setListPreviewBeforeId(null)
                          },
                        },
                      )
                    }
                  }}
                >
                  {listPreviewBeforeId === list.id && draggedListId && (
                    <div className="h-3 w-72 shrink-0 rounded-full bg-violet-300/80" />
                  )}
                  <BoardColumn
                    boardId={boardId!}
                    boardList={list}
                    draggedTask={draggedTask}
                    previewBeforeTaskId={
                      taskPreview?.listId === list.id ? taskPreview.beforeTaskId : undefined
                    }
                    showAppendPreview={taskPreview?.listId === list.id && !taskPreview.beforeTaskId}
                    onDragStart={(event: DragEvent<HTMLDivElement>, task: Task) => {
                      if (!canEdit) return
                      event.dataTransfer.effectAllowed = 'move'
                      setDraggedTask(task)
                    }}
                    onDragEnd={() => {
                      setDraggedTask(null)
                      setTaskPreview(null)
                    }}
                    onMove={move}
                    onPreview={(listId, beforeTaskId) => setTaskPreview({ listId, beforeTaskId })}
                    onListDragStart={(event) => {
                      if (!canEdit) return
                      event.dataTransfer.effectAllowed = 'move'
                      setDraggedListId(list.id)
                      setDraggedTask(null)
                      setTaskPreview(null)
                    }}
                    onOpenTask={(task) =>
                      navigate(`/workspaces/${workspaceId}/boards/${boardId}/tasks/${task.id}`)
                    }
                    filters={filters}
                    onToggleFilter={(filter) => {
                      setFilters((current) => toggleTaskFilter(current, filter))
                      // Opens to show what was just switched on; switching
                      // one off has nothing to show.
                      if (!isTaskFilterActive(filters, filter)) setIsFiltersOpen(true)
                    }}
                    workspaceId={workspaceId!}
                    canEdit={canEdit}
                  />
                </div>
              ))
            )}
            {canEdit && draggedListId && (
              <div
                className="grid w-24 shrink-0 place-items-center rounded-2xl border border-dashed border-white/35 px-3 text-center text-xs font-semibold text-white/80"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault()
                  moveBoardList.mutate(
                    { listId: draggedListId },
                    {
                      onSettled: () => {
                        setDraggedListId(null)
                        setListPreviewBeforeId(null)
                      },
                    },
                  )
                }}
              >
                Move to end
              </div>
            )}
            {canEdit && <NewListForm boardId={boardId!} workspaceId={workspaceId!} />}
          </div>
        </div>
        <BoardFilters
          boardId={boardId!}
          filters={filters}
          onChange={setFilters}
          open={isFiltersOpen}
          workspaceId={workspaceId!}
        />
      </div>
      {taskId !== null && (
        <Suspense fallback={null}>
          <TaskModal
            boardId={boardId!}
            canEdit={board?.can_edit ?? false}
            onClose={() => navigate(`/workspaces/${workspaceId}/boards/${boardId}`)}
            taskId={taskId}
            workspaceId={workspaceId!}
          />
        </Suspense>
      )}
    </main>
  )
}

function parseId(value: string | undefined) {
  const id = Number(value)
  return Number.isSafeInteger(id) && id > 0 ? id : null
}

function BoardNameEditor({ board, workspaceId }: { board: Board; workspaceId: number }) {
  const updateBoard = useUpdateBoard(workspaceId)

  return (
    <InlineRename
      className="rounded-lg px-1.5 py-0.5 enabled:hover:bg-white/10"
      disabled={!board.can_admin}
      inputClassName="h-8 w-64 border-white/35 bg-white/10 px-1.5 text-lg font-bold tracking-tight text-white shadow-none placeholder:text-white/40 focus-visible:border-white/50 focus-visible:ring-0"
      name={board.name}
      onRename={(name) => updateBoard.mutateAsync({ boardId: board.id, name })}
      subject="Board"
    />
  )
}
