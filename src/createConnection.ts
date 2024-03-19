import type { ConnectionFactory } from './types'
import * as methods from './methods'

export const createConnection: ConnectionFactory = (options) => ({
  createDistribution: methods.createDistribution(options),
  createMailingList: methods.createMailingList(options),
  createReminder: methods.createReminder(options),
  distributeSurveys: methods.distributeSurveys(options),
  exportResponses: methods.exportResponses(options),
  getBearerToken: methods.getBearerToken(options),
  getContactsImportStatus: methods.getContactsImportStatus(options),
  getContactsImportSummary: methods.getContactsImportSummary(options),
  getResponseExportFile: methods.getResponseExportFile(options),
  getResponseExportProgress: methods.getResponseExportProgress(options),
  importContacts: methods.importContacts(options),
  startContactsImport: methods.startContactsImport(options),
  startResponseExport: methods.startResponseExport(options),
  testConnection: methods.testConnection(options),
})
