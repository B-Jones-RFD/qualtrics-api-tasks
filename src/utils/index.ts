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

/**
 * Builds the auth header for a request. A per-call `bearerToken` takes
 * precedence over the connection-level `apiToken`.
 */
export function getAuthHeaders(
  apiToken: string | undefined,
  bearerToken: string | undefined
) {
  if (bearerToken) {
    return new Headers({
      Authorization: `Bearer ${bearerToken}`,
    })
  }
  if (apiToken)
    return new Headers({
      'X-API-TOKEN': apiToken,
    })
  throw new Error(
    'Unable to authorize request. Bearer Token or Api Token required.'
  )
}

/** Percent-encodes one URL path segment (an id). */
export function segment(value: string): string {
  return encodeURIComponent(value)
}

/** True when a Qualtrics job status reports a terminal failure. */
export function isFailedStatus(status: unknown): boolean {
  return typeof status === 'string' && /fail|error|cancel/i.test(status)
}
