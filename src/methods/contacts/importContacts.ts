import type {
  ActionFactory,
  ContactsImportSummaryResponse,
  ImportContactsOptions,
} from '../../types'
import { toFailure } from '../../errors'
import { failure, isFailedStatus } from '../../utils'
import { poll, resolvePoll } from '../../utils/poll'
import { startContactsImport } from './startContactsImport'
import { getContactsImportStatus } from './getContactsImportStatus'
import { createConnectionContext } from '../../context'

/**
 * Import Contacts
 *
 * Implements import contacts end to end: starts the import and polls its
 * status (once a second for up to five minutes unless `poll` says otherwise)
 * until it completes. The data is the final status response, which carries
 * the added/updated/failed counts and invalid emails. The deprecated summary
 * endpoint is no longer called.
 * @see https://api.qualtrics.com/1ac99fba8ca5b-contact-imports
 */
export const importContacts: ActionFactory<
  ImportContactsOptions,
  ContactsImportSummaryResponse
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async ({ poll: pollOptions, ...importOptions }) => {
    try {
      const { directoryId, mailingListId, bearerToken, timeout, signal } =
        importOptions
      const request = { bearerToken, timeout, signal }
      const { intervalMs, maxAttempts } = resolvePoll(pollOptions)

      // Step 1
      const startResponse = await startContactsImport(
        connectionOptions,
        context
      )(importOptions)
      if (!startResponse.success) return startResponse
      const importId = startResponse.data.id

      // Step 2
      const getStatus = getContactsImportStatus(connectionOptions, context)
      const progressResponse = await poll({
        fn: () =>
          getStatus({ directoryId, importId, mailingListId, ...request }),
        validate: (res) =>
          !res.success ||
          res.data.percentComplete === 100 ||
          isFailedStatus(res.data.status),
        intervalMs,
        maxAttempts,
      })
      if (!progressResponse.success) return progressResponse
      const status = progressResponse.data
      if (isFailedStatus(status.status))
        return failure(
          `Error in importContacts: import failed with status '${status.status}'`,
          'HTTP'
        )
      if (status.percentComplete !== 100)
        return failure(
          `Error in importContacts: import did not complete within ${
            (intervalMs * maxAttempts) / 1000
          } seconds (status '${status.status}', ${
            status.percentComplete
          }% complete)`,
          'TIMEOUT'
        )

      return {
        success: true,
        data: { ...status, invalidEmails: status.invalidEmails ?? [] },
      }
    } catch (error) {
      return toFailure('importContacts', error)
    }
  }
