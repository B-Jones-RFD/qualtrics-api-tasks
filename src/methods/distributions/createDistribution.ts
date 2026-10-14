import type { ActionFactory, CreateDistributionOptions } from '../../types'
import { toFailure } from '../../errors'
import { safeParseCreateDistributionResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'

/**
 * Create Distribution
 *
 * Implements Create Distribution
 * @see https://api.qualtrics.com/8e8a6cc5bcdc1-create-distribution
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
    ...request
  }) => {
    try {
      const body = JSON.stringify({
        message: { libraryId, messageId, messageText },
        recipients: { mailingListId, contactId, transactionBatchId },
        header: { fromEmail, replyToEmail, fromName, subject },
        surveyLink: { surveyId, expirationDate, type },
        embeddedData,
        sendDate,
      })
      const response = await execute({
        connectionOptions,
        request,
        route: '/API/v3/distributions',
        body,
      })
      return safeParseCreateDistributionResponse(response)
    } catch (error) {
      return toFailure('createDistribution', error)
    }
  }
