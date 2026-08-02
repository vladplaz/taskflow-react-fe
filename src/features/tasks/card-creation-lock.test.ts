import { describe, expect, it, vi } from 'vitest'

import { runCardCreationOnce } from './card-creation-lock'

describe('runCardCreationOnce', () => {
  it('allows only one in-flight card creation', async () => {
    let finishCreation!: () => void
    const create = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishCreation = resolve
        }),
    )
    const lock = { current: false }

    const firstCreation = runCardCreationOnce(lock, create)
    const repeatedCreation = runCardCreationOnce(lock, create)

    await expect(repeatedCreation).resolves.toBe(false)
    expect(create).toHaveBeenCalledTimes(1)

    finishCreation()
    await expect(firstCreation).resolves.toBe(true)
    expect(lock.current).toBe(false)
  })

  it('releases the lock when creation fails', async () => {
    const lock = { current: false }

    await expect(
      runCardCreationOnce(lock, async () => {
        throw new Error('Creation failed')
      }),
    ).rejects.toThrow('Creation failed')

    expect(lock.current).toBe(false)
  })
})
