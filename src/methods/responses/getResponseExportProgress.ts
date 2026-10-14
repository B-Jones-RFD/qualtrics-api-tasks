import type {
  ActionFactory,
  FileProgressResponse,
  GetResponseExportProgressOptions,
} from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseFileProgressResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 * Get Response Export Progress
 *
 * Implements Get Response Export Progress. This is step 2 in the survey
 * response file export process.
 * @see https://api.qualtrics.com/37e6a66f74ab4-get-response-export-progress
 */
export const getResponseExportProgress: ActionFactory<
  GetResponseExportProgressOptions,
  FileProgressResponse
> =
  (connectionOptions) =>
  async ({ exportProgressId, surveyId, ...request }) => {
    try {
      const response = await execute({
        connectionOptions,
        request,
        route: `/API/v3/surveys/${segment(surveyId)}/export-responses/${segment(
          exportProgressId
        )}`,
      })
      return safeParseFileProgressResponse(response)
    } catch (error) {
      return toFailure('getResponseExportProgress', error)
    }
  }
