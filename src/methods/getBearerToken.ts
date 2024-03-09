import type { ActionFactory } from '../types'
import { failure, getErrorMessage } from '../utils'
import { safeParseBearerToken } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 * Get Bearer Token
 *
 * Implements OAuth Authentication (Client Credentials
 * @see https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials
 */
export const getBearerToken: ActionFactory<
  { clientId: string; clientSecret: string; scope: string },
  string
> =
  (connectionOptions) =>
  async ({ clientId, clientSecret, scope }) => {
    const route = `/oauth2/token`
    try {
      const { datacenterId, timeout } = connectionOptions
      const headers = new Headers({
        Authorization:
          'Basic ' +
          Buffer.from(`${clientId}:${clientSecret}`).toString('base64'),
      })
      const body = new FormData()
      body.append('grant_type', 'client_credentials')
      body.append('scope', scope)

      const response = await execute({
        datacenterId,
        route,
        headers,
        body,
        timeout,
      })
      const result = safeParseBearerToken(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
