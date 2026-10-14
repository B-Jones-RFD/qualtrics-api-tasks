import type {
  ActionFactory,
  ContactsImportStatusResponse,
  GetContactsImportStatusOptions,
} from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseContactsImportStatus } from '../../utils/parsers'
import { execute } from '../../qualtrics'
import { createConnectionContext } from '../../context'
import { withRetry } from '../../retry'

/**
 * Get Contacts Import Status
 *
 * Implements Get Transaction Contacts Import Status. This is step 2 in the
 * contacts import process.
 * @see https://api.qualtrics.com/1ac99fba8ca5b-contact-imports
 */
export const getContactsImportStatus: ActionFactory<
  GetContactsImportStatusOptions,
  ContactsImportStatusResponse
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
          )}/transactioncontacts/${segment(importId)}`,
        })
        return safeParseContactsImportStatus(response)
      } catch (error) {
        return toFailure('getContactsImportStatus', error)
      }
    })
