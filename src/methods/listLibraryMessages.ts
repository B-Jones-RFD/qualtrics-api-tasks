import type {
  ActionFactory,
  LibraryMessage,
  ListLibraryMessagesOptions,
  PagedResponse,
} from '../types'
import { toFailure } from '../errors'
import { segment } from '../utils'
import { safeParseListLibraryMessages } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 * List Library Messages
 *
 * Implements List Library Messages
 * @see https://api.qualtrics.com/1d60a66b340fa-list-library-messages
 */
export const listLibraryMessages: ActionFactory<
  ListLibraryMessagesOptions,
  PagedResponse<LibraryMessage>
> =
  (connectionOptions) =>
  async ({ libraryId, category, offset, ...request }) => {
    try {
      const qs = new URLSearchParams()
      if (category) qs.append('category', category)
      if (offset) qs.append('offset', offset.toString())
      const route = `/API/v3/libraries/${segment(libraryId)}/messages`
      const response = await execute({
        connectionOptions,
        request,
        route: qs.size > 0 ? `${route}?${qs.toString()}` : route,
      })
      return safeParseListLibraryMessages(response)
    } catch (error) {
      return toFailure('listLibraryMessages', error)
    }
  }
