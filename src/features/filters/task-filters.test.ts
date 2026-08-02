import { describe, expect, it } from 'vitest'

import { emptyTaskFilters, isTaskFilterActive, matchesTaskFilters, toggleTaskFilter } from './task-filters'
import type { Task } from '../../lib/api'

const task: Task = {
  assignees: [{ assigned_at: '', display_name: 'Maya', membership_id: 4, user_id: 8 }],
  attachment_count: 0,
  created_at: '',
  description: {},
  due_date: null,
  id: 1,
  is_archived: false,
  labels: [{ color: '#7C3AED', id: 3, name: 'Feature' }],
  position: '1000',
  priority: 'high',
  status: { id: 2, name: 'In progress' },
  status_id: 2,
  title: 'Ship filters',
  updated_at: '',
}

describe('matchesTaskFilters', () => {
  it('requires every selected property group to match', () => {
    const filters = toggleTaskFilter(
      toggleTaskFilter(emptyTaskFilters, { kind: 'priority', priority: 'high' }),
      { kind: 'label', labelId: 3 },
    )

    expect(matchesTaskFilters(task, filters)).toBe(true)
    expect(matchesTaskFilters(task, { ...filters, statusIds: [99] })).toBe(false)
  })

  it('matches explicit empty-property filters', () => {
    const unassignedTask = {
      ...task,
      assignees: [],
      labels: [],
      priority: null,
      status: null,
      status_id: null,
    }
    const filters = toggleTaskFilter(emptyTaskFilters, { kind: 'no-assignees' })

    expect(matchesTaskFilters(unassignedTask, filters)).toBe(true)
    expect(matchesTaskFilters(task, filters)).toBe(false)
  })
})

describe('isTaskFilterActive', () => {
  it('reports only the properties that are being filtered on', () => {
    const filters = toggleTaskFilter(
      toggleTaskFilter(emptyTaskFilters, { kind: 'assignee', membershipId: 4 }),
      { kind: 'priority', priority: 'high' },
    )

    expect(isTaskFilterActive(filters, { kind: 'assignee', membershipId: 4 })).toBe(true)
    expect(isTaskFilterActive(filters, { kind: 'priority', priority: 'high' })).toBe(true)
    expect(isTaskFilterActive(filters, { kind: 'assignee', membershipId: 5 })).toBe(false)
    expect(isTaskFilterActive(filters, { kind: 'priority', priority: 'low' })).toBe(false)
    expect(isTaskFilterActive(filters, { kind: 'label', labelId: 3 })).toBe(false)
    expect(isTaskFilterActive(filters, { kind: 'status', statusId: 2 })).toBe(false)
  })

  it('covers the empty-property filters', () => {
    const filters = toggleTaskFilter(emptyTaskFilters, { kind: 'no-labels' })

    expect(isTaskFilterActive(filters, { kind: 'no-labels' })).toBe(true)
    expect(isTaskFilterActive(filters, { kind: 'no-assignees' })).toBe(false)
    expect(isTaskFilterActive(filters, { kind: 'no-priority' })).toBe(false)
    expect(isTaskFilterActive(filters, { kind: 'no-status' })).toBe(false)
  })
})
