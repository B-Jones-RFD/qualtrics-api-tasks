import type {
  ActionFactory,
  StartContactsImportOptions,
  StartContactsImportResponse,
} from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseStartContactsImportResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'
import { createConnectionContext } from '../../context'

/**
 * Start Contacts Import
 *
 * Implements Create Transaction Contacts Import. This is step 1 in the
 * contacts import process.
 * @see https://api.qualtrics.com/bab13356ac724-create-transaction-contacts-import
 */
export const startContactsImport: ActionFactory<
  StartContactsImportOptions,
  StartContactsImportResponse
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async ({
    directoryId,
    mailingListId,
    contacts,
    transactionMeta,
    ...request
  }) => {
    try {
      const response = await execute({
        connectionOptions,
        context,
        request,
        route: `/API/v3/directories/${segment(directoryId)}/mailinglists/${segment(
          mailingListId
        )}/transactioncontacts`,
        body: JSON.stringify({ transactionMeta, contacts }),
      })
      return safeParseStartContactsImportResponse(response)
    } catch (error) {
      return toFailure('startContactsImport', error)
    }
  }
