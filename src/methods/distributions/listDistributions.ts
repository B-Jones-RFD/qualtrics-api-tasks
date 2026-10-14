import type {
  ActionFactory,
  Distribution,
  ListDistributionsOptions,
  PagedResponse,
} from '../../types'
import { toFailure } from '../../errors'
import { safeParseListDistributions } from '../../utils/parsers'
import { execute } from '../../qualtrics'
import { createConnectionContext } from '../../context'
import { withRetry } from '../../retry'

/**
 * List Distributions
 *
 * Implements List Distributions
 * @see https://api.qualtrics.com/234bb6b16cf6d-list-distributions
 */
export const listDistributions: ActionFactory<
  ListDistributionsOptions,
  PagedResponse<Distribution>
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async ({
    surveyId,
    distributionRequestType,
    mailingListId,
    sendStartDate,
    sendEndDate,
    skipToken,
    useNewPaginationScheme,
    pageSize,
    ...request
  }) =>
    withRetry(connectionOptions.retry, request.signal, async () => {
      try {
        const qs = new URLSearchParams({
          surveyId,
          sendStartDate: sendStartDate.toISOString(),
          sendEndDate: sendEndDate.toISOString(),
        })
        if (mailingListId) qs.append('mailingListId', mailingListId)
        if (distributionRequestType)
          qs.append('distributionRequestType', distributionRequestType)
        if (skipToken) qs.append('skipToken', skipToken)
        if (useNewPaginationScheme)
          qs.append('useNewPaginationScheme', useNewPaginationScheme.toString())
        if (pageSize) qs.append('pageSize', pageSize.toString())

        const response = await execute({
          connectionOptions,
          context,
          request,
          route: `/API/v3/distributions?${qs.toString()}`,
        })
        return safeParseListDistributions(response)
      } catch (error) {
        return toFailure('listDistributions', error)
      }
    })
