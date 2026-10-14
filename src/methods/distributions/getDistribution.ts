import type {
  ActionFactory,
  Distribution,
  GetDistributionOptions,
} from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseGetDistribution } from '../../utils/parsers'
import { execute } from '../../qualtrics'
import { createConnectionContext } from '../../context'
import { withRetry } from '../../retry'

/**
 * Get Distribution
 *
 * Implements Get Distribution
 * @see https://api.qualtrics.com/f5b1d8775d803-get-distribution
 */
export const getDistribution: ActionFactory<
  GetDistributionOptions,
  Distribution
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async ({ distributionId, surveyId, ...request }) =>
    withRetry(connectionOptions.retry, request.signal, async () => {
      try {
        const qs = new URLSearchParams({ surveyId })
        const response = await execute({
          connectionOptions,
          context,
          request,
          route: `/API/v3/distributions/${segment(distributionId)}?${qs.toString()}`,
        })
        return safeParseGetDistribution(response)
      } catch (error) {
        return toFailure('getDistribution', error)
      }
    })
