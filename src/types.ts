export type Success<T> = { success: true; data: T }

export type Failure = { success: false; error: string }

export type Result<T> = Success<T> | Failure

export type ResponseFormat = 'csv' | 'json' | 'ndjson' | 'spss' | 'tsv' | 'xml'

export type DistributionRequestType =
  | 'Invite'
  | 'ThankYou'
  | 'Reminder'
  | 'Email'
  | 'Portal'
  | 'PortalInvite'
  | 'GeneratedInvite'

export type Contact = {
  firstName?: string
  lastName?: string
  email: string
  extRef?: string
  embeddedData?: Record<string, string>
  language?: string
  unsubscribed?: boolean
  transactionData?: object
}

export type Distribution = {
  id: string
  parentDistributionId: string
  ownerId: string
  organizationId: string
  requestStatus: string
  requestType: DistributionRequestType
  sendDate: string
  createdDate: string
  modifiedDate: string
  headers: {
    fromEmail: string
    replyToEmail: string
    fromName: string
    subject: string
  }
  recipients: {
    mailingListId: string
    contactId: string
    libraryId: string
    sampleId: string
  }
  message: {
    libraryId: string
    messageId: string
    messageText: string
    messageType: string
  }
  surveyLink: {
    surveyId: string
    expirationDate: string
    linkType: 'Individual' | 'Multiple' | 'Anonymous'
  }
  stats: {
    sent: number
    failed: number
    started: number
    bounced: number
    opened: number
    skipped: number
    finished: number
    complaints: number
    blocked: number
  }
  embeddedData: Record<string, string>
}

export type Action<TConfig, TResponse> = (
  options: TConfig
) => Promise<Result<TResponse>>

export type ConnectionOptions = {
  datacenterId: string
  apiToken?: string
  timeout?: number
}

export type ActionFactory<TParams, TResponse> = (
  options: ConnectionOptions
) => Action<TParams, TResponse>

export type Connection = {
  createDistribution: Action<CreateDistributionOptions, string>
  createMailingList: Action<
    {
      directoryId: string
      name: string
      ownerId: string
      prioritizeListMetadata?: boolean
      bearerToken?: string
    },
    string
  >
  createReminder: Action<CreateReminderOptions, string>
  distributeSurveys: Action<DistributionOptions, string>
  exportResponses: Action<ExportResponsesOptions, Buffer>
  getBearerToken: Action<
    { clientId: string; clientSecret: string; scope: string },
    string
  >
  getContactsImportStatus: Action<
    {
      directoryId: string
      importId: string
      mailingListId: string
      bearerToken?: string
    },
    ContactsImportStatusResponse
  >
  getContactsImportSummary: Action<
    {
      directoryId: string
      importId: string
      mailingListId: string
      bearerToken?: string
    },
    ContactsImportSummaryResponse
  >
  getDistribution: Action<
    {
      distributionId: string
      surveyId: string
      bearerToken?: string
    },
    Distribution
  >
  getResponseExportFile: Action<
    { surveyId: string; fileId: string; bearerToken?: string },
    Buffer
  >
  getResponseExportProgress: Action<
    { exportProgressId: string; surveyId: string; bearerToken?: string },
    FileProgressResponse
  >
  importContacts: Action<
    StartContactsImportOptions,
    ContactsImportSummaryResponse
  >
  listDistributions: Action<
    {
      sendStartDate: Date
      sendEndDate: Date
      surveyId?: string
      distributionRequestType?: DistributionRequestType
      mailingListId?: string
      skipToken?: string
      useNewPaginationScheme?: boolean
      pageSize?: number
      bearerToken?: string
    },
    {
      elements: Distribution[]
      nextPage: string | null
    }
  >
  listLibraryMessages: Action<
    {
      libraryId: string
      category?: string
      offset?: number
      bearerToken?: string
    },
    {
      elements: {
        id: string
        description: string
        category: string
      }[]
      nextPage: string | null
    }
  >
  startContactsImport: Action<
    StartContactsImportOptions,
    {
      id: string
      contacts: Array<Contact>
      tracking: object
      status: string
    }
  >
  startResponseExport: Action<
    ExportResponsesOptions,
    {
      progressId: string
      percentComplete: number
      status: string
      continuationToken?: string
    }
  >
  testConnection: (bearerToken?: string) => Promise<Result<string>>
}

export type ConnectionFactory = (options: ConnectionOptions) => Connection

export type ExportResponsesOptions = {
  surveyId: string
  startDate: Date
  endDate: Date
  format?: ResponseFormat
  breakoutSets?: boolean
  compress?: boolean
  exportResponsesInProgress?: boolean
  filterId?: string
  formatDecimalAsComma?: boolean
  includeDisplayOrder?: boolean
  limit?: number
  multiselectSeenUnansweredRecode?: number
  newlineReplacement?: string
  seenUnansweredRecode?: number
  timeZone?: string
  useLabels?: boolean
  embeddedDataIds?: string[]
  questionIds?: string[]
  surveyMetadataIds?: string[]
  continuationToken?: string
  allowContinuation?: boolean
  includeLabelColumns?: boolean
  sortByLastModifiedDate?: boolean
  bearerToken?: string
}

export type CreateDistributionOptions = {
  libraryId: string
  messageId: string
  messageText?: string
  mailingListId: string
  contactId?: string
  transactionBatchId?: string
  fromEmail: string
  replyToEmail?: string
  fromName: string
  subject: string
  surveyId: string
  expirationDate: Date
  type: 'Individual' | 'Multiple' | 'Anonymous'
  embeddedData?: Record<string, string>
  sendDate: Date
  bearerToken?: string
}

export type CreateReminderOptions = {
  distributionId: string
  libraryId: string
  messageId: string
  fromEmail: string
  replyToEmail?: string
  fromName: string
  subject: string
  sendDate: Date
  embeddedData?: Record<string, string>
  bearerToken?: string
}

export type FileProgressResponse = {
  fileId: string
  percentComplete: number
  status: string
  continuationToken?: string
}

export type StartContactsImportOptions = {
  directoryId: string
  mailingListId: string
  contacts: Array<Contact>
  transactionMeta?: {
    fields: string[]
    batchId: string
  }
  bearerToken?: string
}

export type ContactsImportSummaryResponse = {
  percentComplete: number
  contacts: {
    count: {
      added: number
      updated: number
      failed: number
    }
  }
  invalidEmails: string[]
  transactions: {
    count: {
      created: number
    }
  }
  status: string
}

export type ContactsImportStatusResponse = {
  percentComplete: number
  contacts: {
    count: {
      added: number
      updated: number
      failed: number
    }
  }
  transactions: {
    count: {
      created: number
    }
  }
  status: string
}

export type DistributionOptions = {
  directoryId: string
  mailingListName: string
  ownerId: string
  prioritizeListMetadata?: boolean
  contacts: Array<Contact>
  transactionMeta?: {
    fields: string[]
    batchId: string
  }
  libraryId: string
  distributionMessageId: string
  distributionMessageText?: string
  reminderMessageId: string
  reminderMessageText?: string
  transactionBatchId?: string
  fromEmail: string
  replyToEmail?: string
  fromName: string
  distributionSubject: string
  reminderSubject: string
  surveyId: string
  expirationDate: Date
  type: 'Individual' | 'Multiple' | 'Anonymous'
  embeddedData?: Record<string, string>
  distributionSendDate: Date
  reminderSendDate: Date
  bearerToken?: string
}
