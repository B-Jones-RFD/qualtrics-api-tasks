import type {
  ActionFactory,
  ContactsImportSummaryResponse,
  ImportContactsOptions,
} from '../../types'
import { toFailure } from '../../errors'
import { failure, isFailedStatus } from '../../utils'
import { poll } from '../../utils/poll'
import { startContactsImport } from './startContactsImport'
import { getContactsImportStatus } from './getContactsImportStatus'
import { getContactsImportSummary } from './getContactsImportSummary'
import { createConnectionContext } from '../../context'

const POLL_INTERVAL_MS = 1000
const POLL_MAX_ATTEMPTS = 300

/**
 * Import Contacts
 *
 * Implements import contacts end to end: starts the import, polls its status
 * once a second (up to five minutes) and returns the import summary.
 * @see https://api.qualtrics.com/1ac99fba8ca5b-contact-imports
 */
export const importContacts: ActionFactory<
  ImportContactsOptions,
  ContactsImportSummaryResponse
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async (importOptions) => {
    try {
      const { directoryId, mailingListId, bearerToken, timeout, signal } =
        importOptions
      const request = { bearerToken, timeout, signal }

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
        intervalMs: POLL_INTERVAL_MS,
        maxAttempts: POLL_MAX_ATTEMPTS,
      })
      if (!progressResponse.success) return progressResponse
      if (isFailedStatus(progressResponse.data.status))
        return failure(
          `Error in importContacts: import failed with status '${progressResponse.data.status}'`,
          'HTTP'
        )
      if (progressResponse.data.percentComplete !== 100)
        return failure(
          `Error in importContacts: import did not complete within ${
            (POLL_INTERVAL_MS * POLL_MAX_ATTEMPTS) / 1000
          } seconds (status '${progressResponse.data.status}', ${
            progressResponse.data.percentComplete
          }% complete)`,
          'TIMEOUT'
        )

      // Step 3
      return await getContactsImportSummary(
        connectionOptions,
        context
      )({
        directoryId,
        importId,
        mailingListId,
        ...request,
      })
    } catch (error) {
      return toFailure('importContacts', error)
    }
  }
