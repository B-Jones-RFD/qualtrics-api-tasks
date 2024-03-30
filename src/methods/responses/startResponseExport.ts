import type { ActionFactory, ExportResponsesOptions } from '../../types'
import { failure, getErrorMessage, getAuthHeaders } from '../../utils'
import { safeParseStartFileExportResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 *  Start Response Export
 *
 * Implements Start Response File Export
 * @see https://api.qualtrics.com/6b00592b9c013-start-response-export
 */
export const startResponseExport: ActionFactory<
  ExportResponsesOptions,
  {
    progressId: string
    percentComplete: number
    status: string
    continuationToken?: string
  }
> =
  (connectionOptions) =>
  async ({
    surveyId,
    startDate,
    endDate,
    format = 'csv' as const,
    bearerToken = undefined,
    ...rest
  }) => {
    const route = `/API/v3/surveys/${surveyId}/export-responses`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const body = JSON.stringify({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        format,
        ...rest,
      })
      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        body,
        timeout: connectionOptions.timeout,
      }

      const response = await execute(config)
      const result = safeParseStartFileExportResponse(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
