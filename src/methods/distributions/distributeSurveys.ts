import type { ActionFactory, DistributionOptions } from '../../types'
import { toFailure } from '../../errors'
import { createMailingList } from '../createMailingList'
import { importContacts } from '../contacts/importContacts'
import { createDistribution } from './createDistribution'
import { createReminder } from './createReminder'
import { createConnectionContext } from '../../context'

/**
 * Distribute Surveys
 *
 * Implements survey distribution end to end: creates a mailing list, imports
 * the contacts, creates the distribution and schedules a reminder. The data
 * is the reminder's distribution id.
 */
export const distributeSurveys: ActionFactory<DistributionOptions, string> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
  async (options) => {
    try {
      const request = {
        bearerToken: options.bearerToken,
        timeout: options.timeout,
        signal: options.signal,
      }

      // Step 1: Create Mailing List
      const mailingList = await createMailingList(
        connectionOptions,
        context
      )({
        directoryId: options.directoryId,
        name: options.mailingListName,
        ownerId: options.ownerId,
        prioritizeListMetadata: options.prioritizeListMetadata,
        ...request,
      })
      if (!mailingList.success) return mailingList
      const mailingListId = mailingList.data

      // Step 2: Import Contacts
      const imported = await importContacts(
        connectionOptions,
        context
      )({
        directoryId: options.directoryId,
        mailingListId,
        contacts: options.contacts,
        transactionMeta: options.transactionMeta,
        poll: options.poll,
        ...request,
      })
      if (!imported.success) return imported

      // Step 3: Create Distribution
      const distribution = await createDistribution(
        connectionOptions,
        context
      )({
        libraryId: options.libraryId,
        messageId: options.distributionMessageId,
        messageText: options.distributionMessageText,
        mailingListId,
        transactionBatchId: options.transactionBatchId,
        fromEmail: options.fromEmail,
        fromName: options.fromName,
        replyToEmail: options.replyToEmail,
        subject: options.distributionSubject,
        surveyId: options.surveyId,
        expirationDate: options.expirationDate,
        type: options.type,
        embeddedData: options.embeddedData,
        sendDate: options.distributionSendDate,
        ...request,
      })
      if (!distribution.success) return distribution

      // Step 4: Create Reminder
      return await createReminder(
        connectionOptions,
        context
      )({
        distributionId: distribution.data,
        libraryId: options.libraryId,
        messageId: options.reminderMessageId,
        fromEmail: options.fromEmail,
        fromName: options.fromName,
        replyToEmail: options.replyToEmail,
        subject: options.reminderSubject,
        embeddedData: options.embeddedData,
        sendDate: options.reminderSendDate,
        ...request,
      })
    } catch (error) {
      return toFailure('distributeSurveys', error)
    }
  }
