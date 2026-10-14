import type {
  ActionFactory,
  BearerTokenResponse,
  GetBearerTokenOptions,
} from '../types'
import { toFailure } from '../errors'
import { withRetry } from '../retry'
import { safeParseOAuthToken } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 * Requests an OAuth client-credentials token and returns it with its
 * lifetime. Used by {@link getBearerToken} and by the managed token cache.
 * @internal
 */
export const requestBearerToken: ActionFactory<
  GetBearerTokenOptions,
  BearerTokenResponse
> =
  (connectionOptions) =>
  ({ clientId, clientSecret, scope, ...request }) =>
    withRetry(connectionOptions.retry, request.signal, async () => {
      try {
        const headers = new Headers({
          Authorization:
            'Basic ' +
            Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        })
        const body = new URLSearchParams({
          grant_type: 'client_credentials',
          scope,
        })
        const response = await execute({
          connectionOptions,
          request,
          route: '/oauth2/token',
          headers,
          body,
        })
        return safeParseOAuthToken(response)
      } catch (error) {
        return toFailure('getBearerToken', error)
      }
    })

/**
 * Get Bearer Token
 *
 * Implements OAuth Authentication (Client Credentials). Returns the access
 * token. To let the connection manage the token for you, pass the same
 * credentials as `ConnectionOptions.oauth` instead.
 * @see https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials
 */
export const getBearerToken: ActionFactory<GetBearerTokenOptions, string> =
  (connectionOptions) => async (options) => {
    const res = await requestBearerToken(connectionOptions)(options)
    return res.success ? { success: true, data: res.data.accessToken } : res
  }
