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
