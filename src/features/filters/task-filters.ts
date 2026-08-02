import type { Task, TaskPriority } from '../../lib/api'

export type TaskFilters = {
  assigneeMembershipIds: number[]
  includeNoAssignees: boolean
  includeNoLabels: boolean
  includeNoPriority: boolean
  includeNoStatus: boolean
  labelIds: number[]
  priorities: TaskPriority[]
  statusIds: number[]
}

export const emptyTaskFilters: TaskFilters = {
  assigneeMembershipIds: [],
  includeNoAssignees: false,
  includeNoLabels: false,
  includeNoPriority: false,
  includeNoStatus: false,
  labelIds: [],
  priorities: [],
  statusIds: [],
}

export type TaskFilter =
  | { kind: 'assignee'; membershipId: number }
  | { kind: 'label'; labelId: number }
  | { kind: 'priority'; priority: TaskPriority }
  | { kind: 'no-assignees' }
  | { kind: 'no-labels' }
  | { kind: 'no-priority' }
  | { kind: 'no-status' }
  | { kind: 'status'; statusId: number }

function toggleId(ids: number[], id: number) {
  return ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]
}

export function toggleTaskFilter(filters: TaskFilters, filter: TaskFilter): TaskFilters {
  switch (filter.kind) {
    case 'assignee':
      return {
        ...filters,
        assigneeMembershipIds: toggleId(filters.assigneeMembershipIds, filter.membershipId),
      }
    case 'label':
      return { ...filters, labelIds: toggleId(filters.labelIds, filter.labelId) }
    case 'priority':
      return {
        ...filters,
        priorities: filters.priorities.includes(filter.priority)
          ? filters.priorities.filter((priority) => priority !== filter.priority)
          : [...filters.priorities, filter.priority],
      }
    case 'status':
      return { ...filters, statusIds: toggleId(filters.statusIds, filter.statusId) }
    case 'no-assignees':
      return { ...filters, includeNoAssignees: !filters.includeNoAssignees }
    case 'no-labels':
      return { ...filters, includeNoLabels: !filters.includeNoLabels }
    case 'no-priority':
      return { ...filters, includeNoPriority: !filters.includeNoPriority }
    case 'no-status':
      return { ...filters, includeNoStatus: !filters.includeNoStatus }
  }
}

/**
 * Whether one property of one card is a filter that is currently on. Cards ask
 * per chip and outline the ones doing the filtering, so a card shows why it
 * survived rather than only that it did.
 */
export function isTaskFilterActive(filters: TaskFilters, filter: TaskFilter) {
  switch (filter.kind) {
    case 'assignee':
      return filters.assigneeMembershipIds.includes(filter.membershipId)
    case 'label':
      return filters.labelIds.includes(filter.labelId)
    case 'priority':
      return filters.priorities.includes(filter.priority)
    case 'status':
      return filters.statusIds.includes(filter.statusId)
    case 'no-assignees':
      return filters.includeNoAssignees
    case 'no-labels':
      return filters.includeNoLabels
    case 'no-priority':
      return filters.includeNoPriority
    case 'no-status':
      return filters.includeNoStatus
  }
}

export function matchesTaskFilters(task: Task, filters: TaskFilters) {
  const matchesPriority =
    (!filters.priorities.length && !filters.includeNoPriority) ||
    (task.priority !== null && filters.priorities.includes(task.priority)) ||
    (task.priority === null && filters.includeNoPriority)
  const matchesStatus =
    (!filters.statusIds.length && !filters.includeNoStatus) ||
    (task.status_id !== null && filters.statusIds.includes(task.status_id)) ||
    (task.status_id === null && filters.includeNoStatus)
  const matchesLabels =
    (!filters.labelIds.length && !filters.includeNoLabels) ||
    task.labels.some((label) => filters.labelIds.includes(label.id)) ||
    (!task.labels.length && filters.includeNoLabels)
  const matchesAssignees =
    (!filters.assigneeMembershipIds.length && !filters.includeNoAssignees) ||
    task.assignees.some((assignee) => filters.assigneeMembershipIds.includes(assignee.membership_id)) ||
    (!task.assignees.length && filters.includeNoAssignees)

  return matchesPriority && matchesStatus && matchesLabels && matchesAssignees
}

export function taskFilterCount(filters: TaskFilters) {
  return (
    filters.priorities.length +
    filters.statusIds.length +
    filters.labelIds.length +
    filters.assigneeMembershipIds.length +
    Number(filters.includeNoPriority) +
    Number(filters.includeNoStatus) +
    Number(filters.includeNoLabels) +
    Number(filters.includeNoAssignees)
  )
}
