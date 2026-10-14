import type { ResponseExportData, ResponseFormat, Result } from '../../types'
import { failure, success } from '../../utils'
import { readZip } from '../../zip'

// A zip archive starts with a local file header, or — when it has no
// entries — directly with the end-of-central-directory record.
const ZIP_SIGNATURES = new Set([0x04034b50, 0x06054b50])
const TEXT_FORMATS = new Set<ResponseFormat>([
  'csv',
  'tsv',
  'json',
  'ndjson',
  'xml',
])

/**
 * Decodes the file returned by `getResponseExportFile` / `exportResponses`.
 * Qualtrics returns a single-entry zip archive unless the export was started
 * with `compress: false`; either way the result is the export's contents —
 * a UTF-8 string for the text formats and a `Buffer` for `spss`.
 */
export function decodeResponseExport(
  file: Buffer,
  format: ResponseFormat = 'csv'
): Result<ResponseExportData> {
  let content = file
  if (file.length >= 4 && ZIP_SIGNATURES.has(file.readUInt32LE(0))) {
    const archive = readZip(file)
    if (!archive.success) return archive
    if (archive.data.length === 0)
      return failure('Response export archive is empty')
    if (archive.data.length > 1)
      return failure(
        `Response export archive has ${archive.data.length} entries; expected one`
      )
    content = archive.data[0].data
  }
  return success(TEXT_FORMATS.has(format) ? content.toString('utf8') : content)
}
