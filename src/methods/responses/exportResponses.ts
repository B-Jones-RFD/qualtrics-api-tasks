import type {
  ActionFactory,
  ExportResponsesOptions,
  ResponseExportData,
} from '../../types'
import { toFailure } from '../../errors'
import { createConnectionContext } from '../../context'
import { failure, isFailedStatus } from '../../utils'
import { poll } from '../../utils/poll'
import { startResponseExport } from './startResponseExport'
import { getResponseExportFile } from './getResponseExportFile'
import { getResponseExportProgress } from './getResponseExportProgress'
import { decodeResponseExport } from './decodeResponseExport'

const POLL_INTERVAL_MS = 1000
const POLL_MAX_ATTEMPTS = 300

/**
 * Export Survey Responses
 *
 * Implements Survey Response File Export end to end: starts the export,
 * polls its progress once a second (up to five minutes), downloads the file
 * and decodes it. The data is the export's contents — a UTF-8 string for
 * `csv`/`tsv`/`json`/`ndjson`/`xml` and a `Buffer` for `spss` — whether or
 * not Qualtrics compressed it. Use the three-step actions for the raw bytes.
 * @see https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide
 */
export const exportResponses: ActionFactory<
  ExportResponsesOptions,
  ResponseExportData
> =
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
          res.data.status === 'complete' ||
          isFailedStatus(res.data.status),
        intervalMs: POLL_INTERVAL_MS,
        maxAttempts: POLL_MAX_ATTEMPTS,
      })
      if (!progressResponse.success) return progressResponse
      const progress = progressResponse.data
      if (isFailedStatus(progress.status)) {
        const reason = [progress.error?.code, progress.error?.message]
          .filter(Boolean)
          .join(': ')
        const failed = failure(
          `Error in exportResponses: export failed with status '${progress.status}'${
            reason ? ` (${reason})` : ''
          }`,
          'HTTP'
        )
        if (progress.error)
          failed.details = {
            errorCode: progress.error.code,
            errorMessage: progress.error.message,
          }
        return failed
      }
      if (progress.status !== 'complete' || typeof progress.fileId !== 'string')
        return failure(
          `Error in exportResponses: export did not complete within ${
            (POLL_INTERVAL_MS * POLL_MAX_ATTEMPTS) / 1000
          } seconds (status '${progress.status}', ${
            progress.percentComplete
          }% complete)`,
          'TIMEOUT'
        )

      // Step 3
      const file = await getResponseExportFile(
        connectionOptions,
        context
      )({
        surveyId,
        fileId: progress.fileId,
        ...request,
      })
      if (!file.success) return file

      // Step 4
      const decoded = decodeResponseExport(
        file.data,
        responseOptions.format ?? 'csv'
      )
      return decoded.success
        ? decoded
        : { ...decoded, error: `Error in exportResponses: ${decoded.error}` }
    } catch (error) {
      return toFailure('exportResponses', error)
    }
  }
