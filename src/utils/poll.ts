type PollProps<TResult> = {
  fn: () => Promise<TResult>
  validate: (result: TResult) => boolean
  interval: number
  maxAttempts: number
}

export async function poll<TResult>({
  fn,
  validate,
  interval,
  maxAttempts,
}: PollProps<TResult>): Promise<TResult> {
  let attempts = 0

  const executePoll = async (
    resolve: (value: TResult) => void,
    reject: (reason: Error) => void
  ) => {
    try {
      const result = await fn()

      attempts++

      if (validate(result)) {
        return resolve(result)
      } else if (maxAttempts && attempts === maxAttempts) {
        return reject(new Error('Exceeded max attempts'))
      } else {
        setTimeout(executePoll, interval, resolve, reject)
      }
    } catch (error) {
      reject(new Error(`Poll function execution failed: ${error}`))
    }
  }

  return new Promise(executePoll)
}
