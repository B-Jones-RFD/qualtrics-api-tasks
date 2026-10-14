import type { ConnectionFactory, ConnectionOptions } from './types'
import * as methods from './methods'

/**
 * Checks the shape of connection options and throws a `TypeError` describing
 * the first problem found, so a misconfiguration surfaces at construction
 * rather than as an opaque network error on the first request.
 */
export function validateConnectionOptions(options: ConnectionOptions): void {
  const { datacenterId, apiToken, timeout } = options
  if (typeof datacenterId !== 'string' || datacenterId.length === 0)
    throw new TypeError(
      'ConnectionOptions.datacenterId must be a non-empty string'
    )
  if (!/^[a-z0-9-]+$/i.test(datacenterId))
    throw new TypeError(
      `ConnectionOptions.datacenterId must be a datacenter id such as 'ca1' (got '${datacenterId}')`
    )
  if (apiToken !== undefined && typeof apiToken !== 'string')
    throw new TypeError('ConnectionOptions.apiToken must be a string')
  if (
    timeout !== undefined &&
    (typeof timeout !== 'number' || !Number.isFinite(timeout) || timeout <= 0)
  )
    throw new TypeError(
      'ConnectionOptions.timeout must be a positive number of milliseconds'
    )
}

/**
 * Binds every action to one Qualtrics datacenter.
 *
 * Credentials are captured in closures and reused for each call; nothing is
 * sent to Qualtrics until an action is invoked, so creating a connection
 * never performs network I/O. It does validate the shape of `options` and
 * throws a `TypeError` for an obvious misconfiguration.
 *
 * @throws {TypeError} When `options` are malformed.
 */
export const createConnection: ConnectionFactory = (options) => {
  validateConnectionOptions(options)
  return {
    createDistribution: methods.createDistribution(options),
    createMailingList: methods.createMailingList(options),
    createReminder: methods.createReminder(options),
    distributeSurveys: methods.distributeSurveys(options),
    exportResponses: methods.exportResponses(options),
    getBearerToken: methods.getBearerToken(options),
    getContactsImportStatus: methods.getContactsImportStatus(options),
    getContactsImportSummary: methods.getContactsImportSummary(options),
    getDistribution: methods.getDistribution(options),
    getResponseExportFile: methods.getResponseExportFile(options),
    getResponseExportProgress: methods.getResponseExportProgress(options),
    importContacts: methods.importContacts(options),
    listDistributions: methods.listDistributions(options),
    listLibraryMessages: methods.listLibraryMessages(options),
    startContactsImport: methods.startContactsImport(options),
    startResponseExport: methods.startResponseExport(options),
    testConnection: methods.testConnection(options),
  }
}
