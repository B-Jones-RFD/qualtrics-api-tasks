import type { ActionFactory } from '../types'
import { failure, safeParseBearerToken, getErrorMessage } from '../utils'
import { execute } from '../qualtrics'

export const getBearerToken: ActionFactory<
  { clientId: string; clientSecret: string },
  string
> =
  (connectionOptions) =>
  async ({ clientId, clientSecret }) => {
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
      body.append('scope', 'manage:all')

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
