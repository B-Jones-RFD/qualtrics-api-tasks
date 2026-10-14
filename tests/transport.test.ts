import { describe, it, expect, vi, afterEach } from 'vitest'
import { execute } from '../src/qualtrics'
import { QualtricsApiError } from '../src/errors'
import { getAuthHeaders, isFailedStatus, segment } from '../src/utils'
import { safeParseFile } from '../src/utils/parsers'

const connectionOptions = { datacenterId: 'ca1', apiToken: 'api' }

const stubFetch = (
  body: BodyInit | null,
  init: ResponseInit & { headers?: Record<string, string> } = {}
) => {
  const fetchMock = vi.fn(async () => new Response(body, init))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Resolves with whatever the promise rejects with, typed for assertions. */
const rejectionOf = async (
  promise: Promise<unknown>
): Promise<QualtricsApiError & Error> => {
  try {
    await promise
  } catch (error) {
    return error as QualtricsApiError & Error
  }
  throw new Error('expected the promise to reject')
}

const callOf = (fetchMock: { mock: { calls: unknown[][] } }) =>
  fetchMock.mock.calls[0] as unknown as [URL, RequestInit]

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('execute', () => {
  it('builds the datacenter URL, defaults to GET and sends the api token', async () => {
    const fetchMock = stubFetch('{"result":1}', {
      headers: { 'content-type': 'application/json' },
    })
    await execute({ connectionOptions, route: '/API/v3/whoami' })
    const [url, init] = callOf(fetchMock)
    expect(url.toString()).toBe('https://ca1.qualtrics.com/API/v3/whoami')
    expect(init.method).toBe('GET')
    expect((init.headers as Headers).get('x-api-token')).toBe('api')
  })

  it('uses a per-call bearer token over the api token', async () => {
    const fetchMock = stubFetch('{}', {
      headers: { 'content-type': 'application/json' },
    })
    await execute({
      connectionOptions,
      request: { bearerToken: 'tok' },
      route: '/x',
    })
    const [, init] = callOf(fetchMock)
    expect((init.headers as Headers).get('authorization')).toBe('Bearer tok')
    expect((init.headers as Headers).get('x-api-token')).toBeNull()
  })

  it('parses JSON regardless of charset parameter', async () => {
    stubFetch('{"result":{"userId":"u1"}}', {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
    const res = await execute({ connectionOptions, route: '/x' })
    expect(res).toStrictEqual({ result: { userId: 'u1' } })
  })

  it('returns text bodies as strings', async () => {
    stubFetch('a,b\n1,2', { headers: { 'content-type': 'text/csv' } })
    const res = await execute({ connectionOptions, route: '/x' })
    expect(res).toBe('a,b\n1,2')
  })

  it('returns binary bodies as a Buffer', async () => {
    stubFetch(new Uint8Array([0x50, 0x4b, 3, 4]), {
      headers: { 'content-type': 'application/zip' },
    })
    const res = await execute({ connectionOptions, route: '/x' })
    expect(Buffer.isBuffer(res)).toBe(true)
    expect((res as Buffer).subarray(0, 2).toString()).toBe('PK')
  })

  it('POSTs a JSON string body with the content type set', async () => {
    const fetchMock = stubFetch('{}', {
      headers: { 'content-type': 'application/json' },
    })
    await execute({ connectionOptions, route: '/x', body: '{"a":1}' })
    const [, init] = callOf(fetchMock)
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
    expect((init.headers as Headers).get('content-type')).toBe(
      'application/json'
    )
  })

  it('throws a QualtricsApiError carrying status, details and Retry-After', async () => {
    stubFetch(
      JSON.stringify({
        meta: {
          httpStatus: '429 - Too Many Requests',
          requestId: 'r1',
          error: { errorCode: 'QE1', errorMessage: 'Slow down' },
        },
      }),
      {
        status: 429,
        headers: { 'content-type': 'application/json', 'retry-after': '2' },
      }
    )
    const err = await rejectionOf(execute({ connectionOptions, route: '/x' }))
    expect(err).toBeInstanceOf(QualtricsApiError)
    expect(err.status).toBe(429)
    expect(err.message).toBe('QE1: Slow down')
    expect(err.details).toStrictEqual({
      errorCode: 'QE1',
      errorMessage: 'Slow down',
      requestId: 'r1',
    })
    expect(err.retryAfterMs).toBe(2000)
  })

  it('uses the raw body as the message when the error is not JSON', async () => {
    stubFetch('Gateway down', { status: 502, statusText: 'Bad Gateway' })
    const err = await rejectionOf(execute({ connectionOptions, route: '/x' }))
    expect(err).toBeInstanceOf(QualtricsApiError)
    expect(err.message).toBe('Gateway down')
    expect(err.details).toBeUndefined()
  })

  it('throws a TimeoutError when the request times out', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: URL, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted')
              err.name = 'AbortError'
              reject(err)
            })
          })
      )
    )
    const err = await rejectionOf(
      execute({
        connectionOptions,
        route: '/x',
        request: { timeout: 10 },
      })
    )
    expect(err.name).toBe('TimeoutError')
    expect(err.message).toBe('Request timed out after 10 ms')
  })

  it('throws an AbortError when the caller aborts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url: URL, init: RequestInit) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              const err = new Error('aborted')
              err.name = 'AbortError'
              reject(err)
            })
          })
      )
    )
    const controller = new AbortController()
    const pending = rejectionOf(
      execute({
        connectionOptions,
        route: '/x',
        request: { signal: controller.signal },
      })
    )
    controller.abort()
    const err = await pending
    expect(err.name).toBe('AbortError')
  })

  it('fails immediately when the signal is already aborted', async () => {
    const fetchMock = stubFetch('{}')
    const controller = new AbortController()
    controller.abort()
    const err = await rejectionOf(
      execute({
        connectionOptions,
        route: '/x',
        request: { signal: controller.signal },
      })
    )
    expect(err.name).toBe('AbortError')
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('getAuthHeaders', () => {
  it('prefers a per-call bearer token over the connection api token', () => {
    const h = getAuthHeaders('api', 'bearer')
    expect(h.get('authorization')).toBe('Bearer bearer')
    expect(h.get('x-api-token')).toBeNull()
  })
  it('uses the api token when no bearer token is given', () => {
    expect(getAuthHeaders('api', undefined).get('x-api-token')).toBe('api')
  })
  it('throws when neither is given', () => {
    expect(() => getAuthHeaders(undefined, undefined)).toThrow()
  })
})

describe('segment', () => {
  it('encodes path segments', () => {
    expect(segment('a b/c')).toBe('a%20b%2Fc')
  })
})

describe('isFailedStatus', () => {
  it('matches terminal failure statuses only', () => {
    expect(isFailedStatus('failed')).toBe(true)
    expect(isFailedStatus('Error')).toBe(true)
    expect(isFailedStatus('inProgress')).toBe(false)
    expect(isFailedStatus('complete')).toBe(false)
    expect(isFailedStatus(undefined)).toBe(false)
  })
})

describe('safeParseFile', () => {
  it('accepts a Buffer', () => {
    const buf = Buffer.from('x')
    expect(safeParseFile(buf)).toStrictEqual({ success: true, data: buf })
  })
  it('encodes a string body', () => {
    const res = safeParseFile('a,b')
    expect(res.success && res.data.toString()).toBe('a,b')
  })
  it('rejects anything else', () => {
    expect(safeParseFile({ result: 1 }).success).toBe(false)
  })
})
