import type { ActionFactory } from '../types'
import { failure, getErrorMessage, getAuthHeaders } from '../utils'
import { execute } from '../qualtrics'

/**
 * Get Response Export File
 *
 * Implements Get Response Export File.  This is step 3 in the survey response file export process.
 * @see https://api.qualtrics.com/41296b6f2e828-get-response-export-file
 */
export const getResponseExportFile: ActionFactory<
  { surveyId: string; fileId: string; bearerToken?: string },
  Buffer
> =
  (connectionOptions) =>
  async ({ surveyId, fileId, bearerToken }) => {
    const route = `/API/v3/surveys/${surveyId}/export-responses/${fileId}/file`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      return response
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
