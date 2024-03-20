import type { ActionFactory } from '../types'
import { failure, getErrorMessage, getAuthHeaders } from '../utils'
import { safeParseCreateMailingListResponse } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 *  Create Mailing List
 *
 * Implements Create Mailing List
 * @see https://api.qualtrics.com/3f633e4cea6cd-create-mailing-list
 */
export const createMailingList: ActionFactory<
  {
    directoryId: string
    name: string
    ownerId: string
    prioritizeListMetadata?: boolean
    bearerToken?: string
  },
  string
> =
  (connectionOptions) =>
  async ({
    directoryId,
    name,
    ownerId,
    prioritizeListMetadata = false,
    bearerToken = undefined,
  }) => {
    const route = `/API/v3/directories/${directoryId}/mailinglists`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const body = JSON.stringify({
        name,
        ownerId,
        prioritizeListMetadata,
      })

      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        body,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseCreateMailingListResponse(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
