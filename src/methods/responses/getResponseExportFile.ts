import type { ActionFactory, GetResponseExportFileOptions } from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseFile } from '../../utils/parsers'
import { execute } from '../../qualtrics'
import { createConnectionContext } from '../../context'
import { withRetry } from '../../retry'

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
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async ({ surveyId, fileId, ...request }) =>
    withRetry(connectionOptions.retry, request.signal, async () => {
      try {
        const response = await execute({
          connectionOptions,
          context,
          request,
          route: `/API/v3/surveys/${segment(surveyId)}/export-responses/${segment(
            fileId
          )}/file`,
          raw: true,
        })
        return safeParseFile(response)
      } catch (error) {
        return toFailure('getResponseExportFile', error)
      }
    })
