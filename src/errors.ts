import type { Failure, FailureCode, QualtricsError } from './types'

/**
 * Thrown by the internal transport when Qualtrics answers with a non-2xx
 * status. Actions convert it into a {@link Failure}; it is exported so the
 * `details` shape can be reused, not because user code should catch it.
 */
export class QualtricsApiError extends Error {
  readonly name = 'QualtricsApiError'
  readonly status: number
  readonly body: string
  readonly details: QualtricsError | undefined
  /** Milliseconds the server asked clients to wait (`Retry-After`), if sent. */
  readonly retryAfterMs: number | undefined

  constructor(status: number, body: string, retryAfter?: string | null) {
    const details = parseQualtricsError(body)
    super(describeDetails(details) ?? body)
    this.status = status
    this.body = body
    this.details = details
    this.retryAfterMs = parseRetryAfter(retryAfter)
  }
}

function describeDetails(details: QualtricsError | undefined) {
  if (!details) return undefined
  const text = [details.errorCode, details.errorMessage]
    .filter(Boolean)
    .join(': ')
  return text.length > 0 ? text : undefined
}

/**
 * Parses a `Retry-After` header: either delay-seconds or an HTTP date.
 * Returns milliseconds (never negative), or `undefined` when absent/invalid.
 */
export function parseRetryAfter(
  value: string | null | undefined,
  now: number = Date.now()
): number | undefined {
  if (value === undefined || value === null) return undefined
  const text = value.trim()
  if (/^\d+$/.test(text)) return Number(text) * 1000
  const date = Date.parse(text)
  if (Number.isNaN(date)) return undefined
  return Math.max(0, date - now)
}

/**
 * Extracts Qualtrics' error object from a response body. Qualtrics reports
 * errors as `{ meta: { httpStatus, requestId, error: { errorCode,
 * errorMessage } } }`. Returns `undefined` for anything else.
 */
export function parseQualtricsError(body: unknown): QualtricsError | undefined {
  if (typeof body !== 'string' || body.length === 0) return undefined
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    return undefined
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined
  const record = parsed as Record<string, unknown>
  const meta = (record.meta ?? {}) as Record<string, unknown>
  const err = (meta.error ?? record.error) as
    Record<string, unknown> | undefined
  if (typeof err !== 'object' || err === null) return undefined

  const details: QualtricsError = {}
  if (typeof err.errorCode === 'string') details.errorCode = err.errorCode
  if (typeof err.errorMessage === 'string')
    details.errorMessage = err.errorMessage
  if (typeof meta.requestId === 'string') details.requestId = meta.requestId
  return details
}

const NETWORK_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
])

function classify(error: unknown): FailureCode {
  if (error instanceof QualtricsApiError) {
    return error.status === 401 || error.status === 403 ? 'AUTH' : 'HTTP'
  }
  if (typeof error !== 'object' || error === null) return 'UNKNOWN'
  const { name, code, cause } = error as {
    name?: unknown
    code?: unknown
    cause?: unknown
  }
  if (name === 'TimeoutError') return 'TIMEOUT'
  if (name === 'AbortError' || code === 'ABORT_ERR') return 'ABORTED'
  if (code === 'ETIMEDOUT') return 'TIMEOUT'
  if (typeof code === 'string') {
    if (NETWORK_CODES.has(code)) return 'NETWORK'
    if (
      /^(ERR_TLS_|ERR_SSL_|UNABLE_TO_|SELF_SIGNED|CERT_|DEPTH_ZERO)/.test(code)
    )
      return 'NETWORK'
  }
  // `fetch` wraps socket errors: TypeError('fetch failed', { cause })
  if (name === 'TypeError' && cause !== undefined) {
    const inner = classify(cause)
    return inner === 'UNKNOWN' ? 'NETWORK' : inner
  }
  return 'UNKNOWN'
}

function describe(error: unknown): string {
  if (error instanceof QualtricsApiError) {
    return `HTTP ${error.status}: ${error.message}`
  }
  if (error instanceof Error) {
    const cause = (error as { cause?: unknown }).cause
    if (error.message === 'fetch failed' && cause instanceof Error)
      return cause.message
    return error.message
  }
  return String(error)
}

/**
 * Converts anything thrown inside an action into a {@link Failure}, prefixed
 * with the action name and classified by {@link FailureCode}.
 */
export function toFailure(action: string, error: unknown): Failure {
  const failure: Failure = {
    success: false,
    error: `Error in ${action}: ${describe(error)}`,
    code: classify(error),
  }
  if (error instanceof QualtricsApiError) {
    failure.status = error.status
    if (error.details) failure.details = error.details
    if (error.retryAfterMs !== undefined)
      failure.retryAfterMs = error.retryAfterMs
  }
  return failure
}
