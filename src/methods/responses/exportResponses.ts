import type { ActionFactory, ExportResponsesOptions } from '../../types'
import { toFailure } from '../../errors'
import { failure, isFailedStatus } from '../../utils'
import { poll } from '../../utils/poll'
import { startResponseExport } from './startResponseExport'
import { getResponseExportFile } from './getResponseExportFile'
import { getResponseExportProgress } from './getResponseExportProgress'
import { createConnectionContext } from '../../context'

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
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async (responseOptions) => {
    try {
      const { surveyId, bearerToken, timeout, signal } = responseOptions
      const request = { bearerToken, timeout, signal }

      // Step 1
      const startResponse = await startResponseExport(
        connectionOptions,
        context
      )(responseOptions)
      if (!startResponse.success) return startResponse
      const exportProgressId = startResponse.data.progressId

      // Step 2
      const getProgress = getResponseExportProgress(connectionOptions, context)
      const progressResponse = await poll({
        fn: () => getProgress({ exportProgressId, surveyId, ...request }),
        validate: (res) =>
          !res.success ||
          res.data.percentComplete === 100 ||
          isFailedStatus(res.data.status),
        intervalMs: POLL_INTERVAL_MS,
        maxAttempts: POLL_MAX_ATTEMPTS,
      })
      if (!progressResponse.success) return progressResponse
      if (isFailedStatus(progressResponse.data.status))
        return failure(
          `Error in exportResponses: export failed with status '${progressResponse.data.status}'`,
          'HTTP'
        )
      if (progressResponse.data.percentComplete !== 100)
        return failure(
          `Error in exportResponses: export did not complete within ${
            (POLL_INTERVAL_MS * POLL_MAX_ATTEMPTS) / 1000
          } seconds (status '${progressResponse.data.status}', ${
            progressResponse.data.percentComplete
          }% complete)`,
          'TIMEOUT'
        )

      // Step 3
      return await getResponseExportFile(
        connectionOptions,
        context
      )({
        surveyId,
        fileId: progressResponse.data.fileId,
        ...request,
      })
    } catch (error) {
      return toFailure('exportResponses', error)
    }
  }
