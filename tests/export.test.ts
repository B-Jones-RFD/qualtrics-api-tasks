import { describe, it, expect, vi, afterEach } from 'vitest'
import { createConnection } from '../src'
import { makeZip } from './test-utils'

/** Fake export pipeline: start → progress (N polls) → zipped CSV file. */
function stubExport(
  options: {
    polls?: number
    status?: string
    /** Report 100% while still `inProgress` on the polls before the last. */
    earlyHundred?: boolean
    error?: { code: string; message: string; context?: Record<string, unknown> }
    /** Serve the file uncompressed as JSON with a JSON content type. */
    jsonFile?: boolean
  } = {}
) {
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
        const status = done ? (options.status ?? 'complete') : 'inProgress'
        return Response.json({
          result: {
            fileId: status === 'complete' ? 'f1' : null,
            percentComplete: done || options.earlyHundred ? 100 : 50,
            status,
            ...(status === 'failed' && options.error
              ? { error: options.error }
              : {}),
          },
        })
      }
      if (
        url.pathname.endsWith('/export-responses/f1/file') &&
        options.jsonFile
      )
        return Response.json({ responses: [{ responseId: 'R_1' }] })
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

  it('waits for status complete even when percentComplete reaches 100 early', async () => {
    vi.useFakeTimers()
    const seen = stubExport({ polls: 3, earlyHundred: true })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const pending = connection.exportResponses(options)
    await vi.advanceTimersByTimeAsync(2000)
    const res = await pending
    expect(res.success).toBe(true)
    expect(seen.filter((s) => s.endsWith('/p1'))).toHaveLength(3)
  })

  it('surfaces the job error when the export failed', async () => {
    stubExport({
      status: 'failed',
      error: {
        code: 'EXPORTS_109',
        message:
          'The field that is present in a filter does not exist in the fieldset.',
        context: { invalidField: 'QID1' },
      },
    })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.exportResponses(options)
    expect(res.success).toBe(false)
    if (!res.success) {
      expect(res.code).toBe('HTTP')
      expect(res.error).toBe(
        "Error in exportResponses: export failed with status 'failed' (EXPORTS_109: The field that is present in a filter does not exist in the fieldset.)"
      )
      expect(res.details).toStrictEqual({
        errorCode: 'EXPORTS_109',
        errorMessage:
          'The field that is present in a filter does not exist in the fieldset.',
      })
    }
  })

  it('returns an uncompressed JSON export as its text, not a parsed object', async () => {
    stubExport({ jsonFile: true })
    const connection = createConnection({ datacenterId: 'ca1', apiToken: 'a' })
    const res = await connection.exportResponses({
      ...options,
      format: 'json',
      compress: false,
    })
    expect(res).toStrictEqual({
      success: true,
      data: '{"responses":[{"responseId":"R_1"}]}',
    })
    const raw = await connection.getResponseExportFile({
      surveyId: 'SV_1',
      fileId: 'f1',
    })
    expect(raw.success && Buffer.isBuffer(raw.data)).toBe(true)
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
