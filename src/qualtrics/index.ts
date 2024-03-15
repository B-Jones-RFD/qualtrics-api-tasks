export async function execute(config: {
  datacenterId: string
  route: string
  headers: Headers
  timeout?: number
  body?: string | FormData
}) {
  const { datacenterId, route, headers, timeout, body } = config
  const host = `https://${datacenterId}.qualtrics.com`
  const resource = new URL(route, host)
  const controller = new AbortController()
  const options: RequestInit = {
    method: 'GET',
    headers,
    signal: controller.signal,
  }

  if (body) {
    if (typeof body === 'string') {
      headers.append('Content-Type', 'application/json')
    }
    options.method = 'POST'
    options.headers = headers
    options.body = body
  }
  const timer = setTimeout(() => controller.abort(), timeout ?? 30 * 1000)
  const response = await fetch(resource, options)
  clearTimeout(timer)
  if (response.ok) {
    const contentType = response.headers.get('content-type')

    switch (contentType) {
      case 'application/json':
        return Promise.resolve(await response.json())
      case 'application/csv':
      case 'application/tsv':
      case 'application/xml':
        return Promise.resolve(await response.text())
      default:
        return Promise.resolve(response.body)
    }
  } else {
    const message = await response.json()
    return Promise.reject(`${response.status}: ${message}`)
  }
}
