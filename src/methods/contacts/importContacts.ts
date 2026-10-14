import type {
  ActionFactory,
  Result,
  ContactsImportSummaryResponse,
  StartContactsImportOptions,
  ContactsImportStatusResponse,
} from '../../types'
import { failure, getErrorMessage, isFailedStatus } from '../../utils'
import { poll } from '../../utils/poll'
import { startContactsImport } from './startContactsImport'
import { getContactsImportStatus } from './getContactsImportStatus'
import { getContactsImportSummary } from './getContactsImportSummary'

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
  StartContactsImportOptions,
  ContactsImportSummaryResponse
> = (connectionOptions) => async (importOptions) => {
  try {
    // Step 1
    const startImportAction = startContactsImport(connectionOptions)
    const startResponse = await startImportAction(importOptions)
    if (!startResponse.success) return failure(startResponse.error)

    // Step 2
    const importProgressAction = getContactsImportStatus(connectionOptions)
    const progressResponse = await poll<Result<ContactsImportStatusResponse>>({
      fn: () =>
        importProgressAction({
          directoryId: importOptions.directoryId,
          importId: startResponse.data.id,
          mailingListId: importOptions.mailingListId,
          bearerToken: importOptions.bearerToken,
        }),
      validate: (res) =>
        !res.success ||
        res.data.percentComplete === 100 ||
        isFailedStatus(res.data.status),
      intervalMs: POLL_INTERVAL_MS,
      maxAttempts: POLL_MAX_ATTEMPTS,
    })
    if (!progressResponse.success) return failure(progressResponse.error)
    if (isFailedStatus(progressResponse.data.status))
      return failure(
        `Contacts import failed with status '${progressResponse.data.status}'`
      )
    if (progressResponse.data.percentComplete !== 100)
      return failure(
        `Contacts import did not complete within ${
          (POLL_INTERVAL_MS * POLL_MAX_ATTEMPTS) / 1000
        } seconds (status '${progressResponse.data.status}', ${
          progressResponse.data.percentComplete
        }% complete)`
      )

    // Step 3
    const getContactImportSummaryAction =
      getContactsImportSummary(connectionOptions)
    return await getContactImportSummaryAction({
      directoryId: importOptions.directoryId,
      importId: startResponse.data.id,
      mailingListId: importOptions.mailingListId,
      bearerToken: importOptions.bearerToken,
    })
  } catch (error) {
    const message = getErrorMessage(error)
    return failure(message)
  }
}
