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

/**
 * How a workflow action (`importContacts`, `exportResponses`,
 * `distributeSurveys`) polls an asynchronous Qualtrics job.
 */
export type PollOptions = {
  /** Delay between status checks in milliseconds (default 1000). */
  intervalMs?: number
  /** Give up after this many status checks (default 300, i.e. five minutes at the default interval). */
  maxAttempts?: number
}

/** Export file format. `json`/`ndjson` reject several formatting options; see {@link StartResponseExportOptions}. */
export type ResponseFormat = 'csv' | 'json' | 'ndjson' | 'spss' | 'tsv' | 'xml'

/** Kind of distribution, as reported in {@link Distribution.requestType} and filtered by `listDistributions`. */
export type DistributionRequestType =
  | 'Invite'
  | 'ThankYou'
  | 'Reminder'
  | 'Email'
  | 'Portal'
  | 'PortalInvite'
  | 'GeneratedInvite'

/** Survey link type for a distribution: one link per contact, reusable, or anonymous. */
export type SurveyLinkType = 'Individual' | 'Multiple' | 'Anonymous'

/** Value accepted in a contact's `embeddedData` / `transactionData`. */
export type EmbeddedDataValue = string | number | boolean

/**
 * One contact in a transaction-contacts import. Every key is optional;
 * omit a key rather than sending `null`.
 * @see https://api.qualtrics.com/bab13356ac724-create-transaction-contacts-import
 */
export type Contact = {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  /** Id of an existing directory contact to update, e.g. `'CID_…'`. */
  id?: string
  /** External reference for the contact. */
  extRef?: string
  /** Keys must not appear in {@link TransactionMeta.fields}. */
  embeddedData?: Record<string, EmbeddedDataValue>
  /** Preferred language code. */
  language?: string
  unsubscribed?: boolean
  /** Keys must appear in {@link TransactionMeta.fields}; requires `transactionMeta` on the import. */
  transactionData?: Record<string, EmbeddedDataValue>
}

/** Required on an import whose contacts carry `transactionData`. */
export type TransactionMeta = {
  /** Names of the transaction fields; at least one. */
  fields: string[]
  /** Id of an existing transaction batch (`'BT_…'`) the transactions are added to. */
  batchId: string
}

/**
 * A distribution as returned by `getDistribution` / `listDistributions`.
 * `message.messageText` is no longer populated by List Distributions;
 * read the message from the library or `getDistribution`.
 */
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

/** A message in a library, as listed by `listLibraryMessages`. */
export type LibraryMessage = {
  id: string
  description: string
  /** e.g. `invite`, `reminder`, `thankYou`, `endOfSurvey`, `general`. */
  category: string
}

/**
 * One page of a list endpoint. `nextPage` is the absolute URL of the next
 * page, or `null` on the last one. Pass it to the matching `getNext*Page`
 * action, or use `listAll*` / `iterate*` to follow it automatically.
 */
export type PagedResponse<T> = {
  elements: T[]
  nextPage: string | null
}

/** Options for the `getNext*Page` actions. */
export type GetNextPageOptions = RequestOptions & {
  /** The `nextPage` URL from a previous page. Must be on the connection's datacenter host. */
  nextPage: string
}

/** Options for the `listAll*` and `iterate*` actions: the list options plus a page cap. */
export type ListAllOptions<TListOptions> = TListOptions & {
  /** Stop after this many pages (all pages when omitted). */
  maxPages?: number
}

/**
 * Yields one page {@link Result} per request until Qualtrics reports no more
 * pages, `maxPages` is reached, or a page fails (the failure is yielded, then
 * iteration ends). Never throws.
 *
 * @example
 * for await (const page of connection.iterateDistributions(options)) {
 *   if (!page.success) throw new Error(page.error)
 *   for (const d of page.data.elements) console.log(d.id)
 * }
 */
export type PagedIterator<TListOptions, T> = (
  options: ListAllOptions<TListOptions>
) => AsyncGenerator<Result<PagedResponse<T>>, void, undefined>

/**
 * Decoded response export: a UTF-8 string for `csv`, `tsv`, `json`, `ndjson`
 * and `xml`; a `Buffer` for `spss`.
 */
export type ResponseExportData = string | Buffer

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
  /** Directory (pool) id, `'POOL_…'`. */
  directoryId: string
  name: string
  /** Owning user or group id; defaults to the caller. */
  ownerId?: string
  /** Import mapped embedded data as list metadata instead of contact data. */
  prioritizeListMetadata?: boolean
}

export type ListLibraryMessagesOptions = RequestOptions & {
  libraryId: string
  /** Filter by category, e.g. `'invite'`, `'reminder'`, `'thankYou'`. */
  category?: string
  /** Start position; prefer following `nextPage`. */
  offset?: number
}

