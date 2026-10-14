import type {
  ConnectionContext,
  ConnectionOptions,
  RequestOptions,
  Result,
} from '../types'
import { toFailure } from '../errors'
import { safeParseTestResponse } from '../utils/parsers'
import { execute } from '../qualtrics'
import { createConnectionContext } from '../context'
import { withRetry } from '../retry'

/**
 * Test connection to Qualtrics API
 *
 * Calls `/API/v3/whoami`. Accepts {@link RequestOptions}; passing a bare
 * bearer token string is deprecated and will be removed in 1.0.
 */
export const testConnection =
  (
    connectionOptions: ConnectionOptions,
    context: ConnectionContext = createConnectionContext(connectionOptions)
  ) =>
  (options?: RequestOptions | string): Promise<Result<string>> => {
    const request: RequestOptions =
      typeof options === 'string' ? { bearerToken: options } : (options ?? {})
    return withRetry(connectionOptions.retry, request.signal, async () => {
      try {
        const response = await execute({
          connectionOptions,
          context,
          request,
          route: '/API/v3/whoami',
        })
        return safeParseTestResponse(response)
      } catch (error) {
        return toFailure('testConnection', error)
      }
    })
  }
