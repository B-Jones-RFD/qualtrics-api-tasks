import type {
  ConnectionContext,
  ConnectionOptions,
  RequestOptions,
  Result,
  WhoAmI,
} from '../types'
import { toFailure } from '../errors'
import { safeParseWhoAmI } from '../utils/parsers'
import { execute } from '../qualtrics'
import { createConnectionContext } from '../context'
import { withRetry } from '../retry'

/**
 * Test connection to Qualtrics API
 *
 * Calls `/API/v3/whoami` with the connection's credentials (or the
 * {@link RequestOptions} given) and resolves to the caller's identity.
 * @see https://api.qualtrics.com/dc58b844b8a14-who-am-i
 */
export const testConnection =
  (
    connectionOptions: ConnectionOptions,
    context: ConnectionContext = createConnectionContext(connectionOptions)
  ) =>
  (options: RequestOptions = {}): Promise<Result<WhoAmI>> =>
    withRetry(connectionOptions.retry, options.signal, async () => {
      try {
        const response = await execute({
          connectionOptions,
          context,
          request: options,
          route: '/API/v3/whoami',
        })
        return safeParseWhoAmI(response)
      } catch (error) {
        return toFailure('testConnection', error)
      }
    })
