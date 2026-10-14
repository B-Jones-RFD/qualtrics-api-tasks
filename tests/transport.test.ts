import { describe, it, expect, vi, afterEach } from 'vitest'
import { execute, describeErrorBody } from '../src/qualtrics'
import { getAuthHeaders, isFailedStatus } from '../src/utils'
import { safeParseFile } from '../src/utils/parsers'

const stubFetch = (
  body: BodyInit | null,
  init: ResponseInit & { headers?: Record<string, string> } = {}
) => {
  const fetchMock = vi.fn(async () => new Response(body, init))
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('execute', () => {
  it('builds the datacenter URL and defaults to GET', async () => {
    const fetchMock = stubFetch('{"result":1}', {
      headers: { 'content-type': 'application/json' },
    })
    await execute({
      datacenterId: 'ca1',
      route: '/API/v3/whoami',
      headers: new Headers(),
    })
    const [url, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.toString()).toBe('https://ca1.qualtrics.com/API/v3/whoami')
    expect(init.method).toBe('GET')
  })

  it('parses JSON regardless of charset parameter', async () => {
    stubFetch('{"result":{"userId":"u1"}}', {
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
    const res = await execute({
      datacenterId: 'ca1',
      route: '/x',
      headers: new Headers(),
    })
    expect(res).toStrictEqual({ result: { userId: 'u1' } })
  })

  it('returns text bodies as strings', async () => {
    stubFetch('a,b\n1,2', { headers: { 'content-type': 'text/csv' } })
    const res = await execute({
      datacenterId: 'ca1',
      route: '/x',
      headers: new Headers(),
    })
    expect(res).toBe('a,b\n1,2')
  })

  it('returns binary bodies as a Buffer', async () => {
    stubFetch(new Uint8Array([0x50, 0x4b, 3, 4]), {
      headers: { 'content-type': 'application/zip' },
    })
    const res = await execute({
      datacenterId: 'ca1',
      route: '/x',
      headers: new Headers(),
    })
    expect(Buffer.isBuffer(res)).toBe(true)
    expect((res as Buffer).subarray(0, 2).toString()).toBe('PK')
  })

  it('POSTs a JSON string body with the content type set', async () => {
    const fetchMock = stubFetch('{}', {
      headers: { 'content-type': 'application/json' },
    })
    const headers = new Headers()
    await execute({
      datacenterId: 'ca1',
      route: '/x',
      headers,
      body: '{"a":1}',
    })
    const [, init] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit]
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"a":1}')
    expect(headers.get('content-type')).toBe('application/json')
  })

  it('throws with the Qualtrics error message on a non-2xx response', async () => {
    stubFetch(
      JSON.stringify({
        meta: {
          httpStatus: '400 - Bad Request',
          requestId: 'r1',
          error: { errorCode: 'QE1', errorMessage: 'Bad survey id' },
        },
      }),
      { status: 400, headers: { 'content-type': 'application/json' } }
    )
    await expect(
      execute({ datacenterId: 'ca1', route: '/x', headers: new Headers() })
    ).rejects.toThrow('HTTP 400: QE1: Bad survey id')
  })

  it('throws with the raw body when the error is not JSON', async () => {
    stubFetch('Gateway down', { status: 502, statusText: 'Bad Gateway' })
    await expect(
      execute({ datacenterId: 'ca1', route: '/x', headers: new Headers() })
    ).rejects.toThrow('HTTP 502: Gateway down')
  })

  it('throws a timeout error when the request is aborted', async () => {
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
    await expect(
      execute({
        datacenterId: 'ca1',
        route: '/x',
        headers: new Headers(),
        timeout: 10,
      })
    ).rejects.toThrow('Request timed out after 10 ms')
  })
})

describe('describeErrorBody', () => {
  it('reads meta.error', () => {
    expect(
      describeErrorBody(
        '{"meta":{"error":{"errorCode":"E","errorMessage":"M"}}}'
      )
    ).toBe('E: M')
  })
  it('falls back to the raw body', () => {
    expect(describeErrorBody('<html>oops</html>')).toBe('<html>oops</html>')
    expect(describeErrorBody('{"foo":1}')).toBe('{"foo":1}')
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