export type GetContactsImportStatusOptions = RequestOptions & {
  directoryId: string
  /** Import job id returned by `startContactsImport`, `'PGRS_…'`. */
  importId: string
  mailingListId: string
}

export type StartContactsImportOptions = RequestOptions & {
  directoryId: string
  mailingListId: string
  /** At most 10 000 contacts / 5 MB per import. */
  contacts: Array<Contact>
  /** Required when any contact carries `transactionData`. */
  transactionMeta?: TransactionMeta
}

export type ImportContactsOptions = StartContactsImportOptions & {
  /** Polling cadence for the import job; one check per second for five minutes when omitted. */
  poll?: PollOptions
}

export type GetDistributionOptions = RequestOptions & {
  distributionId: string
  surveyId: string
}

export type ListDistributionsOptions = RequestOptions & {
  surveyId: string
  /** Only distributions sent on or after this date. */
  sendStartDate?: Date
  /** Only distributions sent on or before this date. */
  sendEndDate?: Date
  distributionRequestType?: DistributionRequestType
  mailingListId?: string
  /** Start position for the string-based pagination (`useNewPaginationScheme`). */
  skipToken?: string
  /** Opt in to Qualtrics' faster string-based pagination. */
  useNewPaginationScheme?: boolean
  /** 1–100 (default 100). */
  pageSize?: number
}

/**
 * Options for `createDistribution`. Recipients are a mailing list (optionally
 * narrowed to one `contactId`) or a `transactionBatchId`; supply one or the
 * other.
 */
