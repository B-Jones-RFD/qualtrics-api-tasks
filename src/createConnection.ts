import type { ConnectionFactory } from './types'
import * as methods from './methods'

export const createConnection: ConnectionFactory = (options) => ({
  exportResponses: methods.exportResponses(options),
  getBearerToken: methods.getBearerToken(options),
  getResponseExportProgress: methods.getResponseExportProgress(options),
  startResponseExport: methods.startResponseExport(options),
  testConnection: methods.testConnection(options),
})
