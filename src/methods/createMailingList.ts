import type { ActionFactory, CreateMailingListOptions } from '../types'
import { toFailure } from '../errors'
import { segment } from '../utils'
import { safeParseCreateMailingListResponse } from '../utils/parsers'
import { execute } from '../qualtrics'
import { createConnectionContext } from '../context'

/**
 * Create Mailing List
 *
 * Implements Create Mailing List
 * @see https://api.qualtrics.com/3f633e4cea6cd-create-mailing-list
 */
export const createMailingList: ActionFactory<
  CreateMailingListOptions,
  string
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async ({
    directoryId,
    name,
    ownerId,
    prioritizeListMetadata = false,
    ...request
  }) => {
    try {
      const response = await execute({
        connectionOptions,
        context,
        request,
        route: `/API/v3/directories/${segment(directoryId)}/mailinglists`,
        body: JSON.stringify({ name, ownerId, prioritizeListMetadata }),
      })
      return safeParseCreateMailingListResponse(response)
    } catch (error) {
      return toFailure('createMailingList', error)
    }
  }
