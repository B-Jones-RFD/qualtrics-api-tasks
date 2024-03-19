export type Success<T> = { success: true; data: T }

export type Failure = { success: false; error: string }

export type Result<T> = Success<T> | Failure

export type ResponseFormat = 'csv' | 'json' | 'ndjson' | 'spss' | 'tsv' | 'xml'

export type Contact = unknown

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
  messageId: string
  messageText?: string
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
