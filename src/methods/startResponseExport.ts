import type { ActionFactory, ExportResponsesOptions } from '../types'
import { failure, getErrorMessage, getAuthHeaders } from '../utils'
import { safeParseStartFileExportResponse } from '../utils/parsers'
import { execute } from '../qualtrics'

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
    const route = `/surveys/${surveyId}/export-responses`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const body = JSON.stringify({
        startDate: startDate.toISOString(),
        endDate: endDate.toDateString(),
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
