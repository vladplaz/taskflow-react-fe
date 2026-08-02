import { useState } from 'react'
import type { DragEvent } from 'react'
import { Paperclip } from 'lucide-react'

import type { TaskFilter, TaskFilters } from '../../features/filters/task-filters'
import { isTaskFilterActive, matchesTaskFilters } from '../../features/filters/task-filters'
import { useUpdateBoardList } from '../../features/boards/use-boards'
import { useTasks } from '../../features/tasks/use-tasks'
import type { BoardList, Task } from '../../lib/api'
import { NewTaskButton } from '../tasks/new-task-button'
import { TaskPriorityIcon } from '../tasks/task-priority'
import { InlineRename } from '../ui/inline-rename'
import { Skeleton } from '../ui/skeleton'

type BoardColumnProps = {
  boardId: number
  boardList: BoardList
  draggedTask: Task | null
  previewBeforeTaskId?: number
  showAppendPreview: boolean
  onDragStart: (event: DragEvent<HTMLDivElement>, task: Task) => void
  onDragEnd: () => void
  onMove: (targetListId: number, beforeTaskId?: number) => void
  onPreview: (listId: number, beforeTaskId?: number) => void
  onListDragStart: (event: DragEvent<HTMLDivElement>) => void
  onOpenTask: (task: Task) => void
  onToggleFilter: (filter: TaskFilter) => void
  filters: TaskFilters
  workspaceId: number
  canEdit: boolean
}

export function BoardColumn({
  boardId,
  boardList,
  draggedTask,
  previewBeforeTaskId,
  showAppendPreview,
  onDragStart,
  onDragEnd,
  onMove,
  onPreview,
  onListDragStart,
  onOpenTask,
  onToggleFilter,
  filters,
  workspaceId,
  canEdit,
}: BoardColumnProps) {
  const { data: tasks, isPending } = useTasks(workspaceId, boardList.id)
  const visibleTasks = tasks?.filter((task) => matchesTaskFilters(task, filters))
  const updateBoardList = useUpdateBoardList(workspaceId, boardId)
  // The header is the column's drag handle, which would swallow the click
  // and the text selection the rename field needs.
  const [isRenaming, setIsRenaming] = useState(false)
  return (
    <section
      className="flex h-fit max-h-full w-72 shrink-0 flex-col rounded-2xl border border-white/40 bg-white/80 p-3 shadow-xl shadow-sky-950/25 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/75"
      onDragOver={(event) => {
        if (!canEdit) return
        event.preventDefault()
        if (draggedTask) onPreview(boardList.id)
      }}
      onDrop={(event) => {
        if (!canEdit) return
        event.preventDefault()
        if (draggedTask) onMove(boardList.id)
      }}
    >
      <div
        className={`flex items-center justify-between gap-2 px-1 ${canEdit && !isRenaming ? 'cursor-grab active:cursor-grabbing' : ''}`}
        draggable={canEdit && !isRenaming}
        onDragStart={onListDragStart}
      >
        <h2 className="min-w-0 flex-1 text-sm font-bold text-zinc-800 dark:text-zinc-100">
          <InlineRename
            className="rounded-md px-1 py-0.5 enabled:hover:bg-zinc-900/5 dark:enabled:hover:bg-white/10"
            disabled={!canEdit}
            inputClassName="h-7 w-full px-1 text-sm font-bold"
            name={boardList.name}
            onEditingChange={setIsRenaming}
            onRename={(name) => updateBoardList.mutateAsync({ listId: boardList.id, name })}
            subject="List"
          />
        </h2>
        <span className="shrink-0 rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-white/10 dark:text-zinc-400">
          {visibleTasks?.length ?? 0}
        </span>
      </div>
      <div className="mt-1 min-h-8 overflow-y-auto pr-1">
        {isPending ? (
          <div className="mt-2 space-y-2">
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        ) : (
          visibleTasks?.map((task) => (
            <div
              key={task.id}
              onDragOver={(event) => {
                // A column dragged over a card has to reach the column below.
                if (canEdit && draggedTask) {
                  event.preventDefault()
                  event.stopPropagation()
                  onPreview(boardList.id, task.id)
                }
              }}
            >
              {previewBeforeTaskId === task.id && draggedTask && <TaskPreview task={draggedTask} />}
              <TaskCard
                isDraggingTask={Boolean(draggedTask)}
                draggedTaskId={draggedTask?.id ?? null}
                onDragEnd={onDragEnd}
                onDragStart={onDragStart}
                onToggleFilter={onToggleFilter}
                onDropBefore={(beforeTaskId) => onMove(boardList.id, beforeTaskId)}
                onOpen={() => onOpenTask(task)}
                task={task}
                filters={filters}
                canEdit={canEdit}
              />
            </div>
          ))
        )}
        {showAppendPreview && draggedTask && <TaskPreview task={draggedTask} />}
        {canEdit && <NewTaskButton listId={boardList.id} workspaceId={workspaceId} />}
      </div>
    </section>
  )
}

function TaskPreview({ task }: { task: Task }) {
  return (
    <div className="mt-2 rounded-xl border-2 border-dashed border-violet-400 bg-violet-50/80 p-3 opacity-80 dark:bg-violet-500/10">
      <p className="text-sm font-medium text-violet-800 dark:text-violet-100">{task.title}</p>
    </div>
  )
}

