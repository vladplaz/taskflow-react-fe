import { describe, expect, it } from 'vitest'

import { TASK_ACTIVITY_BATCH, nextTaskActivityBatch } from './use-tasks'
import type { Paginated, TaskActivity } from '../../lib/api'

function page(next: string | null): Paginated<TaskActivity> {
  return { count: 34, next, previous: null, results: [] }
}

describe('nextTaskActivityBatch', () => {
  it('starts the next batch where the loaded rows end', () => {
    // Not a multiple of the batch size -- the first batch is shorter.
    expect(nextTaskActivityBatch(page('http://api/activity/?limit=10&offset=5'), 5)).toEqual({
      limit: TASK_ACTIVITY_BATCH,
      offset: 5,
    })
    expect(nextTaskActivityBatch(page('http://api/activity/?limit=10&offset=15'), 15)).toEqual({
      limit: TASK_ACTIVITY_BATCH,
      offset: 15,
    })
  })

  it('stops at the last batch rather than requesting an empty one', () => {
    expect(nextTaskActivityBatch(page(null), 34)).toBeUndefined()
  })
})
