import { describe, it, expect } from 'vitest'
import {
  QualtricsApiError,
  parseQualtricsError,
  parseRetryAfter,
  toFailure,
} from '../src/errors'

describe('parseQualtricsError', () => {
  it('reads meta.error and requestId', () => {
    expect(
      parseQualtricsError(
        '{"meta":{"requestId":"r","error":{"errorCode":"E","errorMessage":"M"}}}'
      )
    ).toStrictEqual({ errorCode: 'E', errorMessage: 'M', requestId: 'r' })
  })
  it('returns undefined for non-error bodies', () => {
    expect(parseQualtricsError('<html>')).toBeUndefined()
    expect(parseQualtricsError('{"foo":1}')).toBeUndefined()
    expect(parseQualtricsError('')).toBeUndefined()
    expect(parseQualtricsError(42)).toBeUndefined()
  })
})

describe('parseRetryAfter', () => {
  it('parses delay-seconds', () => {
    expect(parseRetryAfter('5')).toBe(5000)
  })
  it('parses an HTTP date relative to now', () => {
    const now = Date.parse('2026-01-01T00:00:00Z')
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:10 GMT', now)).toBe(10000)
  })
  it('never returns a negative wait', () => {
    const now = Date.parse('2026-01-01T00:00:10Z')
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:00 GMT', now)).toBe(0)
  })
  it('returns undefined when absent or invalid', () => {
    expect(parseRetryAfter(null)).toBeUndefined()
    expect(parseRetryAfter(undefined)).toBeUndefined()
    expect(parseRetryAfter('soon')).toBeUndefined()
  })
})

describe('toFailure', () => {
  it('classifies 401/403 as AUTH and other statuses as HTTP', () => {
    const auth = toFailure('act', new QualtricsApiError(401, 'nope'))
    expect(auth.code).toBe('AUTH')
    expect(auth.status).toBe(401)
    expect(auth.error).toBe('Error in act: HTTP 401: nope')

    const http = toFailure(
      'act',
      new QualtricsApiError(
        500,
        '{"meta":{"error":{"errorCode":"X","errorMessage":"boom"}}}',
        '1'
      )
    )
    expect(http.code).toBe('HTTP')
    expect(http.status).toBe(500)
    expect(http.details).toStrictEqual({ errorCode: 'X', errorMessage: 'boom' })
    expect(http.retryAfterMs).toBe(1000)
    expect(http.error).toBe('Error in act: HTTP 500: X: boom')
  })

  it('classifies timeouts, aborts and network errors', () => {
    const timeout = new Error('slow')
    timeout.name = 'TimeoutError'
    expect(toFailure('a', timeout).code).toBe('TIMEOUT')

    const abort = new Error('stop')
    abort.name = 'AbortError'
    expect(toFailure('a', abort).code).toBe('ABORTED')

    const socket = Object.assign(new Error('refused'), { code: 'ECONNREFUSED' })
    expect(toFailure('a', socket).code).toBe('NETWORK')

    const fetchFailed = new TypeError('fetch failed', { cause: socket })
    const f = toFailure('a', fetchFailed)
    expect(f.code).toBe('NETWORK')
    expect(f.error).toBe('Error in a: refused')
  })

  it('falls back to UNKNOWN', () => {
    expect(toFailure('a', 'string reason')).toStrictEqual({
      success: false,
      error: 'Error in a: string reason',
      code: 'UNKNOWN',
    })
  })
})
