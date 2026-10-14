import type {
  ActionFactory,
  ExportResponsesOptions,
  FileProgressResponse,
  Result,
} from '../../types'
import { failure, getErrorMessage, isFailedStatus } from '../../utils'
import { poll } from '../../utils/poll'
import { startResponseExport } from './startResponseExport'
import { getResponseExportFile } from './getResponseExportFile'
import { getResponseExportProgress } from './getResponseExportProgress'

const POLL_INTERVAL_MS = 1000
const POLL_MAX_ATTEMPTS = 300

/**
 * Export Survey Response File
 *
 * Implements Survey Response File Export end to end: starts the export,
 * polls its progress once a second (up to five minutes) and downloads the
 * file. The data is a zip archive unless `compress: false` was passed.
 * @see https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide
 */
export const exportResponses: ActionFactory<ExportResponsesOptions, Buffer> =
  (connectionOptions) => async (responseOptions) => {
    try {
      // Step 1
      const startResponseAction = startResponseExport(connectionOptions)
      const startResponse = await startResponseAction(responseOptions)
      if (!startResponse.success) return failure(startResponse.error)

      // Step 2
      const exportProgressAction = getResponseExportProgress(connectionOptions)
      const progressResponse = await poll<Result<FileProgressResponse>>({
        fn: () =>
          exportProgressAction({
            exportProgressId: startResponse.data.progressId,
            surveyId: responseOptions.surveyId,
            bearerToken: responseOptions.bearerToken,
          }),
        validate: (res) =>
          !res.success ||
          res.data.percentComplete === 100 ||
          isFailedStatus(res.data.status),
        intervalMs: POLL_INTERVAL_MS,
        maxAttempts: POLL_MAX_ATTEMPTS,
      })
      if (!progressResponse.success) return failure(progressResponse.error)
      if (isFailedStatus(progressResponse.data.status))
        return failure(
          `Response export failed with status '${progressResponse.data.status}'`
        )
      if (progressResponse.data.percentComplete !== 100)
        return failure(
          `Response export did not complete within ${
            (POLL_INTERVAL_MS * POLL_MAX_ATTEMPTS) / 1000
          } seconds (status '${progressResponse.data.status}', ${
            progressResponse.data.percentComplete
          }% complete)`
        )

      // Step 3
      const getFileResponseAction = getResponseExportFile(connectionOptions)
      return await getFileResponseAction({
        surveyId: responseOptions.surveyId,
        fileId: progressResponse.data.fileId,
        bearerToken: responseOptions.bearerToken,
      })
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
