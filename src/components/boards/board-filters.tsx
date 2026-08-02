import { Flag, Tag, UserRound } from 'lucide-react'

import {
  taskFilterCount,
  toggleTaskFilter,
  type TaskFilter,
  type TaskFilters,
} from '../../features/filters/task-filters'
import { useBoardLabels, useBoardMembers, useBoardStatuses } from '../../features/boards/use-boards'
import type { TaskPriority } from '../../lib/api'
import { Button } from '../ui/button'
import { TaskPriorityValue } from '../tasks/task-priority'

const priorities: TaskPriority[] = ['low', 'medium', 'high', 'urgent']

type BoardFiltersProps = {
  boardId: number
  filters: TaskFilters
  onChange: (filters: TaskFilters) => void
  open: boolean
  workspaceId: number
}

export function BoardFilters({ boardId, filters, onChange, open, workspaceId }: BoardFiltersProps) {
  const statuses = useBoardStatuses(workspaceId, boardId, open)
  const labels = useBoardLabels(workspaceId, boardId, open)
  const members = useBoardMembers(workspaceId, boardId, open)
  const filterCount = taskFilterCount(filters)

  function toggle(filter: TaskFilter) {
    onChange(toggleTaskFilter(filters, filter))
  }

  return (
    <aside
      aria-hidden={!open}
      className={`shrink-0 overflow-hidden transition-[width,opacity] duration-300 ease-out ${open ? 'w-80 opacity-100' : 'pointer-events-none w-0 opacity-0'}`}
      inert={!open}
    >
      <div className="h-full w-80 overflow-y-auto rounded-2xl border border-white/35 bg-white/85 shadow-xl shadow-sky-950/20 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/80">
        <div className="border-b border-border/70 px-6 py-5">
          <div className="flex items-center justify-between pr-8">
            <h2 className="text-base font-semibold">Filters</h2>
            {filterCount > 0 && (
              <Button
                onClick={() =>
                  onChange({
                    assigneeMembershipIds: [],
                    includeNoAssignees: false,
                    includeNoLabels: false,
                    includeNoPriority: false,
                    includeNoStatus: false,
                    labelIds: [],
                    priorities: [],
                    statusIds: [],
                  })
                }
                size="xs"
                variant="ghost"
              >
                Clear all
              </Button>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Show cards matching every selected property.</p>
        </div>
        <div className="space-y-7 px-6 py-6">
          <FilterSection icon={<Flag className="size-4 text-sky-500" />} title="Priority">
            <FilterChoice
              isSelected={filters.includeNoPriority}
              onClick={() => toggle({ kind: 'no-priority' })}
            >
              No priority
            </FilterChoice>
            {priorities.map((priority) => (
              <FilterChoice
                isSelected={filters.priorities.includes(priority)}
                key={priority}
                onClick={() => toggle({ kind: 'priority', priority })}
              >
                <TaskPriorityValue priority={priority} />
              </FilterChoice>
            ))}
          </FilterSection>

          <FilterSection icon={<Flag className="size-4 text-violet-500" />} title="Status">
            <FilterChoice isSelected={filters.includeNoStatus} onClick={() => toggle({ kind: 'no-status' })}>
              No status
            </FilterChoice>
            {statuses.data?.map((status) => (
              <FilterChoice
                isSelected={filters.statusIds.includes(status.id)}
                key={status.id}
                onClick={() => toggle({ kind: 'status', statusId: status.id })}
              >
                {status.name}
              </FilterChoice>
            ))}
          </FilterSection>

          <FilterSection icon={<Tag className="size-4 text-amber-500" />} title="Labels">
            <FilterChoice isSelected={filters.includeNoLabels} onClick={() => toggle({ kind: 'no-labels' })}>
              No labels
            </FilterChoice>
            {labels.data?.map((label) => (
              <FilterChoice
                isSelected={filters.labelIds.includes(label.id)}
                key={label.id}
                onClick={() => toggle({ kind: 'label', labelId: label.id })}
              >
                <span className="size-2.5 rounded-full" style={{ backgroundColor: label.color }} />
                {label.name}
              </FilterChoice>
            ))}
          </FilterSection>

          <FilterSection icon={<UserRound className="size-4 text-emerald-500" />} title="Assignees">
            <FilterChoice
              isSelected={filters.includeNoAssignees}
              onClick={() => toggle({ kind: 'no-assignees' })}
            >
              No assignees
            </FilterChoice>
            {members.data?.map((member) => (
              <FilterChoice
                isSelected={filters.assigneeMembershipIds.includes(member.id)}
                key={member.id}
                onClick={() => toggle({ kind: 'assignee', membershipId: member.id })}
              >
                <span className="grid size-5 place-items-center rounded-full bg-emerald-500/15 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
                  {member.display_name.slice(0, 1).toUpperCase()}
                </span>
                {member.display_name}
              </FilterChoice>
            ))}
          </FilterSection>
        </div>
      </div>
    </aside>
  )
}

function FilterSection({
  children,
  icon,
  title,
}: {
  children: React.ReactNode
  icon: React.ReactNode
  title: string
}) {
  return (
    <section>
      <h2 className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        {title}
      </h2>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  )
}

function FilterChoice({
  children,
  isSelected,
  onClick,
}: {
  children: React.ReactNode
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <Button
      aria-pressed={isSelected}
      className={
        isSelected
          ? 'border-violet-500 bg-transparent text-foreground shadow-[0_0_0_1px_rgb(139_92_246_/_0.45)] hover:bg-transparent hover:text-foreground dark:border-violet-400 dark:bg-transparent dark:text-foreground dark:hover:bg-transparent dark:hover:text-foreground'
          : ''
      }
      onClick={onClick}
      size="sm"
      variant="outline"
    >
      {children}
    </Button>
  )
}
