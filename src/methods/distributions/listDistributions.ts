import type {
  ActionFactory,
  DistributionRequestType,
  Distribution,
} from '../../types'
import { failure, getErrorMessage, getAuthHeaders } from '../../utils'
import { safeParseListDistributions } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 * List Distributions
 *
 * Implements List Distributions
 * @see https://api.qualtrics.com/234bb6b16cf6d-list-distributions
 */
export const listDistributions: ActionFactory<
  {
    surveyId: string
    distributionRequestType: DistributionRequestType
    mailingListId: string
    sendStartDate: Date
    sendEndDate: Date
    skipToken?: string
    useNewPaginationScheme?: boolean
    pageSize?: number
    bearerToken?: string
  },
  {
    elements: Distribution[]
    nextPage: string | null
  }
> =
  (connectionOptions) =>
  async ({
    surveyId,
    distributionRequestType,
    mailingListId,
    sendStartDate,
    sendEndDate,
    skipToken,
    useNewPaginationScheme,
    pageSize,
    bearerToken = undefined,
  }) => {
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const qs = new URLSearchParams({
        surveyId,
        distributionRequestType,
        mailingListId,
        sendStartDate: sendStartDate.toISOString(),
        sendEndDate: sendEndDate.toISOString(),
      })
      if (skipToken) qs.append('skipToken', skipToken)
      if (useNewPaginationScheme)
        qs.append('useNewPaginationScheme', useNewPaginationScheme.toString())
      if (pageSize) qs.append('pageSize', pageSize.toString())

      const route = `/API/v3/distributions?${qs.toString()}`

      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseListDistributions(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
