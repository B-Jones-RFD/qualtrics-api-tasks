import type { ActionFactory } from '../types'
import { failure, getErrorMessage, getAuthHeaders } from '../utils'
import { safeParseFileResponse } from '../utils/parsers'
import { execute } from '../qualtrics'

export const getResponseExportFile: ActionFactory<
  { surveyId: string; fileId: string; bearerToken?: string },
  Buffer
> =
  (connectionOptions) =>
  async ({ surveyId, fileId, bearerToken }) => {
    const route = `/surveys/${surveyId}/export-responses/${fileId}/file`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseFileResponse(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
