import type {
  ActionFactory,
  ContactsImportSummaryResponse,
  GetContactsImportSummaryOptions,
} from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseContactsImportSummary } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 * Get Contacts Import Summary
 *
 * Implements Get Transaction Contacts Import Summary. This is step 3 in the
 * contacts import process.
 * @see https://api.qualtrics.com/1ac99fba8ca5b-contact-imports
 */
export const getContactsImportSummary: ActionFactory<
  GetContactsImportSummaryOptions,
  ContactsImportSummaryResponse
> =
  (connectionOptions) =>
  async ({ directoryId, importId, mailingListId, ...request }) => {
    try {
      const response = await execute({
        connectionOptions,
        request,
        route: `/API/v3/directories/${segment(directoryId)}/mailinglists/${segment(
          mailingListId
        )}/transactioncontacts/${segment(importId)}/summary`,
      })
      return safeParseContactsImportSummary(response)
    } catch (error) {
      return toFailure('getContactsImportSummary', error)
    }
  }
