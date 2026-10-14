import type {
  ActionFactory,
  ExportResponsesOptions,
  ResponseExportData,
} from '../../types'
import { createConnectionContext } from '../../context'
import { exportResponses } from './exportResponses'
import { decodeResponseExport } from './decodeResponseExport'

/**
 * Export Survey Responses (decoded)
 *
 * Runs {@link exportResponses} and decodes the downloaded file: the data is
 * the export's contents as a UTF-8 string for `csv`/`tsv`/`json`/`ndjson`/
 * `xml` and as a `Buffer` for `spss`, whether or not Qualtrics compressed it.
 * In 1.0 `exportResponses` itself will return this; use
 * `getResponseExportFile` for the raw bytes.
 */
export const exportResponseData: ActionFactory<
  ExportResponsesOptions,
  ResponseExportData
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async (options) => {
    const file = await exportResponses(connectionOptions, context)(options)
    if (!file.success) return file
    const decoded = decodeResponseExport(file.data, options.format ?? 'csv')
    return decoded.success
      ? decoded
      : { ...decoded, error: `Error in exportResponseData: ${decoded.error}` }
  }
