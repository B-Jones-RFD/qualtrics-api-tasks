import type {
  ActionFactory,
  ContactsImportSummaryResponse,
  GetContactsImportSummaryOptions,
} from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseContactsImportSummary } from '../../utils/parsers'
import { execute } from '../../qualtrics'
import { createConnectionContext } from '../../context'
import { withRetry } from '../../retry'

/**
 * Get Contacts Import Summary
 *
 * Implements Get Transaction Contacts Import Summary. This is step 3 in the
 * contacts import process.
 * @see https://api.qualtrics.com/6f0480b307053-get-transaction-contacts-import-summary
 */
export const getContactsImportSummary: ActionFactory<
  GetContactsImportSummaryOptions,
  ContactsImportSummaryResponse
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async ({ directoryId, importId, mailingListId, ...request }) =>
    withRetry(connectionOptions.retry, request.signal, async () => {
      try {
        const response = await execute({
          connectionOptions,
          context,
          request,
          route: `/API/v3/directories/${segment(directoryId)}/mailinglists/${segment(
            mailingListId
          )}/transactioncontacts/${segment(importId)}/summary`,
        })
        return safeParseContactsImportSummary(response)
      } catch (error) {
        return toFailure('getContactsImportSummary', error)
      }
    })
