import type {
  ActionFactory,
  Result,
  ContactsImportSummaryResponse,
  StartContactsImportOptions,
  ContactsImportStatusResponse,
} from '../../types'
import { failure, getErrorMessage } from '../../utils'
import { poll } from '../../utils/poll'
import { startContactsImport } from './startContactsImport'
import { getContactsImportStatus } from './getContactsImportStatus'
import { getContactsImportSummary } from './getContactsImportSummary'

/**
 * Import Contacts
 *
 * Implements import contacts end to end
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
      fn: async () =>
        await importProgressAction({
          directoryId: importOptions.directoryId,
          importId: startResponse.data.id,
          mailingListId: importOptions.mailingListId,
          bearerToken: importOptions.bearerToken,
        }),
      validate: (res) => res.success && res.data.percentComplete === 100,
      interval: 1,
      maxAttempts: 60,
    })
    if (!progressResponse.success) return failure(progressResponse.error)

    // Step 3
    const getContactImportSummaryAction =
      getContactsImportSummary(connectionOptions)
    const fileResponse = await getContactImportSummaryAction({
      directoryId: importOptions.directoryId,
      importId: startResponse.data.id,
      mailingListId: importOptions.mailingListId,
      bearerToken: importOptions.bearerToken,
    })
    return fileResponse
  } catch (error) {
    const message = getErrorMessage(error)
    return failure(message)
  }
}
