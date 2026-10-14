const DEFAULT_TIMEOUT_MS = 30 * 1000

type ExecuteConfig = {
  datacenterId: string
  route: string
  headers: Headers
  timeout?: number
  body?: string | FormData | URLSearchParams
}

/**
 * Extracts Qualtrics' error object from a failed response body. Qualtrics
 * reports errors as `{ meta: { httpStatus, requestId, error: { errorCode,
 * errorMessage } } }`; anything else is returned as plain text.
 */
export function describeErrorBody(body: string): string {
  if (body.length === 0) return ''
  try {
    const parsed = JSON.parse(body)
    const error = parsed?.meta?.error ?? parsed?.error
    if (error && typeof error === 'object') {
      const code = typeof error.errorCode === 'string' ? error.errorCode : ''
      const message =
        typeof error.errorMessage === 'string' ? error.errorMessage : ''
      const text = [code, message].filter(Boolean).join(': ')
      if (text) return text
    }
  } catch {
    // not JSON — fall through to the raw body
  }
  return body
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

/**
 * Performs one request against the Qualtrics API. GET when `body` is absent,
 * POST otherwise. Throws an `Error` whose message is `HTTP <status>: <error>`
 * for a non-2xx response, or `Request timed out after <n> ms` when `timeout`
 * elapses before the whole body has been read.
 */
export async function execute(config: ExecuteConfig): Promise<unknown> {
  const { datacenterId, route, headers, body } = config
  const timeout = config.timeout ?? DEFAULT_TIMEOUT_MS
  const host = `https://${datacenterId}.qualtrics.com`
  const resource = new URL(route, host)
  const controller = new AbortController()
  const options: RequestInit = {
    method: 'GET',
    headers,
    signal: controller.signal,
  }

  if (body !== undefined) {
    if (typeof body === 'string') {
      headers.set('Content-Type', 'application/json')
    }
    options.method = 'POST'
    options.body = body
  }

  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const response = await fetch(resource, options)
    if (response.ok) return await decodeBody(response)
    const text = await response.text()
    const detail = describeErrorBody(text)
    throw new Error(
      detail
        ? `HTTP ${response.status}: ${detail}`
        : `HTTP ${response.status}: ${response.statusText}`
    )
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'name' in error &&
      error.name === 'AbortError'
    ) {
      throw new Error(`Request timed out after ${timeout} ms`)
    }
    throw error
  } finally {
    clearTimeout(timer)
  }
}
