import type {
  ActionFactory,
  ExportResponsesOptions,
  ResponseExportData,
} from '../../types'
import { exportResponses } from './exportResponses'

/**
 * Export Survey Responses (decoded)
 *
 * @deprecated Since 1.0 {@link exportResponses} returns the decoded export
 * itself; this alias will be removed in 2.0.
 */
export const exportResponseData: ActionFactory<
  ExportResponsesOptions,
  ResponseExportData
> = exportResponses
