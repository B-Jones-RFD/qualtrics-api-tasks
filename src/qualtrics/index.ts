import type { ConnectionOptions, RequestOptions } from '../types'
import { QualtricsApiError } from '../errors'
import { getAuthHeaders } from '../utils'

const DEFAULT_TIMEOUT_MS = 30 * 1000

type ExecuteConfig = {
  connectionOptions: ConnectionOptions
  /** Per-call overrides: token, timeout, signal. */
  request?: RequestOptions
  /** Path (and query) relative to the datacenter host. */
  route: string
  /** Replaces the auth headers derived from the options (used by `getBearerToken`). */
  headers?: Headers
  /** Present → POST. Strings are sent as JSON. */
  body?: string | URLSearchParams
}

/**
 * Decodes a successful response by content type. JSON is parsed, text types
 * are returned as strings and everything else as a `Buffer`.
 */
async function decodeBody(response: Response): Promise<unknown> {
  const contentType = (response.headers.get('content-type') ?? '')
    .split(';')[0]
    .trim()
    .toLowerCase()

  if (contentType === 'application/json' || contentType.endsWith('+json')) {
    return response.json()
  }
  if (
    contentType.startsWith('text/') ||
    contentType === 'application/csv' ||
    contentType === 'application/tsv' ||
    contentType === 'application/xml'
  ) {
    return response.text()
  }
  return Buffer.from(await response.arrayBuffer())
}

function timeoutError(ms: number): Error {
  const error = new Error(`Request timed out after ${ms} ms`)
  error.name = 'TimeoutError'
  return error
}

function abortError(reason: unknown): Error {
  if (reason instanceof Error) return reason
  const error = new Error(
    typeof reason === 'string' ? reason : 'Request was aborted'
  )
  error.name = 'AbortError'
  return error
}

/**
 * Performs one request against the Qualtrics API. GET when `body` is absent,
 * POST otherwise. Throws a {@link QualtricsApiError} for a non-2xx response,
 * a `TimeoutError` when `timeout` elapses before the whole body has been
 * read, and an `AbortError` when `request.signal` is aborted.
 */
export async function execute(config: ExecuteConfig): Promise<unknown> {
  const { connectionOptions, route, body } = config
  const request = config.request ?? {}
  const timeout =
    request.timeout ?? connectionOptions.timeout ?? DEFAULT_TIMEOUT_MS
  const headers =
    config.headers ??
    getAuthHeaders(connectionOptions.apiToken, request.bearerToken)
  const resource = new URL(
    route,
    `https://${connectionOptions.datacenterId}.qualtrics.com`
  )

  if (request.signal?.aborted) throw abortError(request.signal.reason)

  const controller = new AbortController()
  let timedOut = false
  const onAbort = () => controller.abort(request.signal?.reason)
  request.signal?.addEventListener('abort', onAbort, { once: true })
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeout)

  const options: RequestInit = {
    method: 'GET',
    headers,
    signal: controller.signal,
  }
  if (body !== undefined) {
    if (typeof body === 'string')
      headers.set('Content-Type', 'application/json')
    options.method = 'POST'
    options.body = body
  }

  try {
    const response = await fetch(resource, options)
    if (response.ok) return await decodeBody(response)
    const text = await response.text()
    throw new QualtricsApiError(
      response.status,
      text.length > 0 ? text : response.statusText,
      response.headers.get('retry-after')
    )
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      if (timedOut) throw timeoutError(timeout)
      throw abortError(request.signal?.reason)
    }
    throw error
  } finally {
    clearTimeout(timer)
    request.signal?.removeEventListener('abort', onAbort)
  }
}