export type CreateDistributionOptions = RequestOptions & {
  libraryId: string
  messageId: string
  messageText?: string
  /** Mailing list or contact group, `'CG_…'`. Required unless `transactionBatchId` is given. */
  mailingListId?: string
  /** Send to one contact of the mailing list, `'CGC_…'` / `'MLRP_…'`. */
  contactId?: string
  /** Send to every contact in a transaction batch, `'BT_…'`; cannot be combined with `contactId`. */
  transactionBatchId?: string
  /** Directory (pool) id the recipients belong to, `'POOL_…'`. */
  directoryId?: string
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

/** Options for the `distributeSurveys` workflow. */
export type DistributionOptions = RequestOptions & {
  directoryId: string
  mailingListName: string
  /** Owner of the new mailing list; defaults to the caller. */
  ownerId?: string
  prioritizeListMetadata?: boolean
  contacts: Array<Contact>
  transactionMeta?: TransactionMeta
  /** Polling cadence for the contacts import. */
  poll?: PollOptions
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

/**
 * Options for `startResponseExport` — the Qualtrics export body plus the
 * survey id. For `json`/`ndjson` Qualtrics rejects `includeDisplayOrder`,
 * `useLabels`, `formatDecimalAsComma`, `seenUnansweredRecode`,
 * `multiselectSeenUnansweredRecode`, `timeZone`, `newlineReplacement` and
 * `breakoutSets`.
 * @see https://api.qualtrics.com/6b00592b9c013-start-response-export
 */
export type StartResponseExportOptions = RequestOptions & {
  surveyId: string
  /** Only responses recorded (or, with `sortByLastModifiedDate`, modified) on or after this date. */
  startDate?: Date
  /** Only responses recorded (or modified) before this date (exclusive). */
  endDate?: Date
  /** File format (default `csv`). */
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
  /** Token from a previous export; implies `allowContinuation`, which must then be omitted. Expires after a week. */
  continuationToken?: string
  /** Ask for a `continuationToken` when the export finishes. Cannot be combined with `filterId`. */
  allowContinuation?: boolean
  includeLabelColumns?: boolean
  sortByLastModifiedDate?: boolean
  /** Include Wave Name / Weight Segment columns when the survey has wave weighting. */
  includeWaveWeights?: boolean
}

/** Options for the `exportResponses` workflows: the export body plus polling cadence. */
export type ExportResponsesOptions = StartResponseExportOptions & {
  /** Polling cadence for the export job; one check per second for five minutes when omitted. */
  poll?: PollOptions
}

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

/** Status of a response export job, as reported by Qualtrics. */
export type ResponseExportStatus = 'inProgress' | 'complete' | 'failed'

/** Reason a response export failed (`result.error` of the progress response). */
export type ResponseExportJobError = {
  /** Qualtrics job error code, e.g. `'EXPORTS_109'`. */
  code?: string
  message?: string
  /** Extra fields Qualtrics attached, e.g. `{ invalidField: 'QID1' }`. */
  context?: Record<string, unknown>
}

export type FileProgressResponse = {
  /** Id of the file to download. `null` until `status` is `'complete'`. */
  fileId: string | null
  /** Convenience field only; download when `status` is `'complete'`, not at 100. */
  percentComplete: number
  status: ResponseExportStatus | string
  /** Present once the export is complete when it was started with `allowContinuation` or a `continuationToken`. */
  continuationToken?: string
  /** Present when `status` is `'failed'`. */
  error?: ResponseExportJobError
}

/** `result` of Create Transaction Contacts Import. */
export type StartContactsImportResponse = {
  /** Import job id, `'PGRS_…'`. */
  id: string
  contacts: Array<Contact>
  tracking: object
  status: string
}

/** `result` of Get Transaction Contacts Import Status. */
export type ContactsImportStatusResponse = {
  /** 0–100. */
  percentComplete: number
  contacts: {
    count: {
      added: number
      updated: number
      failed: number
    }
  }
  /** Malformed addresses that were skipped. */
  invalidEmails?: string[]
  transactions: {
    count: {
      created: number
    }
  }
  status: string
}

/** Final report of a contacts import, as returned by `importContacts`. */
export type ContactsImportSummaryResponse = ContactsImportStatusResponse & {
  invalidEmails: string[]
}

/** Identity of the caller, as returned by `testConnection` (`/whoami`). */
export type WhoAmI = {
  /** `'UR_…'`. */
  userId: string
  brandId?: string
  userName?: string
  /** `'UT_…'`. */
  accountType?: string
  firstName?: string
  lastName?: string
  email?: string
  datacenter?: string
}

/** Everything `distributeSurveys` created. */
export type DistributionResult = {
  /** The mailing list created in step 1. */
  mailingListId: string
  /** Final status of the contacts import (step 2). */
  import: ContactsImportSummaryResponse
  /** The distribution created in step 3. */
  distributionId: string
  /** The reminder distribution scheduled in step 4. */
  reminderId: string
}

/** Result of `exportResponsesWithProgress`: the decoded export and the completed progress record. */
export type ResponseExportResult = {
  /** The export's contents; see {@link ResponseExportData}. */
  data: ResponseExportData
  /** The final progress response, carrying `fileId` and, when requested, `continuationToken`. */
  progress: FileProgressResponse
}

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------

/**
 * Every action bound to one datacenter, as returned by `createConnection`.
 * Each member resolves to a {@link Result} and never throws. The same actions
 * are exported as standalone factories (`getDistribution(options, context?)`)
 * for single use or tree-shaking.
 */
export type Connection = {
  // --- Authentication -----------------------------------------------------

  /**
   * Requests an OAuth 2.0 client-credentials bearer token and returns it.
   * Pass the same credentials as {@link ConnectionOptions.oauth} instead to
   * have the connection manage the token for you.
   * @see https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials
   */
  getBearerToken: Action<GetBearerTokenOptions, string>

  /**
   * Calls `/API/v3/whoami` to verify the credentials and resolves to the
   * caller's identity ({@link WhoAmI}).
   * @see https://api.qualtrics.com/dc58b844b8a14-who-am-i
   */
  testConnection: (options?: RequestOptions) => Promise<Result<WhoAmI>>

  // --- Contacts -----------------------------------------------------------

  /**
   * Imports contacts into a mailing list end to end: starts the import,
   * polls its status (once a second for up to five minutes unless `poll`
   * says otherwise) and returns the final status, which carries the
   * added/updated/failed counts and invalid emails. Fails with `HTTP` if
   * Qualtrics reports the import failed and `TIMEOUT` if it does not finish
   * in time.
   * @see https://api.qualtrics.com/1ac99fba8ca5b-contact-imports
   */
  importContacts: Action<ImportContactsOptions, ContactsImportSummaryResponse>

  /**
   * Step 1 of a contacts import: creates the transaction-contacts import and returns its id.
   * @see https://api.qualtrics.com/bab13356ac724-create-transaction-contacts-import
   */
  startContactsImport: Action<
    StartContactsImportOptions,
    StartContactsImportResponse
  >

  /**
   * Step 2 of a contacts import: reports `percentComplete`, `status`, the
   * added/updated/failed counts and invalid emails.
   * @see https://api.qualtrics.com/c5d22705b1d45-get-transaction-contacts-import-status
   */
  getContactsImportStatus: Action<
    GetContactsImportStatusOptions,
    ContactsImportStatusResponse
  >

  // --- Mailing lists and messages ----------------------------------------

  /**
   * Creates a mailing list in a directory and returns its id.
   * @see https://api.qualtrics.com/3f633e4cea6cd-create-mailing-list
   */
  createMailingList: Action<CreateMailingListOptions, string>

  /**
   * Lists one page of a library's messages. Follow `nextPage` with
   * {@link Connection.getNextLibraryMessagesPage}, or use
   * {@link Connection.listAllLibraryMessages} / {@link Connection.iterateLibraryMessages}.
   * @see https://api.qualtrics.com/1d60a66b340fa-list-library-messages
   */
  listLibraryMessages: Action<
    ListLibraryMessagesOptions,
    PagedResponse<LibraryMessage>
  >

  /** Fetches the page a `listLibraryMessages` result's `nextPage` points at. */
  getNextLibraryMessagesPage: Action<
    GetNextPageOptions,
    PagedResponse<LibraryMessage>
  >

  /** Collects every page of library messages into one array; a failed page fails the call. */
  listAllLibraryMessages: Action<
    ListAllOptions<ListLibraryMessagesOptions>,
    LibraryMessage[]
  >

  /** Iterates library messages one page per request. See {@link PagedIterator}. */
  iterateLibraryMessages: PagedIterator<
    ListLibraryMessagesOptions,
    LibraryMessage
  >

  // --- Distributions ------------------------------------------------------

  /**
   * Distributes a survey end to end: creates a mailing list, imports the
   * contacts, creates the distribution and schedules a reminder. Resolves to
   * every id created and the import's final status. Each step's failure is
   * returned as-is.
   */
  distributeSurveys: Action<DistributionOptions, DistributionResult>

  /**
   * Creates a distribution and returns its id.
   * @see https://api.qualtrics.com/573e3f0a94888-create-distribution
   */
  createDistribution: Action<CreateDistributionOptions, string>

  /**
   * Schedules a reminder for a distribution and returns the reminder's
   * distribution id.
   * @see https://api.qualtrics.com/764630bb0633a-create-reminder-distribution
   */
  createReminder: Action<CreateReminderOptions, string>

  /**
   * Reads one distribution, including its send statistics.
   * @see https://api.qualtrics.com/f5b1d8775d803-get-distribution
   */
  getDistribution: Action<GetDistributionOptions, Distribution>

  /**
   * Lists one page of a survey's distributions in a date range. Follow
   * `nextPage` with {@link Connection.getNextDistributionsPage}, or use
   * {@link Connection.listAllDistributions} / {@link Connection.iterateDistributions}.
   * @see https://api.qualtrics.com/234bb6b16cf6d-list-distributions
   */
  listDistributions: Action<
    ListDistributionsOptions,
    PagedResponse<Distribution>
  >

  /** Fetches the page a `listDistributions` result's `nextPage` points at. */
  getNextDistributionsPage: Action<
    GetNextPageOptions,
    PagedResponse<Distribution>
  >

  /** Collects every page of distributions into one array; a failed page fails the call. */
  listAllDistributions: Action<
    ListAllOptions<ListDistributionsOptions>,
    Distribution[]
  >

  /** Iterates distributions one page per request. See {@link PagedIterator}. */
  iterateDistributions: PagedIterator<ListDistributionsOptions, Distribution>

  // --- Responses ----------------------------------------------------------

  /**
   * Exports survey responses end to end: starts the export, polls its
   * progress (once a second for up to five minutes unless `poll` says
   * otherwise) until `status` is `'complete'`, downloads the file and decodes it. Resolves to the
   * export's contents — a UTF-8 string for the text formats, a `Buffer` for
   * `spss` — whether or not Qualtrics compressed it. Fails with `HTTP` if
   * Qualtrics reports the export failed (the job's error code and message
   * are in `details`) and `TIMEOUT` if it does not finish in time. Use the three step actions
   * below for the raw file.
   * @see https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide
   */
  exportResponses: Action<ExportResponsesOptions, ResponseExportData>

  /**
   * Same workflow as {@link Connection.exportResponses}, resolving to the
   * decoded contents together with the final progress record, so the
   * `continuationToken` of an export started with `allowContinuation` (or a
   * previous token) can be kept for the next incremental export.
   * @example
   * const res = await connection.exportResponsesWithProgress({ surveyId, allowContinuation: true })
   * if (res.success) save(res.data.progress.continuationToken)
   */
  exportResponsesWithProgress: Action<
    ExportResponsesOptions,
    ResponseExportResult
  >

  /**
   * Step 1 of a response export: starts it and returns the `progressId`.
   * @see https://api.qualtrics.com/6b00592b9c013-start-response-export
   */
  startResponseExport: Action<
    StartResponseExportOptions,
    StartResponseExportResponse
  >

  /**
   * Step 2 of a response export: reports `status`, `percentComplete` and,
   * once `status` is `'complete'`, the `fileId` to download. A `'failed'`
   * export carries the reason in `error`.
   * @see https://api.qualtrics.com/37e6a66f74ab4-get-response-export-progress
   */
  getResponseExportProgress: Action<
    GetResponseExportProgressOptions,
    FileProgressResponse
  >

  /**
   * Step 3 of a response export: downloads the file as raw bytes.
   * @see https://api.qualtrics.com/41296b6f2e828-get-response-export-file
   */
  getResponseExportFile: Action<GetResponseExportFileOptions, Buffer>
}

/** Signature of `createConnection`. */
export type ConnectionFactory = (options: ConnectionOptions) => Connection
