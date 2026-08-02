import type { TaskPriority } from '../../lib/api'

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const PRIORITY_LEVELS: Record<Exclude<TaskPriority, 'urgent'>, number> = {
  low: 1,
  medium: 2,
  high: 3,
}

export function TaskPriorityIcon({ priority }: { priority: TaskPriority }) {
  if (priority === 'urgent') {
    return (
      <span
        aria-label="Urgent priority"
        className="grid size-4 place-items-center rounded-[4px] bg-rose-500 text-[11px] font-black leading-none text-white"
        role="img"
      >
        !
      </span>
    )
  }

  const filledBars = PRIORITY_LEVELS[priority]
  return (
    <span
      aria-label={`${PRIORITY_LABELS[priority]} priority`}
      className="flex h-4 items-end gap-0.5"
      role="img"
    >
      {[1, 2, 3].map((bar) => (
        <span
          className={`w-1 rounded-sm ${bar <= filledBars ? 'bg-sky-500 dark:bg-sky-400' : 'bg-zinc-200 dark:bg-zinc-700'} ${bar === 1 ? 'h-1.5' : bar === 2 ? 'h-2.5' : 'h-4'}`}
          key={bar}
        />
      ))}
    </span>
  )
}

export function TaskPriorityValue({ priority }: { priority: TaskPriority }) {
  return (
    <span className="flex items-center gap-2">
      <TaskPriorityIcon priority={priority} />
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
