import { describe, expect, it } from 'vitest'

import { TASK_ACTIVITY_BATCH, nextTaskActivityBatch } from './use-tasks'
import type { Paginated, TaskActivity } from '../../lib/api'

function page(hasMore: boolean): Paginated<TaskActivity> {
  return { items: [], total: 34, hasMore, nextUrl: null }
}

describe('nextTaskActivityBatch', () => {
  it('starts the next batch where the loaded rows end', () => {
    // Not a multiple of the batch size -- the first batch is shorter.
    expect(nextTaskActivityBatch(page(true), 5)).toEqual({
      limit: TASK_ACTIVITY_BATCH,
      offset: 5,
    })
    expect(nextTaskActivityBatch(page(true), 15)).toEqual({
      limit: TASK_ACTIVITY_BATCH,
      offset: 15,
    })
  })

  it('stops at the last batch rather than requesting an empty one', () => {
    expect(nextTaskActivityBatch(page(false), 34)).toBeUndefined()
  })
})
