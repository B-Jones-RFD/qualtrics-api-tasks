import type {
  ConnectionContext,
  ConnectionOptions,
  RequestOptions,
} from '../types'
import { ManagedTokenError, QualtricsApiError } from '../errors'

const DEFAULT_TIMEOUT_MS = 30 * 1000

type ExecuteConfig = {
  connectionOptions: ConnectionOptions
  /** Shared caches; needed when `connectionOptions.oauth` is set. */
  context?: ConnectionContext
  /** Per-call overrides: token, timeout, signal. */
  request?: RequestOptions
  /** Path (and query) relative to the datacenter host. */
  route: string
  /** Replaces the auth headers derived from the options (used by `getBearerToken`). */
  headers?: Headers
  /** Present → POST. Strings are sent as JSON. */
  body?: string | URLSearchParams
  /** Return the response body as a `Buffer` whatever its content type (file downloads). */
  raw?: boolean
}

type Auth =
  | { kind: 'explicit'; headers: Headers }
  | { kind: 'managed'; token: string }
  | { kind: 'apiToken'; token: string }

/**
 * Picks the credentials for a request: an explicit `headers` object, then a
 * per-call `bearerToken`, then the managed OAuth token, then `apiToken`.
 */
async function resolveAuth(config: ExecuteConfig): Promise<Auth> {
  const { connectionOptions, context } = config
  const request = config.request ?? {}
  if (config.headers) return { kind: 'explicit', headers: config.headers }
  if (request.bearerToken)
    return {
      kind: 'explicit',
      headers: new Headers({ Authorization: `Bearer ${request.bearerToken}` }),
    }
  if (connectionOptions.oauth) {
    if (!context)
      throw new Error(
        'A ConnectionContext is required when ConnectionOptions.oauth is set'
      )
    const token = await context.tokens.get(request)
    if (!token.success) throw new ManagedTokenError(token)
    return { kind: 'managed', token: token.data }
  }
  if (connectionOptions.apiToken)
    return { kind: 'apiToken', token: connectionOptions.apiToken }
  throw new Error(
    'Unable to authorize request. Provide a bearerToken, ConnectionOptions.oauth or ConnectionOptions.apiToken.'
  )
}

function headersFor(auth: Auth): Headers {
  switch (auth.kind) {
    case 'explicit':
      return new Headers(auth.headers)
    case 'managed':
      return new Headers({ Authorization: `Bearer ${auth.token}` })
    case 'apiToken':
      return new Headers({ 'X-API-TOKEN': auth.token })
  }
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

/** One HTTP round trip. Throws on non-2xx, timeout or abort. */
async function send(config: ExecuteConfig, headers: Headers): Promise<unknown> {
  const { connectionOptions, route, body } = config
  const request = config.request ?? {}
  const timeout =
    request.timeout ?? connectionOptions.timeout ?? DEFAULT_TIMEOUT_MS
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
    if (response.ok)
      return config.raw
        ? Buffer.from(await response.arrayBuffer())
        : await decodeBody(response)
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

/**
 * Performs one request against the Qualtrics API. GET when `body` is absent,
 * POST otherwise. Throws a {@link QualtricsApiError} for a non-2xx response,
 * a `TimeoutError` when `timeout` elapses before the whole body has been
 * read, an `AbortError` when `request.signal` is aborted, and a
 * {@link ManagedTokenError} when the managed bearer token cannot be obtained.
 *
 * With a managed token, a 401 invalidates the cached token and the request
 * is sent once more with a fresh one.
 */
export async function execute(config: ExecuteConfig): Promise<unknown> {
  const auth = await resolveAuth(config)
  try {
    return await send(config, headersFor(auth))
  } catch (error) {
    if (
      auth.kind === 'managed' &&
      error instanceof QualtricsApiError &&
      error.status === 401 &&
      config.context
    ) {
      config.context.tokens.invalidate()
      const fresh = await config.context.tokens.get(config.request)
      if (!fresh.success) throw new ManagedTokenError(fresh)
      return send(config, headersFor({ kind: 'managed', token: fresh.data }))
    }
    throw error
  }
}
