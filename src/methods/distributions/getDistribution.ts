import type { ActionFactory, Distribution } from '../../types'
import { failure, getErrorMessage, getAuthHeaders } from '../../utils'
import { safeParseGetDistribution } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 *  Get Distribution
 *
 * Implements Get Distribution
 * @see https://api.qualtrics.com/f5b1d8775d803-get-distribution
 */
export const getDistribution: ActionFactory<
  {
    distributionId: string
    surveyId: string
    bearerToken?: string
  },
  Distribution
> =
  (connectionOptions) =>
  async ({ distributionId, surveyId, bearerToken = undefined }) => {
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const qs = new URLSearchParams({ surveyId })
      const route = `/API/v3/distributions/${distributionId}?${qs.toString()}`

      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseGetDistribution(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
