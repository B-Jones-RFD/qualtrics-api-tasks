import type {
  ActionFactory,
  ExportResponsesOptions,
  FileProgressResponse,
  Result,
} from '../types'
import { failure, getErrorMessage } from '../utils'
import { poll } from '../utils/poll'
import {
  startResponseExport,
  getResponseExportFile,
  getResponseExportProgress,
} from './'

/**
 * Export Survey Response File
 *
 * Implements Survey Response File Export end to end
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
        fn: async () =>
          await exportProgressAction({
            exportProgressId: startResponse.data.progressId,
            surveyId: responseOptions.surveyId,
            bearerToken: responseOptions.bearerToken,
          }),
        validate: (res) => res.success && res.data.percentComplete === 100,
        interval: 1,
        maxAttempts: 60,
      })
      if (!progressResponse.success) return failure(progressResponse.error)

      // Step 3
      const getFileResponseAction = getResponseExportFile(connectionOptions)
      const fileResponse = await getFileResponseAction({
        surveyId: responseOptions.surveyId,
        fileId: progressResponse.data.fileId,
        bearerToken: responseOptions.bearerToken,
      })
      return fileResponse
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
