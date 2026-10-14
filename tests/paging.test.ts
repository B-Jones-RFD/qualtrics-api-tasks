import { describe, it, expect, vi, afterEach } from 'vitest'
import { createConnection } from '../src'

const base = 'https://ca1.qualtrics.com/API/v3/distributions'

/** Three pages of distributions; `nextPage` carries a skipToken. */
function stubPages(options: { failOn?: number } = {}) {
  const requested: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL) => {
      requested.push(url.pathname + url.search)
      const skip = Number(url.searchParams.get('skipToken') ?? '0')
      if (options.failOn === skip + 1)
        return new Response('down', { status: 503 })
      const nextPage =
        skip < 2 ? `${base}?surveyId=s1&skipToken=${skip + 1}` : null
      return Response.json({
        result: { elements: [{ id: `d${skip}` }], nextPage },
      })
    })
  )
  return requested
}

const listOptions = {
  surveyId: 's1',
  sendStartDate: new Date('2026-01-01'),
  sendEndDate: new Date('2026-02-01'),
}

afterEach(() => vi.unstubAllGlobals())

describe('paging', () => {
  it('listAllDistributions collects every page', async () => {
    const requested = stubPages()
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.listAllDistributions(listOptions)
    expect(res).toStrictEqual({
      success: true,
      data: [{ id: 'd0' }, { id: 'd1' }, { id: 'd2' }],
    })
    expect(requested).toHaveLength(3)
    expect(requested[1]).toBe('/API/v3/distributions?surveyId=s1&skipToken=1')
  })

  it('honours maxPages', async () => {
    const requested = stubPages()
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.listAllDistributions({
      ...listOptions,
      maxPages: 2,
    })
    expect(res.success && res.data.map((d) => d.id)).toStrictEqual(['d0', 'd1'])
    expect(requested).toHaveLength(2)
  })

  it('a failed page fails the whole listAll call with the page number', async () => {
    stubPages({ failOn: 2 })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.listAllDistributions(listOptions)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('HTTP')
      expect(res.status).toBe(503)
      expect(res.error).toMatch(/page 2 failed after 1 items/)
    }
  })

  it('iterateDistributions yields pages and ends after a failure', async () => {
    stubPages({ failOn: 3 })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const seen: boolean[] = []
    for await (const page of connection.iterateDistributions(listOptions)) {
      seen.push(page.success)
    }
    expect(seen).toStrictEqual([true, true, false])
  })

  it('getNextDistributionsPage refuses links to another host', async () => {
    const requested = stubPages()
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.getNextDistributionsPage({
      nextPage: 'https://evil.example.com/API/v3/distributions?skipToken=1',
    })
    expect(res.success).toBe(false)
    if (!res.success) expect(res.error).toMatch(/refusing to follow nextPage/)
    expect(requested).toHaveLength(0)

    const bad = await connection.getNextDistributionsPage({ nextPage: 'nope' })
    expect(bad.success).toBe(false)
  })

  it('listAllLibraryMessages follows nextPage too', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: URL) => {
        const offset = Number(url.searchParams.get('offset') ?? '0')
        return Response.json({
          result: {
            elements: [{ id: `m${offset}`, description: '', category: 'x' }],
            nextPage:
              offset === 0
                ? 'https://ca1.qualtrics.com/API/v3/libraries/L1/messages?offset=1'
                : null,
          },
        })
      })
    )
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.listAllLibraryMessages({ libraryId: 'L1' })
    expect(res.success && res.data.map((m) => m.id)).toStrictEqual(['m0', 'm1'])
  })
})
