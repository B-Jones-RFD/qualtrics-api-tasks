import type { ActionFactory, GetResponseExportFileOptions } from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseFile } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 * Get Response Export File
 *
 * Implements Get Response Export File. This is step 3 in the survey response
 * file export process. The data is the file body as a `Buffer` — a zip
 * archive unless the export was started with `compress: false`.
 * @see https://api.qualtrics.com/41296b6f2e828-get-response-export-file
 */
export const getResponseExportFile: ActionFactory<
  GetResponseExportFileOptions,
  Buffer
> =
  (connectionOptions) =>
  async ({ surveyId, fileId, ...request }) => {
    try {
      const response = await execute({
        connectionOptions,
        request,
        route: `/API/v3/surveys/${segment(surveyId)}/export-responses/${segment(
          fileId
        )}/file`,
      })
      return safeParseFile(response)
    } catch (error) {
      return toFailure('getResponseExportFile', error)
    }
  }
