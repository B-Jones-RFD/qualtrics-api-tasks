import type {
  ActionFactory,
  Contact,
  StartContactsImportOptions,
} from '../types'
import { failure, getErrorMessage, getAuthHeaders } from '../utils'
import { safeParseStartContactsImportResponse } from '../utils/parsers'
import { execute } from '../qualtrics'

/**
 *  Start Contacts Import
 *
 * Implements Create Transaction Contacts Import
 * @see https://api.qualtrics.com/bab13356ac724-create-transaction-contacts-import
 */
export const startContactsImport: ActionFactory<
  StartContactsImportOptions,
  {
    id: string
    contacts: Array<Contact>
    tracking: object
    status: string
  }
> = (connectionOptions) => async (options) => {
  const { directoryId, mailingListId, contacts, transactionMeta, bearerToken } =
    options
  const route = `/API/v3
/directories/${directoryId}/mailinglists/${mailingListId}/transactioncontacts`
  try {
    const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
    const body = JSON.stringify({
      transactionMeta,
      contacts,
    })
    const config = {
      datacenterId: connectionOptions.datacenterId,
      route,
      headers,
      body,
      timeout: connectionOptions.timeout,
    }
    const response = await execute(config)
    const result = safeParseStartContactsImportResponse(response)
    return result
  } catch (error) {
    const message = getErrorMessage(error)
    return failure(message)
  }
}
