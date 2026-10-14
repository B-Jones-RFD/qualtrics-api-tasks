import type {
  ActionFactory,
  StartResponseExportOptions,
  StartResponseExportResponse,
} from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseStartFileExportResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'
import { createConnectionContext } from '../../context'

/**
 * Start Response Export
 *
 * Implements Start Response Export. This is step 1 in the survey response
 * file export process.
 * @see https://api.qualtrics.com/6b00592b9c013-start-response-export
 */
export const startResponseExport: ActionFactory<
  StartResponseExportOptions,
  StartResponseExportResponse
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async ({
    surveyId,
    startDate,
    endDate,
    format = 'csv',
    bearerToken,
    timeout,
    signal,
    ...rest
  }) => {
    try {
      const response = await execute({
        connectionOptions,
        context,
        request: { bearerToken, timeout, signal },
        route: `/API/v3/surveys/${segment(surveyId)}/export-responses`,
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          format,
          ...rest,
        }),
      })
      return safeParseStartFileExportResponse(response)
    } catch (error) {
      return toFailure('startResponseExport', error)
    }
  }