/** The outline a chip wears while its value is one of the active filters. */
const ACTIVE_FILTER_RING = 'ring-2 ring-violet-500 dark:ring-violet-400'

function TaskCard({
  isDraggingTask,
  draggedTaskId,
  onDragStart,
  onDragEnd,
  onToggleFilter,
  onDropBefore,
  onOpen,
  task,
  filters,
  canEdit,
}: {
  isDraggingTask: boolean
  draggedTaskId: number | null
  onDragStart: (event: DragEvent<HTMLDivElement>, task: Task) => void
  onDragEnd: () => void
  onToggleFilter: (filter: TaskFilter) => void
  onDropBefore: (taskId: number) => void
  onOpen: () => void
  task: Task
  filters: TaskFilters
  canEdit: boolean
}) {
  return (
    <div
      className={`mt-2 cursor-pointer rounded-xl border border-white/80 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 dark:border-white/10 dark:bg-slate-900 ${draggedTaskId === task.id ? 'opacity-35' : 'hover:shadow-lg hover:shadow-violet-950/15'}`}
      draggable={canEdit}
      onDragOver={(event) => isDraggingTask && event.preventDefault()}
      onDragStart={(event) => onDragStart(event, task)}
      onDragEnd={onDragEnd}
      onDrop={(event) => {
        // A column dropped "on the column" usually lands on a card, so this
        // drop has to bubble to the column that knows how to reorder.
        if (!isDraggingTask) return
        event.preventDefault()
        event.stopPropagation()
        onDropBefore(task.id)
      }}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
        event.preventDefault()
        onOpen()
      }}
      role="button"
      tabIndex={0}
    >
      <p className="text-sm font-medium leading-5 text-zinc-800 dark:text-zinc-100">{task.title}</p>
      {(task.priority || task.status || task.attachment_count > 0) && (
        <div className="mt-2 flex items-center gap-2">
          {task.attachment_count > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground"
              title={`${task.attachment_count} attachment${task.attachment_count === 1 ? '' : 's'}`}
            >
              <Paperclip className="size-3.5" />
              {task.attachment_count}
            </span>
          )}
          {task.priority && (
            <button
              aria-label={`Filter by ${task.priority} priority`}
              aria-pressed={isTaskFilterActive(filters, { kind: 'priority', priority: task.priority })}
              className={`rounded-md p-0.5 transition hover:bg-sky-500/10 ${isTaskFilterActive(filters, { kind: 'priority', priority: task.priority }) ? ACTIVE_FILTER_RING : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                onToggleFilter({ kind: 'priority', priority: task.priority! })
              }}
              type="button"
            >
              <TaskPriorityIcon priority={task.priority} />
            </button>
          )}
          {task.status && (
            <button
              aria-pressed={isTaskFilterActive(filters, { kind: 'status', statusId: task.status.id })}
              className={`inline-flex cursor-pointer rounded-full bg-violet-100 px-2 py-1 text-[11px] font-semibold text-violet-700 transition hover:bg-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:hover:bg-violet-500/25 ${isTaskFilterActive(filters, { kind: 'status', statusId: task.status.id }) ? ACTIVE_FILTER_RING : ''}`}
              onClick={(event) => {
                event.stopPropagation()
                onToggleFilter({ kind: 'status', statusId: task.status!.id })
              }}
              type="button"
            >
              {task.status.name}
            </button>
          )}
        </div>
      )}
      {task.labels.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {task.labels.map((label) => (
            <button
              aria-pressed={isTaskFilterActive(filters, { kind: 'label', labelId: label.id })}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-muted/70 px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted ${isTaskFilterActive(filters, { kind: 'label', labelId: label.id }) ? ACTIVE_FILTER_RING : ''}`}
              key={label.id}
              onClick={(event) => {
                event.stopPropagation()
                onToggleFilter({ kind: 'label', labelId: label.id })
              }}
              type="button"
            >
              <span className="size-2 rounded-full" style={{ backgroundColor: label.color }} />
              {label.name}
            </button>
          ))}
        </div>
      )}
      {task.assignees.length > 0 && (
        <div className="mt-3 flex -space-x-1.5">
          {task.assignees.map((assignee) => (
            <button
              aria-label={`Filter by ${assignee.display_name}`}
              aria-pressed={isTaskFilterActive(filters, {
                kind: 'assignee',
                membershipId: assignee.membership_id,
              })}
              // `relative z-10`: avatars overlap, and the ring would be
              // clipped by the next avatar's border.
              className={`grid size-6 cursor-pointer place-items-center rounded-full border-2 border-white bg-violet-100 text-[10px] font-bold text-violet-700 transition hover:-translate-y-0.5 hover:ring-2 hover:ring-violet-300 dark:border-zinc-900 dark:bg-violet-950 dark:text-violet-200 dark:hover:ring-violet-500/50 ${isTaskFilterActive(filters, { kind: 'assignee', membershipId: assignee.membership_id }) ? `relative z-10 ${ACTIVE_FILTER_RING}` : ''}`}
              key={assignee.membership_id}
              onClick={(event) => {
                event.stopPropagation()
                onToggleFilter({ kind: 'assignee', membershipId: assignee.membership_id })
              }}
              title={`Filter by ${assignee.display_name}`}
              type="button"
            >
              {assignee.display_name.slice(0, 1).toUpperCase()}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
