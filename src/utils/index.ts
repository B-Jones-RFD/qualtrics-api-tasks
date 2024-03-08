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
    : 'An error occured'
}

export function getAuthHeaders(
  apiToken: string | undefined,
  bearerToken: string | undefined
) {
  if (apiToken)
    return new Headers({
      'X-API-TOKEN': apiToken,
    })
  if (bearerToken) {
    return new Headers({
      Authorization: `Bearer ${bearerToken}`,
    })
  }
  throw new Error(
    'Unable to authorize request. Bearer Token or Api Token required.'
  )
}
