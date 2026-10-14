import type { ActionFactory, CreateDistributionOptions } from '../../types'
import { toFailure } from '../../errors'
import { safeParseCreateDistributionResponse } from '../../utils/parsers'
import { execute } from '../../qualtrics'
import { createConnectionContext } from '../../context'

/**
 * Create Distribution
 *
 * Implements Create Distribution
 * @see https://api.qualtrics.com/573e3f0a94888-create-distribution
 */
export const createDistribution: ActionFactory<
  CreateDistributionOptions,
  string
> =
  (connectionOptions, context = createConnectionContext(connectionOptions)) =>
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
        context,
        request,
        route: '/API/v3/distributions',
        body,
      })
      return safeParseCreateDistributionResponse(response)
    } catch (error) {
      return toFailure('createDistribution', error)
    }
  }
