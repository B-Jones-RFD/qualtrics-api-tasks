/**
 * Public types for `@b-jones-rfd/qualtrics-api-tasks`.
 *
 * Every action resolves to a {@link Result} and never throws: check
 * `result.success` to narrow to {@link Success} or {@link Failure}.
 */

/** Successful action result. The payload is in `data`. */
export type Success<T> = { success: true; data: T }

/**
 * Classification of a {@link Failure}. Branch on this rather than on the
 * `error` text.
 *
 * - `HTTP`    — Qualtrics answered with a non-2xx status other than 401/403. See `status` and `details`.
 * - `AUTH`    — 401 or 403: bad or expired token, or insufficient permissions.
 * - `TIMEOUT` — the request did not complete within `timeout`.
 * - `ABORTED` — the request was cancelled through `signal`.
 * - `NETWORK` — DNS, connection or TLS failure before a response arrived.
 * - `PARSE`   — Qualtrics answered 2xx but the body was not in the expected shape.
 * - `UNKNOWN` — anything else.
 */
export type FailureCode =
  'HTTP' | 'AUTH' | 'TIMEOUT' | 'ABORTED' | 'NETWORK' | 'PARSE' | 'UNKNOWN'

/** The `meta.error` object Qualtrics returns in a failed response body, when present. */
export type QualtricsError = {
  /** Qualtrics error code, e.g. `'QEPL_1'`. */
  errorCode?: string
  /** Human-readable message from Qualtrics. */
  errorMessage?: string
  /** Request id reported by Qualtrics; quote it when contacting support. */
  requestId?: string
}

/**
 * Failed action result.
 *
 * `error` is a human-readable message prefixed with the action name, for
 * logging. `code` classifies the failure; `status` and `details` are present
 * for `HTTP`/`AUTH` failures when Qualtrics supplied them.
 */
export type Failure = {
  success: false
  error: string
  code: FailureCode
  /** HTTP status code, for `HTTP` and `AUTH` failures. */
  status?: number
  /** Parsed Qualtrics error body, when the response carried one. */
  details?: QualtricsError
  /**
   * How long the server asked clients to wait before retrying, from a
   * `Retry-After` header (429/503), in milliseconds.
   */
  retryAfterMs?: number
}

/**
 * Discriminated union returned by every action.
 *
 * @example
 * const res = await connection.testConnection()
 * if (res.success) console.log(res.data)
 * else console.error(res.code, res.error)
 */
export type Result<T> = Success<T> | Failure

/** An asynchronous Qualtrics operation bound to a connection. */
export type Action<TConfig, TResponse> = (
  options: TConfig
) => Promise<Result<TResponse>>

/** OAuth 2.0 client-credentials used for a managed bearer token. */
export type OAuthOptions = {
  clientId: string
  clientSecret: string
  /** Space-separated scopes, e.g. `'read:surveys write:distributions'`. */
  scope: string
}

/**
 * Opt-in retry for read actions. Writes (`create*`, `start*`) are never
 * retried automatically. Delays use exponential backoff with full jitter:
 * `random(0, min(maxDelayMs, baseDelayMs * 2^attempt))`. When the server
 * sent `Retry-After`, that wait is used instead — or retrying stops if it
 * exceeds `maxDelayMs`.
 */
export type RetryOptions = {
  /** Retries after the first attempt (default 2). */
  retries?: number
  /** Base delay in milliseconds (default 200). */
  baseDelayMs?: number
  /** Cap on a single delay in milliseconds (default 5000). */
  maxDelayMs?: number
  /** Decides whether a failure is retried (default {@link isTransientFailure}). */
  retryOn?: (failure: Failure, attempt: number) => boolean
}

/**
 * Options that bind a connection to one Qualtrics datacenter.
 *
 * Authentication, in order of precedence for each request: a `bearerToken`
 * passed to the action, the managed token from `oauth`, then `apiToken`.
 */
export type ConnectionOptions = {
  /** Datacenter id from the Qualtrics account settings, e.g. `'ca1'` or `'fra1'`. */
  datacenterId: string
  /** API token used when neither a per-call `bearerToken` nor `oauth` applies. */
  apiToken?: string
  /**
   * Client credentials for a managed bearer token: fetched on first use,
   * shared between concurrent calls, refreshed a minute before it expires and
   * re-fetched once if Qualtrics answers 401.
   */
  oauth?: OAuthOptions
  /** Default request timeout in milliseconds (30 000 when omitted). */
  timeout?: number
  /** Retry transient failures of read actions. Off when omitted. */
  retry?: RetryOptions
}

/** Cache of the managed bearer token obtained from {@link ConnectionOptions.oauth}. */
export type TokenCache = {
  /** Resolves to a valid token, fetching or refreshing it when needed. */
  get(request?: RequestOptions): Promise<Result<string>>
  /** Drops the cached token so the next `get` fetches a fresh one. */
  invalidate(): void
}

/** Per-connection state shared by every action bound to it. */
export type ConnectionContext = {
  tokens: TokenCache
}

/**
 * Factory that binds an action to {@link ConnectionOptions}. The optional
 * `context` (from {@link createConnectionContext}) lets standalone actions
 * share one managed bearer token; when omitted the action keeps its own.
 */
export type ActionFactory<TParams, TResponse> = (
  options: ConnectionOptions,
  context?: ConnectionContext
) => Action<TParams, TResponse>

/**
 * Per-request options accepted by every action. They are spread out of the
 * action's options object, so any action can be cancelled or given its own
 * timeout or token.
 */
export type RequestOptions = {
  /** OAuth bearer token for this call. Takes precedence over the connection's `apiToken`. */
  bearerToken?: string
  /** Timeout in milliseconds for this call; overrides the connection default. */
  timeout?: number
  /** Cancels the request. A cancelled request fails with code `ABORTED`. */
  signal?: AbortSignal
}

