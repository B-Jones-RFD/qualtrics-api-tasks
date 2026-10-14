import { describe, it, expect, vi, afterEach } from 'vitest'
import { createConnection } from '../src'
import { makeZip } from './test-utils'

/** Fake export pipeline: start → progress (N polls) → zipped CSV file. */
function stubExport(options: { polls?: number; status?: string } = {}) {
  const seen: string[] = []
  let progressCalls = 0
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: URL, init: RequestInit) => {
      seen.push(`${init.method} ${url.pathname}`)
      if (url.pathname.endsWith('/export-responses'))
        return Response.json({
          result: {
            progressId: 'p1',
            percentComplete: 0,
            status: 'inProgress',
          },
        })
      if (url.pathname.endsWith('/export-responses/p1')) {
        progressCalls++
        const done = progressCalls >= (options.polls ?? 1)
        return Response.json({
          result: {
            fileId: 'f1',
            percentComplete: done ? 100 : 50,
            status: done ? (options.status ?? 'complete') : 'inProgress',
          },
        })
      }
      if (url.pathname.endsWith('/export-responses/f1/file'))
        return new Response(
          new Uint8Array(makeZip([{ name: 'Survey.csv', data: 'a,b\n1,2\n' }])),
          { headers: { 'content-type': 'application/zip' } }
        )
      return new Response('not found', { status: 404 })
    })
  )
  return seen
}

const options = {
  surveyId: 'SV_1',
  startDate: new Date('2026-01-01'),
  endDate: new Date('2026-02-01'),
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('exportResponses', () => {
  it('runs the three steps and returns the decoded CSV', async () => {
    const seen = stubExport()
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.exportResponses(options)
    expect(res).toStrictEqual({ success: true, data: 'a,b\n1,2\n' })
    expect(seen).toStrictEqual([
      'POST /API/v3/surveys/SV_1/export-responses',
      'GET /API/v3/surveys/SV_1/export-responses/p1',
      'GET /API/v3/surveys/SV_1/export-responses/f1/file',
    ])
  })

  it('polls once a second until complete', async () => {
    vi.useFakeTimers()
    const seen = stubExport({ polls: 3 })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const pending = connection.exportResponses(options)
    await vi.advanceTimersByTimeAsync(2000)
    const res = await pending
    expect(res.success).toBe(true)
    expect(seen.filter((s) => s.endsWith('/p1'))).toHaveLength(3)
  })

  it('fails fast when Qualtrics reports the export failed', async () => {
    const seen = stubExport({ status: 'failed' })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.exportResponses(options)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('HTTP')
      expect(res.error).toMatch(/export failed with status 'failed'/)
    }
    expect(seen.some((s) => s.endsWith('/file'))).toBe(false)
  })

  it('returns the first step failure unchanged', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        Response.json(
          { meta: { error: { errorCode: 'X', errorMessage: 'bad survey' } } },
          { status: 400 }
        )
      )
    )
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.exportResponses(options)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('HTTP')
      expect(res.status).toBe(400)
      expect(res.error).toBe(
        'Error in startResponseExport: HTTP 400: X: bad survey'
      )
    }
  })
})
