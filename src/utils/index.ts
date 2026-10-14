import type { Failure, Success } from '../types'

export function success<T>(data: T): Success<T> {
  return {
    success: true,
    data,
  }
}

export function failure(error: string): Failure {
  return {
    success: false,
    error,
  }
}

export function getErrorMessage(error: unknown): string {
  return error
    ? typeof error === 'object' &&
      'message' in error &&
      typeof error.message === 'string'
      ? error.message
      : error.toString()
    : 'An error occurred'
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

/** True when a Qualtrics job status reports a terminal failure. */
export function isFailedStatus(status: unknown): boolean {
  return typeof status === 'string' && /fail|error|cancel/i.test(status)
}
