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
 * Calls `/API/v3/whoami` with the connection's credentials (or the
 * {@link RequestOptions} given) and resolves to `'Connection successful'`.
 */
export const testConnection =
  (
    connectionOptions: ConnectionOptions,
    context: ConnectionContext = createConnectionContext(connectionOptions)
  ) =>
  (options: RequestOptions = {}): Promise<Result<string>> =>
    withRetry(connectionOptions.retry, options.signal, async () => {
      try {
        const response = await execute({
          connectionOptions,
          context,
          request: options,
          route: '/API/v3/whoami',
        })
        return safeParseTestResponse(response)
      } catch (error) {
        return toFailure('testConnection', error)
      }
    })
