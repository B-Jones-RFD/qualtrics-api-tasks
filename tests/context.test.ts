import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  createConnection,
  createConnectionContext,
  getDistribution,
} from '../src'

type Call = { url: string; auth: string | null; body?: string }

/**
 * Stubs fetch with a tiny Qualtrics: `/oauth2/token` mints `tok-<n>`,
 * `/API/v3/whoami` answers 401 while `rejectTokens` contains the presented
 * token and 200 otherwise.
 */
function stubQualtrics(options: { expiresIn?: number } = {}) {
  const calls: Call[] = []
  const rejectTokens = new Set<string>()
  let minted = 0
  let pendingTokens: Array<() => void> = []
  let holdTokens = false

  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL, init: RequestInit) => {
      const headers = new Headers(init.headers)
      const call: Call = {
        url: url.pathname,
        auth: headers.get('authorization'),
      }
      if (init.body instanceof URLSearchParams) call.body = init.body.toString()
      else if (typeof init.body === 'string') call.body = init.body
      calls.push(call)

      if (url.pathname === '/oauth2/token') {
        if (holdTokens)
          await new Promise<void>((resolve) => pendingTokens.push(resolve))
        minted++
        return Response.json({
          access_token: `tok-${minted}`,
          token_type: 'Bearer',
          expires_in: options.expiresIn ?? 3600,
        })
      }
      const token = call.auth?.replace('Bearer ', '') ?? ''
      if (rejectTokens.has(token))
        return Response.json(
          { meta: { error: { errorCode: 'AUTH', errorMessage: 'expired' } } },
          { status: 401 }
        )
      return Response.json({ result: { userId: 'u1' } })
    })
  )

  return {
    calls,
    rejectTokens,
    tokenRequests: () => calls.filter((c) => c.url === '/oauth2/token').length,
    hold() {
      holdTokens = true
    },
    release() {
      holdTokens = false
      pendingTokens.forEach((resolve) => resolve())
      pendingTokens = []
    },
  }
}

const oauth = { clientId: 'id', clientSecret: 'secret', scope: 'read:users' }

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('managed OAuth token', () => {
  it('fetches the token on first use and reuses it', async () => {
    const q = stubQualtrics()
    const connection = createConnection({ datacenterId: 'ca1', oauth })
    expect(q.tokenRequests()).toBe(0)

    await connection.testConnection()
    await connection.testConnection()
    expect(q.tokenRequests()).toBe(1)
    expect(q.calls.filter((c) => c.auth === 'Bearer tok-1')).toHaveLength(2)
    expect(q.calls[0].body).toContain('grant_type=client_credentials')
    expect(q.calls[0].auth).toBe(
      'Basic ' + Buffer.from('id:secret').toString('base64')
    )
  })

  it('shares one in-flight token request between concurrent calls', async () => {
    const q = stubQualtrics()
    const connection = createConnection({ datacenterId: 'ca1', oauth })
    q.hold()
    const pending = Promise.all([
      connection.testConnection(),
      connection.testConnection(),
      connection.testConnection(),
    ])
    await new Promise((resolve) => setTimeout(resolve, 10))
    q.release()
    const results = await pending
    expect(results.every((r) => r.success)).toBe(true)
    expect(q.tokenRequests()).toBe(1)
  })

  it('refreshes a minute before expiry', async () => {
    vi.useFakeTimers()
    const q = stubQualtrics({ expiresIn: 600 })
    const connection = createConnection({ datacenterId: 'ca1', oauth })
    await connection.testConnection()
    vi.advanceTimersByTime(539_000)
    await connection.testConnection()
    expect(q.tokenRequests()).toBe(1)
    vi.advanceTimersByTime(2_000)
    await connection.testConnection()
    expect(q.tokenRequests()).toBe(2)
    expect(q.calls.at(-1)?.auth).toBe('Bearer tok-2')
  })

  it('re-fetches once and retries the request on a 401', async () => {
    const q = stubQualtrics()
    const connection = createConnection({ datacenterId: 'ca1', oauth })
    await connection.testConnection()
    q.rejectTokens.add('tok-1')
    const res = await connection.testConnection()
    expect(res.success).toBe(true)
    expect(q.tokenRequests()).toBe(2)
    const whoami = q.calls.filter((c) => c.url === '/API/v3/whoami')
    expect(whoami.map((c) => c.auth)).toStrictEqual([
      'Bearer tok-1',
      'Bearer tok-1',
      'Bearer tok-2',
    ])
  })

  it('reports AUTH when the fresh token is rejected too', async () => {
    const q = stubQualtrics()
    const connection = createConnection({ datacenterId: 'ca1', oauth })
    q.rejectTokens.add('tok-1').add('tok-2')
    const res = await connection.testConnection()
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('AUTH')
      expect(res.status).toBe(401)
    }
    expect(q.tokenRequests()).toBe(2)
  })

  it('a per-call bearerToken bypasses the managed token', async () => {
    const q = stubQualtrics()
    const connection = createConnection({ datacenterId: 'ca1', oauth })
    await connection.testConnection({ bearerToken: 'mine' })
    expect(q.tokenRequests()).toBe(0)
    expect(q.calls[0].auth).toBe('Bearer mine')
  })

  it('oauth takes precedence over apiToken', async () => {
    const q = stubQualtrics()
    const connection = createConnection({
      datacenterId: 'ca1',
      apiToken: 'api',
      oauth,
    })
    await connection.testConnection()
    expect(q.calls.at(-1)?.auth).toBe('Bearer tok-1')
  })

  it('surfaces a token failure as the action failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { error: 'invalid_client', error_description: 'bad secret' },
          { status: 401 }
        )
      )
    )
    const connection = createConnection({ datacenterId: 'ca1', oauth })
    const res = await connection.testConnection()
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('AUTH')
      expect(res.error).toMatch(
        /^Error in testConnection: could not obtain a bearer token: /
      )
    }
  })

  it('standalone factories share a token through createConnectionContext', async () => {
    const q = stubQualtrics()
    const options = { datacenterId: 'ca1', oauth }
    const context = createConnectionContext(options)
    const a = getDistribution(options, context)
    const b = getDistribution(options, context)
    await a({ distributionId: 'd1', surveyId: 's1' })
    await b({ distributionId: 'd2', surveyId: 's1' })
    expect(q.tokenRequests()).toBe(1)

    // Without a shared context each factory keeps its own token.
    const c = getDistribution(options)
    await c({ distributionId: 'd3', surveyId: 's1' })
    expect(q.tokenRequests()).toBe(2)
  })
})
