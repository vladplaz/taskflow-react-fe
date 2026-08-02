export type CardCreationLock = { current: boolean }

export async function runCardCreationOnce(
  lock: CardCreationLock,
  create: () => Promise<unknown>,
): Promise<boolean> {
  if (lock.current) return false

  lock.current = true
  try {
    await create()
    return true
  } finally {
    lock.current = false
  }
}
