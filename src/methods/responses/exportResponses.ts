import type {
  ActionFactory,
  ConnectionContext,
  ConnectionOptions,
  ExportResponsesOptions,
  ResponseExportData,
  ResponseExportResult,
  Result,
} from '../../types'
import { toFailure } from '../../errors'
import { createConnectionContext } from '../../context'
import { failure, isFailedStatus } from '../../utils'
import { poll, resolvePoll } from '../../utils/poll'
import { startResponseExport } from './startResponseExport'
import { getResponseExportFile } from './getResponseExportFile'
import { getResponseExportProgress } from './getResponseExportProgress'
import { decodeResponseExport } from './decodeResponseExport'

/** Shared implementation of the export workflows; `action` names the caller in failures. */
async function runExport(
  action: string,
  connectionOptions: ConnectionOptions,
  context: ConnectionContext,
  { poll: pollOptions, ...exportOptions }: ExportResponsesOptions
): Promise<Result<ResponseExportResult>> {
  try {
    const { surveyId, bearerToken, timeout, signal } = exportOptions
    const request = { bearerToken, timeout, signal }
    const { intervalMs, maxAttempts } = resolvePoll(pollOptions)

    // Step 1
    const startResponse = await startResponseExport(
      connectionOptions,
      context
    )(exportOptions)
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
      intervalMs,
      maxAttempts,
    })
    if (!progressResponse.success) return progressResponse
    const progress = progressResponse.data
    if (isFailedStatus(progress.status)) {
      const reason = [progress.error?.code, progress.error?.message]
        .filter(Boolean)
        .join(': ')
      const failed = failure(
        `Error in ${action}: export failed with status '${progress.status}'${
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
        `Error in ${action}: export did not complete within ${
          (intervalMs * maxAttempts) / 1000
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
      exportOptions.format ?? 'csv'
    )
    if (!decoded.success)
      return { ...decoded, error: `Error in ${action}: ${decoded.error}` }
    return { success: true, data: { data: decoded.data, progress } }
  } catch (error) {
    return toFailure(action, error)
  }
}

/**
 * Export Survey Responses
 *
 * Implements Survey Response File Export end to end: starts the export,
 * polls its progress (once a second for up to five minutes unless `poll`
 * says otherwise) until it is complete, downloads the file and decodes it.
 * The data is the export's contents — a UTF-8 string for
 * `csv`/`tsv`/`json`/`ndjson`/`xml` and a `Buffer` for `spss` — whether or
 * not Qualtrics compressed it. Use {@link exportResponsesWithProgress} to
 * also receive the `continuationToken`, or the three-step actions for the
 * raw bytes.
 * @see https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide
 */
export const exportResponses: ActionFactory<
  ExportResponsesOptions,
  ResponseExportData
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async (options) => {
    const res = await runExport(
      'exportResponses',
      connectionOptions,
      context,
      options
    )
    return res.success ? { success: true, data: res.data.data } : res
  }

/**
 * Export Survey Responses (with progress)
 *
 * The same workflow as {@link exportResponses}; the data also carries the
 * final progress record, so the `continuationToken` of an export started
 * with `allowContinuation` (or a previous token) can be kept for the next
 * incremental export.
 * @see https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide
 */
export const exportResponsesWithProgress: ActionFactory<
  ExportResponsesOptions,
  ResponseExportResult
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  (options) =>
    runExport(
      'exportResponsesWithProgress',
      connectionOptions,
      context,
      options
    )
