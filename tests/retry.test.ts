import { describe, it, expect, vi, afterEach } from 'vitest'
import { withRetry, isTransientFailure } from '../src/retry'
import { createConnection } from '../src'
import { failure, success } from '../src/utils'
import type { Failure, Result } from '../src'

const http = (status: number, extra: Partial<Failure> = {}): Failure => ({
  success: false,
  error: `HTTP ${status}`,
  code: 'HTTP',
  status,
  ...extra,
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('isTransientFailure', () => {
  it('matches network, timeout and retryable statuses only', () => {
    expect(isTransientFailure(failure('x', 'NETWORK'))).toBe(true)
    expect(isTransientFailure(failure('x', 'TIMEOUT'))).toBe(true)
    expect(isTransientFailure(http(429))).toBe(true)
    expect(isTransientFailure(http(503))).toBe(true)
    expect(isTransientFailure(http(500))).toBe(false)
    expect(isTransientFailure(http(404))).toBe(false)
    expect(isTransientFailure(failure('x', 'AUTH'))).toBe(false)
    expect(isTransientFailure(failure('x', 'PARSE'))).toBe(false)
    expect(isTransientFailure(failure('x', 'ABORTED'))).toBe(false)
  })
})

describe('withRetry', () => {
  it('does not retry when retry is not configured', async () => {
    const attempt = vi.fn().mockResolvedValue(http(503))
    const res = await withRetry(undefined, undefined, attempt)
    expect(res).toStrictEqual(http(503))
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('retries transient failures up to `retries` times', async () => {
    const attempt = vi
      .fn<() => Promise<Result<string>>>()
      .mockResolvedValueOnce(failure('a', 'NETWORK'))
      .mockResolvedValueOnce(http(503))
      .mockResolvedValueOnce(success('ok'))
    const res = await withRetry(
      { retries: 2, baseDelayMs: 0 },
      undefined,
      attempt
    )
    expect(res).toStrictEqual(success('ok'))
    expect(attempt).toHaveBeenCalledTimes(3)
  })

  it('returns the last failure when retries are exhausted', async () => {
    const attempt = vi.fn().mockResolvedValue(http(502))
    const res = await withRetry(
      { retries: 2, baseDelayMs: 0 },
      undefined,
      attempt
    )
    expect(res).toStrictEqual(http(502))
    expect(attempt).toHaveBeenCalledTimes(3)
  })

  it('does not retry non-transient failures', async () => {
    const attempt = vi.fn().mockResolvedValue(http(404))
    await withRetry({ retries: 3, baseDelayMs: 0 }, undefined, attempt)
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('honours Retry-After and gives up when it exceeds maxDelayMs', async () => {
    vi.useFakeTimers()
    const attempt = vi
      .fn<() => Promise<Result<string>>>()
      .mockResolvedValueOnce(http(429, { retryAfterMs: 1500 }))
      .mockResolvedValueOnce(success('ok'))
    const pending = withRetry(
      { retries: 2, maxDelayMs: 2000 },
      undefined,
      attempt
    )
    await vi.advanceTimersByTimeAsync(1499)
    expect(attempt).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await expect(pending).resolves.toStrictEqual(success('ok'))

    const tooLong = vi.fn().mockResolvedValue(http(429, { retryAfterMs: 5000 }))
    const res = await withRetry(
      { retries: 2, maxDelayMs: 2000 },
      undefined,
      tooLong
    )
    expect(res.success).toBe(false)
    expect(tooLong).toHaveBeenCalledTimes(1)
  })

  it('stops on ABORTED and when the signal aborts during the wait', async () => {
    const aborted = vi.fn().mockResolvedValue(failure('x', 'ABORTED'))
    await withRetry({ retries: 3, baseDelayMs: 0 }, undefined, aborted)
    expect(aborted).toHaveBeenCalledTimes(1)

    vi.useFakeTimers()
    vi.spyOn(Math, 'random').mockReturnValue(1) // full backoff, no jitter
    const controller = new AbortController()
    const attempt = vi.fn().mockResolvedValue(http(503))
    const pending = withRetry(
      { retries: 3, baseDelayMs: 1000, maxDelayMs: 1000 },
      controller.signal,
      attempt
    )
    await vi.advanceTimersByTimeAsync(10)
    controller.abort()
    await vi.advanceTimersByTimeAsync(10)
    const res = await pending
    expect(res).toStrictEqual(http(503))
    expect(attempt).toHaveBeenCalledTimes(1)
  })

  it('uses a custom retryOn predicate', async () => {
    const attempt = vi
      .fn<() => Promise<Result<string>>>()
      .mockResolvedValueOnce(http(500))
      .mockResolvedValueOnce(success('ok'))
    const retryOn = vi.fn((f: Failure) => f.status === 500)
    const res = await withRetry(
      { retries: 1, baseDelayMs: 0, retryOn },
      undefined,
      attempt
    )
    expect(res).toStrictEqual(success('ok'))
    expect(retryOn).toHaveBeenCalledWith(http(500), 1)
  })
})

describe('connection retry', () => {
  it('retries read actions but never writes', async () => {
    const seen: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => {
        seen.push(url.pathname)
        return new Response('down', { status: 503 })
      })
    )
    const connection = createConnection({
      datacenterId: 'ca1',
      apiToken: 'api',
      retry: { retries: 2, baseDelayMs: 0 },
    })
    await connection.testConnection()
    expect(seen.filter((p) => p === '/API/v3/whoami')).toHaveLength(3)

    seen.length = 0
    await connection.createMailingList({
      directoryId: 'd',
      name: 'n',
      ownerId: 'o',
    })
    expect(seen).toHaveLength(1)
  })
})
