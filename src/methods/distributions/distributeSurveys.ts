import type { DistributionOptions, ActionFactory } from '../../types'
import { success, failure, getErrorMessage } from '../../utils'
import { createMailingList } from '../createMailingList'
import { importContacts } from '../contacts/importContacts'
import { createDistribution } from './createDistribution'
import { createReminder } from './createReminder'

/**
 * Export Survey Response File
 *
 * Implements Survey Response File Export end to end
 * @see https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide
 */
export const distributeSurveys: ActionFactory<DistributionOptions, string> =
  (connectionOptions) => async (options) => {
    try {
      // Step 1: Create Mailing List
      const createMailingListAction = createMailingList(connectionOptions)
      const startResponse = await createMailingListAction({
        directoryId: options.directoryId,
        name: options.mailingListName,
        ownerId: options.ownerId,
        prioritizeListMetadata: options.prioritizeListMetadata,
        bearerToken: options.bearerToken,
      })
      if (!startResponse.success) return failure(startResponse.error)

      // Step 2: Import Contacts
      const importContactsAction = importContacts(connectionOptions)
      const importResponse = await importContactsAction({
        directoryId: options.directoryId,
        mailingListId: startResponse.data,
        contacts: options.contacts,
        transactionMeta: options.transactionMeta,
        bearerToken: options.bearerToken,
      })
      if (!importResponse.success) return failure(importResponse.error)

      // Step 3: Create Distribution
      const createDistributionAction = createDistribution(connectionOptions)
      const distributionResponse = await createDistributionAction({
        libraryId: options.libraryId,
        messageId: options.distributionMessageId,
        messageText: options.distributionMessageText,
        mailingListId: startResponse.data,
        fromEmail: options.fromEmail,
        fromName: options.fromName,
        replyToEmail: options.replyToEmail,
        subject: options.distributionSubject,
        surveyId: options.surveyId,
        expirationDate: options.expirationDate,
        type: options.type,
        embeddedData: options.embeddedData,
        sendDate: options.distributionSendDate,
        bearerToken: options.bearerToken,
      })
      if (!distributionResponse.success)
        return failure(distributionResponse.error)

      // Step 4: Create Reminder
      const createReminderAction = createReminder(connectionOptions)
      const reminderResponse = await createReminderAction({
        distributionId: distributionResponse.data,
        libraryId: options.libraryId,
        messageId: options.reminderMessageId,
        fromEmail: options.fromEmail,
        fromName: options.fromName,
        replyToEmail: options.replyToEmail,
        subject: options.reminderSubject,
        embeddedData: options.embeddedData,
        sendDate: options.reminderSendDate,
        bearerToken: options.bearerToken,
      })
      if (!reminderResponse.success) return failure(reminderResponse.error)
      return success(reminderResponse.data)
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
