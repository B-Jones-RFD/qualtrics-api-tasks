import type { ActionFactory, CreateReminderOptions } from '../../types'
import { failure, getErrorMessage, getAuthHeaders } from '../../utils'
import { safeParseCreateReminderResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 *  Create Reminder
 *
 * Implements Create Reminder Distribution
 * @see https://api.qualtrics.com/764630bb0633a-create-reminder-distribution
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
    bearerToken = undefined,
  }) => {
    const route = `/API/v3/distributions/${distributionId}/reminders`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const body = JSON.stringify({
        message: {
          libraryId,
          messageId,
        },
        header: {
          fromEmail,
          replyToEmail,
          fromName,
          subject,
        },
        embeddedData,
        sendDate,
      })
      const config = {
        datacenterId: connectionOptions.datacenterId,
        route,
        headers,
        body,
        timeout: connectionOptions.timeout,
      }
      const response = await execute(config)
      const result = safeParseCreateReminderResponse(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
