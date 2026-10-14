import type { ActionFactory, GetBearerTokenOptions } from '../types'
import { toFailure } from '../errors'
import { safeParseBearerToken } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 * Get Bearer Token
 *
 * Implements OAuth Authentication (Client Credentials)
 * @see https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials
 */
export const getBearerToken: ActionFactory<GetBearerTokenOptions, string> =
  (connectionOptions) =>
  async ({ clientId, clientSecret, scope, ...request }) => {
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
      return safeParseBearerToken(response)
    } catch (error) {
      return toFailure('getBearerToken', error)
    }
  }
