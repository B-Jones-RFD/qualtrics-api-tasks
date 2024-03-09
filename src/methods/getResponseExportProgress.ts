import type { ActionFactory, FileProgressResponse } from '../types'
import { failure, getErrorMessage, getAuthHeaders } from '../utils'
import { safeParseFileProgressResponse } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 * Get Response Export File
 *
 * Implements Get Response Export Progress.  This is step 2 in the survey response file export process.
 * @see https://api.qualtrics.com/37e6a66f74ab4-get-response-export-progress
 */
export const getResponseExportProgress: ActionFactory<
  { exportProgressId: string; surveyId: string; bearerToken?: string },
  FileProgressResponse
> =
  (connectionOptions) =>
  async ({ exportProgressId, surveyId, bearerToken }) => {
    const route = `/surveys/${surveyId}/export-responses/${exportProgressId}`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseFileProgressResponse(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
