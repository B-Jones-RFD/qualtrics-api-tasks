import type { ActionFactory, ContactsImportSummaryResponse } from '../types'
import { failure, getErrorMessage, getAuthHeaders } from '../utils'
import { safeParseContactsImportSummary } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 *  Confirm Add Contacts
 *
 * Implements Create Transaction Contacts Import
 * @see https://api.qualtrics.com/6f0480b307053-get-transaction-contacts-import-summary
 */
export const getContactsImportSummary: ActionFactory<
  {
    directoryId: string
    importId: string
    mailingListId: string
    bearerToken?: string
  },
  ContactsImportSummaryResponse
> =
  (connectionOptions) =>
  async ({ directoryId, importId, mailingListId, bearerToken = undefined }) => {
    const route = `/API/v3
/directories/${directoryId}/mailinglists/${mailingListId}/transactioncontacts/${importId}/summary`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseContactsImportSummary(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
