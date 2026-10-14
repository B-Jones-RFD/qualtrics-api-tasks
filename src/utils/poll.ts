import type { PollOptions } from '../types'

export const DEFAULT_POLL_INTERVAL_MS = 1000
export const DEFAULT_POLL_MAX_ATTEMPTS = 300

/** Applies defaults to caller-supplied {@link PollOptions}. */
export function resolvePoll(options: PollOptions | undefined): {
  intervalMs: number
  maxAttempts: number
} {
  const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS
  const maxAttempts = options?.maxAttempts ?? DEFAULT_POLL_MAX_ATTEMPTS
  return {
    intervalMs:
      Number.isFinite(intervalMs) && intervalMs >= 0
        ? intervalMs
        : DEFAULT_POLL_INTERVAL_MS,
    maxAttempts:
      Number.isFinite(maxAttempts) && maxAttempts >= 1
        ? Math.floor(maxAttempts)
        : DEFAULT_POLL_MAX_ATTEMPTS,
  }
}

type PollProps<TResult> = {
  /** Performs one attempt. */
  fn: () => Promise<TResult>
  /**
   * Returns `true` when polling should stop and `result` be returned — i.e.
   * the job finished, or the attempt produced something that is pointless to
   * retry (a failed `Result`, a terminal job status).
   */
  validate: (result: TResult) => boolean
  /** Delay between attempts, in milliseconds. */
  intervalMs: number
  /** Upper bound on attempts; the last result is returned when it is reached. */
  maxAttempts: number
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calls `fn` until `validate` accepts its result or `maxAttempts` is reached,
 * waiting `intervalMs` between attempts. Resolves with the last result either
 * way, so the caller can inspect it; rejects only if `fn` throws.
 */
export async function poll<TResult>({
  fn,
  validate,
  intervalMs,
  maxAttempts,
}: PollProps<TResult>): Promise<TResult> {
  const attempts = Math.max(1, maxAttempts)
  let result = await fn()
  for (let attempt = 1; attempt < attempts && !validate(result); attempt++) {
    await sleep(intervalMs)
    result = await fn()
  }
  return result
}
