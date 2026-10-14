import type { ActionFactory, CreateReminderOptions } from '../../types'
import { toFailure } from '../../errors'
import { segment } from '../../utils'
import { safeParseCreateReminderResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 * Create Reminder
 *
 * Implements Create Reminder Distribution
 * @see https://api.qualtrics.com/f4e0d2c4c6a0e-create-reminder-distribution
 */
export const createReminder: ActionFactory<CreateReminderOptions, string> =
  (connectionOptions) =>
  async ({
    distributionId,
    libraryId,
    messageId,
    fromEmail,
    replyToEmail,
    fromName,
    subject,
    embeddedData,
    sendDate,
    ...request
  }) => {
    try {
      const body = JSON.stringify({
        message: { libraryId, messageId },
        header: { fromEmail, replyToEmail, fromName, subject },
        embeddedData,
        sendDate,
      })
      const response = await execute({
        connectionOptions,
        request,
        route: `/API/v3/distributions/${segment(distributionId)}/reminders`,
        body,
      })
      return safeParseCreateReminderResponse(response)
    } catch (error) {
      return toFailure('createReminder', error)
    }
  }
