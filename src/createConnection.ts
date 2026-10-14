import type { ConnectionFactory, ConnectionOptions } from './types'
import * as methods from './methods'
import { createConnectionContext } from './context'

/**
 * Checks the shape of connection options and throws a `TypeError` describing
 * the first problem found, so a misconfiguration surfaces at construction
 * rather than as an opaque network error on the first request.
 */
export function validateConnectionOptions(options: ConnectionOptions): void {
  const { datacenterId, apiToken, oauth, timeout, retry } = options
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
  if (oauth !== undefined) {
    if (typeof oauth !== 'object' || oauth === null)
      throw new TypeError('ConnectionOptions.oauth must be an object')
    for (const key of ['clientId', 'clientSecret', 'scope'] as const) {
      if (typeof oauth[key] !== 'string' || oauth[key].length === 0)
        throw new TypeError(
          `ConnectionOptions.oauth.${key} must be a non-empty string`
        )
    }
  }
  if (retry !== undefined) {
    if (typeof retry !== 'object' || retry === null)
      throw new TypeError('ConnectionOptions.retry must be an object')
    for (const key of ['retries', 'baseDelayMs', 'maxDelayMs'] as const) {
      const value = retry[key]
      if (value !== undefined && (typeof value !== 'number' || value < 0))
        throw new TypeError(
          `ConnectionOptions.retry.${key} must be a non-negative number`
        )
    }
    if (retry.retryOn !== undefined && typeof retry.retryOn !== 'function')
      throw new TypeError('ConnectionOptions.retry.retryOn must be a function')
  }
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
  const context = createConnectionContext(options)
  return {
    createDistribution: methods.createDistribution(options, context),
    createMailingList: methods.createMailingList(options, context),
    createReminder: methods.createReminder(options, context),
    distributeSurveys: methods.distributeSurveys(options, context),
    exportResponses: methods.exportResponses(options, context),
    exportResponsesWithProgress: methods.exportResponsesWithProgress(
      options,
      context
    ),
    exportResponseData: methods.exportResponseData(options, context),
    getBearerToken: methods.getBearerToken(options),
    getContactsImportStatus: methods.getContactsImportStatus(options, context),
    getContactsImportSummary: methods.getContactsImportSummary(
      options,
      context
    ),
    getDistribution: methods.getDistribution(options, context),
    getNextDistributionsPage: methods.getNextDistributionsPage(
      options,
      context
    ),
    getNextLibraryMessagesPage: methods.getNextLibraryMessagesPage(
      options,
      context
    ),
    iterateDistributions: methods.iterateDistributions(options, context),
    iterateLibraryMessages: methods.iterateLibraryMessages(options, context),
    listAllDistributions: methods.listAllDistributions(options, context),
    listAllLibraryMessages: methods.listAllLibraryMessages(options, context),
    getResponseExportFile: methods.getResponseExportFile(options, context),
    getResponseExportProgress: methods.getResponseExportProgress(
      options,
      context
    ),
    importContacts: methods.importContacts(options, context),
    listDistributions: methods.listDistributions(options, context),
    listLibraryMessages: methods.listLibraryMessages(options, context),
    startContactsImport: methods.startContactsImport(options, context),
    startResponseExport: methods.startResponseExport(options, context),
    testConnection: methods.testConnection(options, context),
  }
}
