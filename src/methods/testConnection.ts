import type { ActionFactory, ConnectionOptions } from '../types'
import {
  failure,
  getAuthHeaders,
  getErrorMessage,
  safeParseTestResponse,
} from '../utils'

import { execute } from '../qualtrics'

export const testConnection: ActionFactory<string | undefined, void> =
  (connectionOptions: ConnectionOptions) => async (bearerToken?: string) => {
    const route = '/API/v3/whoami'
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseTestResponse(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
