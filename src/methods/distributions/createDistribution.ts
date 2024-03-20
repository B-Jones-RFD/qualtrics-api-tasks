import type { ActionFactory, CreateDistributionOptions } from '../../types'
import { failure, getErrorMessage, getAuthHeaders } from '../../utils'
import { safeParseCreateDistributionResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 *  Create Distribution
 *
 * Implements Create Distribution
 * @see https://api.qualtrics.com/573e3f0a94888-create-distribution
 */
export const createDistribution: ActionFactory<
  CreateDistributionOptions,
  string
> =
  (connectionOptions) =>
  async ({
    libraryId,
    messageId,
    messageText,
    mailingListId,
    contactId,
    transactionBatchId,
    fromEmail,
    replyToEmail,
    fromName,
    subject,
    surveyId,
    expirationDate,
    type,
    embeddedData,
    sendDate,
    bearerToken = undefined,
  }) => {
    const route = `/API/v3/distributions`
    try {
      const headers = getAuthHeaders(connectionOptions.apiToken, bearerToken)
      const body = JSON.stringify({
        message: {
          libraryId,
          messageId,
          messageText,
        },
        recipients: {
          mailingListId,
          contactId,
          transactionBatchId,
        },
        header: {
          fromEmail,
          replyToEmail,
          fromName,
          subject,
        },
        surveyLink: {
          surveyId,
          expirationDate,
          type,
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
      const result = safeParseCreateDistributionResponse(response)
      return result
    } catch (error) {
      const message = getErrorMessage(error)
      return failure(message)
    }
  }
