import type {
  ActionFactory,
  Distribution,
  GetDistributionOptions,
} from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseGetDistribution } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 * Get Distribution
 *
 * Implements Get Distribution
 * @see https://api.qualtrics.com/437447486ad95-get-distribution
 */
export const getDistribution: ActionFactory<
  GetDistributionOptions,
  Distribution
> =
  (connectionOptions) =>
  async ({ distributionId, surveyId, ...request }) => {
    try {
      const qs = new URLSearchParams({ surveyId })
      const response = await execute({
        connectionOptions,
        request,
        route: `/API/v3/distributions/${segment(distributionId)}?${qs.toString()}`,
      })
      return safeParseGetDistribution(response)
    } catch (error) {
      return toFailure('getDistribution', error)
    }
  }
