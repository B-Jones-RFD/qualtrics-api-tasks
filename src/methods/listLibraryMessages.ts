import type { ActionFactory } from '../types'
import { failure, getErrorMessage, getAuthHeaders } from '../utils'
import { safeParseListLibraryMessages } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 * List Library Messages
 *
 * Implements List Library Messages
 * @see https://api.qualtrics.com/1d60a66b340fa-list-library-messages
 */
export const listLibraryMessages: ActionFactory<
  {
    libraryId: string
    category?: string
    offset?: number
    bearerToken?: string
  },
  {
    elements: {
      id: string
      description: string
      category: string
    }[]
    nextPage: string | null
  }
> =
  (connectionOptions) =>
  async ({ libraryId, category, offset, bearerToken = undefined }) => {
    const route = `/API/v3/libraries/${libraryId}/messages`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const qs = new URLSearchParams()
      if (category) qs.append('category', category)
      if (offset) qs.append('offset', offset.toString())

      const config = {
        datacenterId: connectionOptions.datacenterId,
        route: qs.size > 0 ? route + '?' + qs.toString() : route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseListLibraryMessages(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
