import type { Failure, FailureCode, Success } from '../types'

export function success<T>(data: T): Success<T> {
  return {
    success: true,
    data,
  }
}

/**
 * Builds a {@link Failure}. Defaults to code `PARSE`, which is what every
 * `safeParse*` helper reports.
 */
export function failure(error: string, code: FailureCode = 'PARSE'): Failure {
  return {
    success: false,
    error,
    code,
  }
}

/** Percent-encodes one URL path segment (an id). */
export function segment(value: string): string {
  return encodeURIComponent(value)
}

/** True when a Qualtrics job status reports a terminal failure. */
export function isFailedStatus(status: unknown): boolean {
  return typeof status === 'string' && /fail|error|cancel/i.test(status)
}
