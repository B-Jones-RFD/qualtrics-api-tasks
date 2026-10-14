import { describe, it, expect, vi, afterEach } from 'vitest'
import { createConnection } from '../src'

const counts = {
  contacts: { count: { added: 2, updated: 0, failed: 0 } },
  transactions: { count: { created: 0 } },
}

/** Fake import pipeline: start → status (N polls). The summary endpoint 404s. */
function stubImport(
  options: { polls?: number; status?: string; invalidEmails?: string[] } = {}
) {
  const seen: string[] = []
  const bodies: unknown[] = []
  let statusCalls = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL, init: RequestInit) => {
      seen.push(`${init.method} ${url.pathname}`)
      if (typeof init.body === 'string') bodies.push(JSON.parse(init.body))
      if (url.pathname.endsWith('/transactioncontacts'))
        return Response.json(
          {
            result: {
              id: 'PGRS_1',
              contacts: [],
              tracking: {},
              status: 'queued',
            },
          },
          { status: 202 }
        )
      if (url.pathname.endsWith('/transactioncontacts/PGRS_1')) {
        statusCalls++
        const done = statusCalls >= (options.polls ?? 1)
        return Response.json({
          result: {
            percentComplete: done ? 100 : 40,
            status: done ? (options.status ?? 'complete') : 'inProgress',
            ...counts,
            ...(options.invalidEmails
              ? { invalidEmails: options.invalidEmails }
              : {}),
          },
        })
      }
      return new Response('not found', { status: 404 })
    })
  )
  return { seen, bodies }
}

const options = {
  directoryId: 'POOL_1',
  mailingListId: 'CG_1',
  contacts: [
    { email: 'a@example.com' },
    { phone: '+15555550100', id: 'CID_1' },
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('importContacts', () => {
  it('starts, polls the status endpoint and returns the final status (never the summary)', async () => {
    const { seen, bodies } = stubImport({ invalidEmails: ['bad@'] })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.importContacts(options)
    expect(res).toStrictEqual({
      success: true,
      data: {
        percentComplete: 100,
        status: 'complete',
        ...counts,
        invalidEmails: ['bad@'],
      },
    })
    expect(seen).toStrictEqual([
      'POST /API/v3/directories/POOL_1/mailinglists/CG_1/transactioncontacts',
      'GET /API/v3/directories/POOL_1/mailinglists/CG_1/transactioncontacts/PGRS_1',
    ])
    expect(bodies[0]).toStrictEqual({ contacts: options.contacts })
  })

  it('defaults invalidEmails to an empty array', async () => {
    stubImport()
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.importContacts(options)
    expect(res.success && res.data.invalidEmails).toStrictEqual([])
  })

  it('polls at the requested cadence and times out after maxAttempts', async () => {
    vi.useFakeTimers()
    const { seen } = stubImport({ polls: 10 })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const pending = connection.importContacts({
      ...options,
      poll: { intervalMs: 50, maxAttempts: 4 },
    })
    await vi.advanceTimersByTimeAsync(500)
    const res = await pending
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('TIMEOUT')
      expect(res.error).toMatch(/did not complete within 0.2 seconds/)
    }
    expect(seen.filter((s) => s.endsWith('/PGRS_1'))).toHaveLength(4)
  })

  it('fails with HTTP when the import failed', async () => {
    stubImport({ status: 'failed' })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.importContacts(options)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('HTTP')
      expect(res.error).toBe(
        "Error in importContacts: import failed with status 'failed'"
      )
    }
  })
})

describe('listDistributions', () => {
  it('omits the date range when not given', async () => {
    const urls: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => {
        urls.push(url.search)
        return Response.json({ result: { elements: [], nextPage: null } })
      })
    )
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    await connection.listDistributions({ surveyId: 'SV_1' })
    await connection.listDistributions({
      surveyId: 'SV_1',
      sendStartDate: new Date('2026-01-01T00:00:00Z'),
    })
    expect(urls).toStrictEqual([
      '?surveyId=SV_1',
      '?surveyId=SV_1&sendStartDate=2026-01-01T00%3A00%3A00.000Z',
    ])
  })
})

describe('createDistribution', () => {
  it('accepts a transaction batch without a mailing list and passes directoryId', async () => {
    const bodies: unknown[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: URL, init: RequestInit) => {
        bodies.push(JSON.parse(init.body as string))
        return Response.json({ result: { id: 'EMD_1' } })
      })
    )
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.createDistribution({
      libraryId: 'UR_1',
      messageId: 'MS_1',
      transactionBatchId: 'BT_1',
      directoryId: 'POOL_1',
      fromEmail: 'a@example.com',
      fromName: 'A',
      subject: 'S',
      surveyId: 'SV_1',
      expirationDate: new Date('2026-02-01T00:00:00Z'),
      type: 'Individual',
      sendDate: new Date('2026-01-01T00:00:00Z'),
    })
    expect(res).toStrictEqual({ success: true, data: 'EMD_1' })
    expect((bodies[0] as { recipients: unknown }).recipients).toStrictEqual({
      transactionBatchId: 'BT_1',
      directoryId: 'POOL_1',
    })
  })
})