export type ResponseFormat = 'csv' | 'json' | 'ndjson' | 'spss' | 'tsv' | 'xml'

export type DistributionRequestType =
  | 'Invite'
  | 'ThankYou'
  | 'Reminder'
  | 'Email'
  | 'Portal'
  | 'PortalInvite'
  | 'GeneratedInvite'

export type SurveyLinkType = 'Individual' | 'Multiple' | 'Anonymous'

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

export type TransactionMeta = {
  fields: string[]
  batchId: string
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
    linkType: SurveyLinkType
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

export type LibraryMessage = {
  id: string
  description: string
  category: string
}

/** One page of a list endpoint. `nextPage` is a URL, or `null` on the last page. */
export type PagedResponse<T> = {
  elements: T[]
  nextPage: string | null
}

// ---------------------------------------------------------------------------
// Action options
// ---------------------------------------------------------------------------

export type GetBearerTokenOptions = Omit<RequestOptions, 'bearerToken'> &
  OAuthOptions

/** Parsed `/oauth2/token` response. */
export type BearerTokenResponse = {
  accessToken: string
  /** Lifetime in seconds as reported by Qualtrics (3600 when absent). */
  expiresIn: number
}

export type CreateMailingListOptions = RequestOptions & {
  directoryId: string
  name: string
  ownerId: string
  prioritizeListMetadata?: boolean
}

export type ListLibraryMessagesOptions = RequestOptions & {
  libraryId: string
  category?: string
  offset?: number
}

export type GetContactsImportStatusOptions = RequestOptions & {
  directoryId: string
  importId: string
  mailingListId: string
}

export type GetContactsImportSummaryOptions = GetContactsImportStatusOptions

export type StartContactsImportOptions = RequestOptions & {
  directoryId: string
  mailingListId: string
  contacts: Array<Contact>
  transactionMeta?: TransactionMeta
}

export type ImportContactsOptions = StartContactsImportOptions

export type GetDistributionOptions = RequestOptions & {
  distributionId: string
  surveyId: string
}

export type ListDistributionsOptions = RequestOptions & {
  surveyId: string
  sendStartDate: Date
  sendEndDate: Date
  distributionRequestType?: DistributionRequestType
  mailingListId?: string
  skipToken?: string
  useNewPaginationScheme?: boolean
  pageSize?: number
}

export type CreateDistributionOptions = RequestOptions & {
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
  type: SurveyLinkType
  embeddedData?: Record<string, string>
  sendDate: Date
}

export type CreateReminderOptions = RequestOptions & {
  distributionId: string
  libraryId: string
  messageId: string
  fromEmail: string
  replyToEmail?: string
  fromName: string
  subject: string
  sendDate: Date
  embeddedData?: Record<string, string>
}

export type DistributionOptions = RequestOptions & {
  directoryId: string
  mailingListName: string
  ownerId: string
  prioritizeListMetadata?: boolean
  contacts: Array<Contact>
  transactionMeta?: TransactionMeta
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
  type: SurveyLinkType
  embeddedData?: Record<string, string>
  distributionSendDate: Date
  reminderSendDate: Date
}

export type ExportResponsesOptions = RequestOptions & {
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
}

export type StartResponseExportOptions = ExportResponsesOptions

export type GetResponseExportProgressOptions = RequestOptions & {
  exportProgressId: string
  surveyId: string
}

export type GetResponseExportFileOptions = RequestOptions & {
  surveyId: string
  fileId: string
}

// ---------------------------------------------------------------------------
// Action responses
// ---------------------------------------------------------------------------

export type StartResponseExportResponse = {
  progressId: string
  percentComplete: number
  status: string
  continuationToken?: string
}

export type FileProgressResponse = {
  fileId: string
  percentComplete: number
  status: string
  continuationToken?: string
}

export type StartContactsImportResponse = {
  id: string
  contacts: Array<Contact>
  tracking: object
  status: string
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

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

export type Connection = {
  createDistribution: Action<CreateDistributionOptions, string>
  createMailingList: Action<CreateMailingListOptions, string>
  createReminder: Action<CreateReminderOptions, string>
  distributeSurveys: Action<DistributionOptions, string>
  exportResponses: Action<ExportResponsesOptions, Buffer>
  getBearerToken: Action<GetBearerTokenOptions, string>
  getContactsImportStatus: Action<
    GetContactsImportStatusOptions,
    ContactsImportStatusResponse
  >
  getContactsImportSummary: Action<
    GetContactsImportSummaryOptions,
    ContactsImportSummaryResponse
  >
  getDistribution: Action<GetDistributionOptions, Distribution>
  getResponseExportFile: Action<GetResponseExportFileOptions, Buffer>
  getResponseExportProgress: Action<
    GetResponseExportProgressOptions,
    FileProgressResponse
  >
  importContacts: Action<ImportContactsOptions, ContactsImportSummaryResponse>
  listDistributions: Action<
    ListDistributionsOptions,
    PagedResponse<Distribution>
  >
  listLibraryMessages: Action<
    ListLibraryMessagesOptions,
    PagedResponse<LibraryMessage>
  >
  startContactsImport: Action<
    StartContactsImportOptions,
    StartContactsImportResponse
  >
  startResponseExport: Action<
    StartResponseExportOptions,
    StartResponseExportResponse
  >
  /**
   * Calls `/whoami`. Accepts {@link RequestOptions}; passing a bare bearer
   * token string is deprecated and will be removed in 1.0.
   */
  testConnection: (options?: RequestOptions | string) => Promise<Result<string>>
}

export type ConnectionFactory = (options: ConnectionOptions) => Connection
