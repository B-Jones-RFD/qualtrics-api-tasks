import type {
  Result,
  ConnectionOptions,
  StartContactsImportOptions,
  CreateDistributionOptions,
  CreateReminderOptions,
} from '../types'
import { success, failure, getErrorMessage } from '../utils'
import {
  createMailingList,
  importContacts,
  createDistribution,
  createReminder,
} from './'

/**
 * Export Survey Response File
 *
 * Implements Survey Response File Export end to end
 * @see https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide
 */
export const distributeSurveys =
  <T>(connectionOptions: ConnectionOptions) =>
  async (options: {
    directoryId: string
    name: string
    ownerId: string
    prioritizeListMetadata?: boolean
    bearerToken?: string
  }): Promise<Result<string>> => {
    try {
      // Step 1: Create Mailing List
      const createMailingListAction = createMailingList(connectionOptions)
      const startResponse = await createMailingListAction(options)
      if (!startResponse.success) return failure(startResponse.error)

      // Step 2: Import Contacts
      const importOptions: StartContactsImportOptions<T> = {}
      const importContactsAction = importContacts(connectionOptions)
      const importResponse = await importContactsAction(importOptions)
      if (!importResponse.success) return failure(importResponse.error)

      // Step 3: Create Distribution
      const distributionOptions: CreateDistributionOptions = {}
      const createDistributionAction = createDistribution(connectionOptions)
      const distributionResponse =
        await createDistributionAction(distributionOptions)
      if (!distributionResponse.success)
        return failure(distributionResponse.error)

      // Step 4: Create Reminder
      const reminderOptions: CreateReminderOptions = {}
      const createReminderAction = createReminder(connectionOptions)
      const reminderResponse = await createReminderAction(reminderOptions)
      if (!reminderResponse.success) return failure(reminderResponse.error)
      return success(reminderResponse.data)
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
