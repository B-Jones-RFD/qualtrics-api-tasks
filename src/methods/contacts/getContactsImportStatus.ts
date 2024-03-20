import type { ActionFactory, ContactsImportStatusResponse } from '../../types'
import { failure, getErrorMessage, getAuthHeaders } from '../../utils'
import { safeParseContactsImportStatus } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 *  Get Contacts Import Status
 *
 * Implements Get Transaction Contacts Import Status
 * @see https://api.qualtrics.com/c5d22705b1d45-get-transaction-contacts-import-status
 */
export const getContactsImportStatus: ActionFactory<
  {
    directoryId: string
    importId: string
    mailingListId: string
    bearerToken?: string
  },
  ContactsImportStatusResponse
> =
  (connectionOptions) =>
  async ({ directoryId, importId, mailingListId, bearerToken = undefined }) => {
    const route = `/API/v3
/directories/${directoryId}/mailinglists/${mailingListId}/transactioncontacts/${importId}`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseContactsImportStatus(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
