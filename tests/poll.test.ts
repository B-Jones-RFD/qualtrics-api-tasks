import { describe, it, expect, vi, afterEach } from 'vitest'
import { poll } from '../src/utils/poll'

afterEach(() => {
  vi.useRealTimers()
})

describe('poll', () => {
  it('returns the first result that validates', async () => {
    const fn = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2)
    const result = await poll({
      fn,
      validate: (n) => n === 1,
      intervalMs: 0,
      maxAttempts: 5,
    })
    expect(result).toBe(1)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('waits intervalMs between attempts', async () => {
    vi.useFakeTimers()
    const fn = vi
      .fn()
      .mockResolvedValueOnce('pending')
      .mockResolvedValueOnce('done')
    const pending = poll({
      fn,
      validate: (s) => s === 'done',
      intervalMs: 1000,
      maxAttempts: 5,
    })
    await vi.advanceTimersByTimeAsync(999)
    expect(fn).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toBe('done')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('returns the last result when maxAttempts is reached', async () => {
    const fn = vi.fn().mockResolvedValue('pending')
    const result = await poll({
      fn,
      validate: () => false,
      intervalMs: 0,
      maxAttempts: 3,
    })
    expect(result).toBe('pending')
    expect(fn).toHaveBeenCalledTimes(3)
  })

  it('rejects when fn throws', async () => {
    await expect(
      poll({
        fn: () => Promise.reject(new Error('boom')),
        validate: () => true,
        intervalMs: 0,
        maxAttempts: 3,
      })
    ).rejects.toThrow('boom')
  })
})
