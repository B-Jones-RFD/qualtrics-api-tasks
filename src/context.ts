import type {
  ConnectionContext,
  ConnectionOptions,
  Result,
  TokenCache,
} from './types'
import { requestBearerToken } from './methods/getBearerToken'
import { success } from './utils'

/** Refresh the token this long before Qualtrics says it expires. */
const REFRESH_MARGIN_MS = 60_000

function createTokenCache(options: ConnectionOptions): TokenCache {
  const oauth = options.oauth
  let value: string | undefined
  let expiresAt = 0
  let inflight: Promise<Result<string>> | undefined

  return {
    get(request) {
      if (value !== undefined && Date.now() < expiresAt) {
        return Promise.resolve(success(value))
      }
      if (inflight) return inflight
      if (!oauth)
        return Promise.resolve({
          success: false,
          error: 'ConnectionOptions.oauth is not configured',
          code: 'AUTH',
        })
      inflight = requestBearerToken(options)({
        ...oauth,
        timeout: request?.timeout,
        signal: request?.signal,
      })
        .then((res) => {
          if (!res.success) return res
          const lifetime = res.data.expiresIn * 1000
          // For very short lifetimes keep at least half of it.
          const margin = Math.min(REFRESH_MARGIN_MS, lifetime / 2)
          value = res.data.accessToken
          expiresAt = Date.now() + lifetime - margin
          return success(value)
        })
        .finally(() => {
          inflight = undefined
        })
      return inflight
    },
    invalidate() {
      value = undefined
      expiresAt = 0
    },
  }
}

/**
 * Creates the shared per-connection caches. `createConnection` calls this for
 * you; use it directly to share one managed bearer token between standalone
 * action factories.
 */
export function createConnectionContext(
  options: ConnectionOptions
): ConnectionContext {
  return {
    tokens: createTokenCache(options),
  }
}
