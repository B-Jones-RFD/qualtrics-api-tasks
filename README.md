![GitHub Actions CI](https://github.com/B-Jones-RFD/qualtrics-api-tasks/actions/workflows/main.yml/badge.svg)
[![npm version](https://img.shields.io/npm/v/@b-jones-rfd/qualtrics-api-tasks.svg?style=flat-square)](https://www.npmjs.com/package/@b-jones-rfd/qualtrics-api-tasks)
[![npm bundle size](https://img.shields.io/bundlephobia/min/%40b-jones-rfd%2Fqualtrics-api-tasks)](https://bundlephobia.com/package/@b-jones-rfd/qualtrics-api-tasks)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)

# Qualtrics API Tasks

Typed, dependency-free helpers for common [Qualtrics API](https://api.qualtrics.com/) workflows from Node.js: response exports, contact imports, mailing lists and survey distributions. Every action returns a `Result` and never throws. Built for my own projects — use at your own risk.

## Requirements

- Node.js 20 or later (uses the built-in `fetch`; no runtime dependencies)
- A Qualtrics [API token](https://api.qualtrics.com/2b4ffbd8af74e-api-key-authentication) or [OAuth client credentials](https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials), and your datacenter id (e.g. `ca1`)

## Installation

```sh
npm i @b-jones-rfd/qualtrics-api-tasks
# or
yarn add @b-jones-rfd/qualtrics-api-tasks
# or
pnpm add @b-jones-rfd/qualtrics-api-tasks
```

## Quick start

```ts
import { createConnection } from '@b-jones-rfd/qualtrics-api-tasks'

const connection = createConnection({
  datacenterId: 'ca1',
  oauth: {
    clientId: process.env.QUALTRICS_CLIENT_ID!,
    clientSecret: process.env.QUALTRICS_CLIENT_SECRET!,
    scope: 'read:survey_responses',
  },
  retry: { retries: 2 },
})

const res = await connection.exportResponses({
  surveyId: 'SV_abc123',
  startDate: new Date('2026-01-01'),
  endDate: new Date(),
  format: 'csv',
})

if (res.success)
  console.log(res.data) // the CSV text
else console.error(res.code, res.error)
```

## Usage

### Connection

`createConnection(options)` binds every action to one datacenter and set of credentials. It performs no I/O; it validates `options` and throws a `TypeError` for an obvious misconfiguration (empty or URL-shaped `datacenterId`, negative `timeout`, incomplete `oauth`). Everything after that returns a `Result`.

```ts
import {
  createConnection,
  type Connection,
} from '@b-jones-rfd/qualtrics-api-tasks'

const connection: Connection = createConnection({
  datacenterId: 'ca1',
  apiToken: process.env.QUALTRICS_API_TOKEN,
  timeout: 20_000, // per-request default, ms (30 000 if omitted)
})
```

### Standalone actions

Every action is also exported as a factory for single use or smaller imports. Call it with the same `ConnectionOptions` to get the action.

```ts
import { testConnection } from '@b-jones-rfd/qualtrics-api-tasks'

const check = testConnection(connectionOptions)
const res = await check()
```

Standalone actions that need a managed OAuth token each fetch their own unless you pass a shared context — see [Managed OAuth](#managed-oauth).

### Results

Every action resolves to `Result<T> = Success<T> | Failure`. Narrow on `success`:

```ts
const res = await connection.getDistribution({ distributionId, surveyId })
if (res.success) {
  res.data.stats.sent // Distribution
} else {
  res.code // 'HTTP' | 'AUTH' | 'TIMEOUT' | 'ABORTED' | 'NETWORK' | 'PARSE' | 'UNKNOWN'
  res.error // "Error in getDistribution: HTTP 404: ..."
}
```

#### Failure

Actions never throw. A failure carries a human-readable `error` (prefixed with the action name, for logs) and a `code` to branch on. `status` and `details` are present when Qualtrics answered with an error body; `retryAfterMs` is parsed from a `Retry-After` header on 429/503 responses.

```ts
type Failure = {
  success: false
  error: string
  code: FailureCode
  status?: number
  details?: { errorCode?: string; errorMessage?: string; requestId?: string }
  retryAfterMs?: number
}

type FailureCode =
  | 'HTTP' // non-2xx other than 401/403
  | 'AUTH' // 401 or 403
  | 'TIMEOUT' // request did not complete within `timeout`
  | 'ABORTED' // cancelled through `signal`
  | 'NETWORK' // DNS, connection or TLS failure
  | 'PARSE' // 2xx but the body was not in the expected shape
  | 'UNKNOWN'
```

```ts
const res = await connection.exportResponses(options)
if (!res.success) {
  if (res.code === 'AUTH') await refreshToken()
  else if (res.code === 'HTTP' && res.status === 429)
    await wait(res.retryAfterMs)
  else console.error(res.error, res.details?.requestId)
}
```

### Authentication

Three ways to authenticate, resolved per request in this order:

1. `bearerToken` passed to the action — always wins.
2. The managed token from `ConnectionOptions.oauth`.
3. `ConnectionOptions.apiToken`.

`getBearerToken` is available if you want to obtain an OAuth token yourself and pass it per call.

### Managed OAuth

Pass your OAuth client credentials as `oauth` and the connection manages the bearer token for you: it is requested on first use, shared between concurrent calls, refreshed a minute before it expires, and re-requested once if Qualtrics answers 401. Nothing is sent until the first action runs.

```ts
const connection = createConnection({
  datacenterId: 'ca1',
  oauth: {
    clientId: process.env.QUALTRICS_CLIENT_ID!,
    clientSecret: process.env.QUALTRICS_CLIENT_SECRET!,
    scope: 'read:surveys read:survey_responses',
  },
})

const res = await connection.testConnection() // token fetched here
```

A `bearerToken` passed to an action always bypasses the managed token. Standalone factory actions each keep their own token; to share one between them, pass a context as the second argument:

```ts
import {
  createConnectionContext,
  getDistribution,
  listDistributions,
} from '@b-jones-rfd/qualtrics-api-tasks'

const context = createConnectionContext(connectionOptions)
const getOne = getDistribution(connectionOptions, context)
const listAll = listDistributions(connectionOptions, context)
```

If the token cannot be obtained, the action fails with the token request's `code` (usually `AUTH`) and an `error` beginning `Error in <action>: could not obtain a bearer token:`.

### Retrying transient failures

Set `retry` to retry read actions that fail with `NETWORK`, `TIMEOUT`, or HTTP 429/502/503/504. Writes (`create*`, `start*`) are never retried; the composite workflows (`exportResponses`, `importContacts`, `distributeSurveys`) retry only their read steps.

```ts
type RetryOptions = {
  retries?: number // after the first attempt; default 2
  baseDelayMs?: number // default 200
  maxDelayMs?: number // default 5000
  retryOn?: (failure: Failure, attempt: number) => boolean // default isTransientFailure
}
```

Delays use exponential backoff with full jitter. When Qualtrics sends `Retry-After` (its rate limiter does on 429), that wait is used instead; if it exceeds `maxDelayMs` the failure is returned immediately with `retryAfterMs` set. An aborted `signal` ends retrying.

### Request options

Every action accepts these alongside its own parameters:

```ts
type RequestOptions = {
  bearerToken?: string // overrides the connection's auth for this call
  timeout?: number // ms; overrides the connection default
  signal?: AbortSignal // cancel; the action fails with code 'ABORTED'
}
```

```ts
const controller = new AbortController()
setTimeout(() => controller.abort(), 60_000)
const res = await connection.exportResponses({
  ...options,
  signal: controller.signal,
})
```

The composite workflows (`exportResponses`, `importContacts`, `distributeSurveys`) pass these on to every step they run.

### Paging

`listDistributions` and `listLibraryMessages` return one page with a `nextPage` URL. Three helpers follow it for you:

```ts
// Everything in one array (a failed page fails the call)
const all = await connection.listAllDistributions({
  surveyId,
  sendStartDate,
  sendEndDate,
})

// One page per request
for await (const page of connection.iterateDistributions({
  surveyId,
  sendStartDate,
  sendEndDate,
  maxPages: 10,
})) {
  if (!page.success) break
  console.log(page.data.elements.length)
}

// Manually
const first = await connection.listDistributions({
  surveyId,
  sendStartDate,
  sendEndDate,
})
if (first.success && first.data.nextPage) {
  const second = await connection.getNextDistributionsPage({
    nextPage: first.data.nextPage,
  })
}
```

`getNext*Page` only follows links on the connection's own datacenter host.

### Response exports

`exportResponses` runs the whole [export workflow](https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide) — start, poll once a second for up to five minutes, download — and returns the decoded contents: a string for `csv`/`tsv`/`json`/`ndjson`/`xml`, a `Buffer` for `spss`. If Qualtrics reports the export failed the result is an `HTTP` failure; if it does not finish in time, `TIMEOUT`.

For the raw file, run the three steps yourself (`startResponseExport`, `getResponseExportProgress`, `getResponseExportFile`) and, if you want, decode it with the exported `decodeResponseExport(file, format)`.

## API

### createConnection

```ts
type ConnectionFactory = (options: ConnectionOptions) => Connection
```

#### ConnectionOptions

```ts
type ConnectionOptions = {
  datacenterId: string
  apiToken?: string
  oauth?: { clientId: string; clientSecret: string; scope: string }
  timeout?: number
  retry?: RetryOptions
}
```

`datacenterId`

| Type   | Description              | Example | Required |
| ------ | ------------------------ | ------- | -------- |
| string | Qualtrics Data Center Id | 'ca1'   | Y        |

`apiToken`

| Type   | Description         | Required |
| ------ | ------------------- | -------- |
| string | Qualtrics API Token | N        |

`oauth`

| Type         | Description                                                                         | Required |
| ------------ | ----------------------------------------------------------------------------------- | -------- |
| OAuthOptions | Client credentials for a managed bearer token — see [Managed OAuth](#managed-oauth) | N        |

`timeout`

| Type   | Default value | Description               | Example | Required |
| ------ | ------------- | ------------------------- | ------- | -------- |
| number | 30000         | Qualtrics request timeout | 1000    | N        |

`retry`

| Type         | Description                                                                             | Required |
| ------------ | --------------------------------------------------------------------------------------- | -------- |
| RetryOptions | Retry transient failures of read actions — see [Retrying](#retrying-transient-failures) | N        |

### Actions

```ts
type Action<TConfig, TResponse> = (
  options: TConfig
) => Promise<Result<TResponse>>
```

Each action takes one options object. Its own parameters are listed below; every action also accepts the [request options](#request-options).

#### Authentication

##### getBearerToken(options)

Implements [OAuth Authentication (Client Credentials)](https://api.qualtrics.com/9398592961ced-o-auth-authentication-client-credentials) and returns the access token as the result data.

`options`

| Property     | Type   | Description                       | Required |
| ------------ | ------ | --------------------------------- | -------- |
| clientId     | string | Qualtrics Client ID               | Y        |
| clientSecret | string | Qualtrics Client Password         | Y        |
| scope        | string | Qualtrics Client requested scopes | Y        |

#### Contacts

##### getContactsImportStatus(options)

Implements [Get Contacts Import Status](https://api.qualtrics.com/c5d22705b1d45-get-transaction-contacts-import-status)

`options`

| Property      | Type   | Description            | Required |
| ------------- | ------ | ---------------------- | -------- |
| directoryId   | string | Qualtrics Directory ID | Y        |
| importId      | string | Contacts Import ID     | Y        |
| mailingListId | string | Mailing List ID        | Y        |

##### getContactsImportSummary(options)

Implements [Get Contacts Import Summary](https://api.qualtrics.com/6f0480b307053-get-transaction-contacts-import-summary)

`options`

| Property      | Type   | Description            | Required |
| ------------- | ------ | ---------------------- | -------- |
| directoryId   | string | Qualtrics Directory ID | Y        |
| importId      | string | Contacts Import ID     | Y        |
| mailingListId | string | Mailing List ID        | Y        |

##### importContacts(options)

Implements [Contact Import](https://api.qualtrics.com/1ac99fba8ca5b-contact-imports) multistep process. This runs the following actions:

1. [Start Contacts Import](#startcontactsimportoptions)
2. Polls [Get Contacts Import Status](#getcontactsimportstatusoptions)
3. [Get Contacts Import Summary](#getcontactsimportsummaryoptions)

`options`

| Property        | Type      | Description            | Required |
| --------------- | --------- | ---------------------- | -------- |
| directoryId     | string    | Qualtrics Directory ID | Y        |
| mailingListId   | string    | Mailing List ID        | Y        |
| contacts        | Contact[] | Contacts array         | Y        |
| transactionMeta | object    | Transaction meta data  | N        |

##### startContactsImport(options)

Implements [Create Transaction Contacts Import](https://api.qualtrics.com/bab13356ac724-create-transaction-contacts-import)

`options`

| Property        | Type      | Description            | Required |
| --------------- | --------- | ---------------------- | -------- |
| directoryId     | string    | Qualtrics Directory ID | Y        |
| mailingListId   | string    | Mailing List ID        | Y        |
| contacts        | Contact[] | Contacts array         | Y        |
| transactionMeta | object    | Transaction meta data  | N        |

#### Distributions

##### createDistribution(options)

Implements [Create Distribution](https://api.qualtrics.com/573e3f0a94888-create-distribution).

`options`

| Property           | Type                   | Description                        | Required | Default |
| ------------------ | ---------------------- | ---------------------------------- | -------- | ------- |
| libraryId          | string                 | Qualtrics Library ID               | Y        |         |
| messageId          | string                 | Qualtrics Message ID               | Y        |         |
| messageText        | string                 | Message text to send               | N        |         |
| mailingListId      | string                 | Mailing List ID                    | Y        |         |
| contactId          | string                 | Contact lookup ID for individual   | N        |         |
| transactionBatchId | string                 | Transaction Batch ID               | N        |         |
| fromEmail          | string                 | Originating email                  | Y        |         |
| replyToEmail       | string                 | Email reply-to address             | N        |         |
| fromName           | string                 | Email from name                    | Y        |         |
| subject            | string                 | Email subject                      | Y        |         |
| surveyId           | string                 | Qualtrics Survey ID                | Y        |         |
| expirationDate     | Date                   | Distribution expiration date time  | Y        |         |
| type               | enum                   | Individual, Multiple, or Anonymous | Y        |         |
| embeddedData       | Record<string, string> | Up to 10 subkeys                   | N        |         |
| sendDate           | Date                   | Date time to send                  | Y        |         |

##### createReminder(options)

Implements [Create Reminder Distribution](https://api.qualtrics.com/764630bb0633a-create-reminder-distribution).

`options`

| Property       | Type                   | Description              | Required |
| -------------- | ---------------------- | ------------------------ | -------- |
| distributionId | string                 | Previous Distribution ID | Y        |
| libraryId      | string                 | Qualtrics Library ID     | Y        |
| fromEmail      | string                 | Originating email        | Y        |
| messageId      | string                 | Qualtrics Message ID     | Y        |
| replyToEmail   | string                 | Email reply-to address   | N        |
| fromName       | string                 | Email from name          | Y        |
| subject        | string                 | Email subject            | Y        |
| embeddedData   | Record<string, string> | Up to 10 subkeys         | N        |
| sendDate       | Date                   | Date time to send        | Y        |

##### distributeSurveys(options)

Multistep process to execute a survey distribution. Runs the following actions:

1. [Create Mailing List](#createmailinglistoptions)
2. [Import Contacts](#importcontactsoptions)
3. [Create Distribution](#createdistributionoptions)
4. [Create Reminder](#createreminderoptions)

`options`

| Property                | Type                   | Description                        | Required | Default |
| ----------------------- | ---------------------- | ---------------------------------- | -------- | ------- |
| directoryId             | string                 | Qualtrics Directory ID             | Y        |         |
| mailingListName         | string                 | Mailing List Name                  | Y        |         |
| ownerId                 | string                 | Owner ID                           | Y        |         |
| prioritizeListMetadata  | boolean                | Import metadata as list metadata   | N        | false   |
| contacts                | Contact[]              | Contacts array                     | Y        |         |
| transactionMeta         | object                 | Transaction meta data              | N        |         |
| libraryId               | string                 | Qualtrics Library ID               | Y        |         |
| distributionMessageId   | string                 | Distribution Message ID            | Y        |         |
| distributionMessageText | string                 | Message text to send               | N        |         |
| reminderMessageId       | string                 | Reminder Message ID                | Y        |         |
| reminderMessageText     | string                 | Reminder message text to send      | N        |         |
| transactionBatchId      | string                 | Transaction Batch ID               | N        |         |
| fromEmail               | string                 | Originating email                  | Y        |         |
| replyToEmail            | string                 | Email reply-to address             | N        |         |
| fromName                | string                 | Email from name                    | Y        |         |
| distributionSubject     | string                 | Distribution email subject         | Y        |         |
| reminderSubject         | string                 | Reminder email subject             | Y        |         |
| surveyId                | string                 | Qualtrics Survey ID                | Y        |         |
| expirationDate          | Date                   | Distribution expiration date time  | Y        |         |
| type                    | enum                   | Individual, Multiple, or Anonymous | Y        |         |
| embeddedData            | Record<string, string> | Up to 10 subkeys                   | N        |         |
| distributionSendDate    | Date                   | Date time to send distribution     | Y        |         |
| reminderSendDate        | Date                   | Date time to send reminder         | Y        |         |

##### getDistribution(options)

Implements [Get Distribution](https://api.qualtrics.com/f5b1d8775d803-get-distribution)

`options`

| Property       | Type   | Description     | Required |
| -------------- | ------ | --------------- | -------- |
| distributionId | string | Distribution ID | Y        |
| surveyId       | string | Survey ID       | Y        |

##### listDistributions(options)

Implements [List Distributions](https://api.qualtrics.com/234bb6b16cf6d-list-distributions)

`options`

| Property                | Type    | Description                     | Required | Default |
| ----------------------- | ------- | ------------------------------- | -------- | ------- |
| surveyId                | string  | Qualtrics Survey ID             | Y        |         |
| sendStartDate           | Date    | Export start date and time      | Y        |         |
| sendEndDate             | Date    | Export end date and time        | Y        |         |
| mailingListId           | string  | Mailing List ID                 | N        |         |
| distributionRequestType | string  | Distribution Request Type       | N        |         |
| skipToken               | string  | Pagination offset               | N        |         |
| useNewPaginationScheme  | boolean | Use updated pagination          | N        | false   |
| pageSize                | number  | Distribution elements to return | N        | 100     |

##### getNextDistributionsPage(options)

Fetches the page a previous result's `nextPage` points at. The link must be on the connection's datacenter host; any other host is refused without a request.

| Property | Type   | Description                                  | Required |
| -------- | ------ | -------------------------------------------- | -------- |
| nextPage | string | `nextPage` from a `listDistributions` result | Y        |

##### listAllDistributions(options)

Same options as `listDistributions` plus `maxPages?: number`. Follows `nextPage` and resolves to `Distribution[]`. A failed page fails the whole call; the error names the page number and how many items had been collected.

##### iterateDistributions(options)

Same options as `listAllDistributions`. Returns an async iterator that yields one `Result<PagedResponse<Distribution>>` per request and ends after the last page, `maxPages`, or the first failed page (which is yielded).

```ts
for await (const page of connection.iterateDistributions({
  surveyId,
  sendStartDate,
  sendEndDate,
})) {
  if (!page.success) throw new Error(page.error)
  for (const distribution of page.data.elements) console.log(distribution.id)
}
```

#### Responses

##### exportResponses(options)

Resolves to the decoded export: a UTF-8 `string` for `csv`, `tsv`, `json`, `ndjson` and `xml`, a `Buffer` for `spss` — whether or not Qualtrics compressed the file. Use the three step actions below for the raw file.

Implements [Survey Response File Export](https://api.qualtrics.com/u9e5lh4172v0v-survey-response-export-guide) multistep process. Runs the following actions:

1. [Start Response Export](#startresponseexportoptions)
2. Polls [Get Response Export Progress](#getresponseexportprogressoptions)
3. [Get Response Export File](#getresponseexportfileoptions)

`options`

| Property                        | Type     | Description                                 | Required | Default |
| ------------------------------- | -------- | ------------------------------------------- | -------- | ------- |
| surveyId                        | string   | Qualtrics Survey ID                         | Y        |         |
| startDate                       | Date     | Export start date and time                  | Y        |         |
| endDate                         | Date     | Export end date and time                    | Y        |         |
| format                          | Enum     | File format                                 | N        | 'csv'   |
| breakoutSets                    | boolean  | Split multi-value fields into columns       | N        | true    |
| compress                        | boolean  | Compress final export                       | N        | true    |
| exportResponsesInProgress       | boolean  | Only export not complete                    | N        | false   |
| filterId                        | string   | Return responses matching id                | N        |         |
| formatDecimalAsComma            | boolean  | Use comma as decimal separator              | N        | false   |
| includeDisplayOrder             | boolean  | Include display order in export             | N        | false   |
| limit                           | number   | Max responses to export                     | N        |         |
| multiselectSeenUnansweredRecode | number   | Recode seen, but unanswered for multiselect | N        |         |
| newlineReplacement              | string   | Replace newline character with this         | N        |         |
| seenUnansweredRecode            | number   | Recode seen, but unanswered with this       | N        |         |
| timeZone                        | string   | Timezone used to determine response date    | N        | 'UTC"   |
| useLabels                       | boolean  | Export text of answer choice                | N        | false   |
| embeddedDataIds                 | string[] | Only export these embedded data fields      | N        |         |
| questionIds                     | string[] | Only export these question IDs              | N        |         |
| surveyMetadataIds               | string[] | Only export these metadata fields           | N        |         |
| continuationToken               | string   | Previous export continuation token          | N        |         |
| allowContinuation               | boolean  | Request continuation token                  | N        | false   |
| includeLabelColumns             | boolean  | Export two columns, recode and labels       | N        | false   |
| sortByLastModifiedDate          | boolean  | Sort responses by modified date             | N        | false   |

##### decodeResponseExport(file, format)

The decoder used by `exportResponses`, exported for files obtained via the three-step export. Reads the single-entry zip archive Qualtrics produces (`readZip` is exported too) and returns `Result<string | Buffer>`.

##### getResponseExportFile(options)

Implements [Get Response Export File](https://api.qualtrics.com/41296b6f2e828-get-response-export-file)

`options`

| Property | Type   | Description         | Required |
| -------- | ------ | ------------------- | -------- |
| surveyId | string | Qualtrics Survey ID | Y        |
| fileId   | string | File ID             | Y        |

##### getResponseExportProgress(options)

Implements [Get Response Export Progress](https://api.qualtrics.com/37e6a66f74ab4-get-response-export-progress)

`options`

| Property         | Type   | Description         | Required |
| ---------------- | ------ | ------------------- | -------- |
| surveyId         | string | Qualtrics Survey ID | Y        |
| exportProgressId | string | Progress ID         | Y        |

##### startResponseExport(options)

Implements [Start Response Exports](https://api.qualtrics.com/6b00592b9c013-start-response-export)

`options`

| Property                        | Type     | Description                                 | Required | Default |
| ------------------------------- | -------- | ------------------------------------------- | -------- | ------- |
| surveyId                        | string   | Qualtrics Survey ID                         | Y        |         |
| startDate                       | Date     | Export start date and time                  | Y        |         |
| endDate                         | Date     | Export end date and time                    | Y        |         |
| format                          | Enum     | File format                                 | N        | 'csv'   |
| breakoutSets                    | boolean  | Split multi-value fields into columns       | N        | true    |
| compress                        | boolean  | Compress final export                       | N        | true    |
| exportResponsesInProgress       | boolean  | Only export not complete                    | N        | false   |
| filterId                        | string   | Return responses matching id                | N        |         |
| formatDecimalAsComma            | boolean  | Use comma as decimal separator              | N        | false   |
| includeDisplayOrder             | boolean  | Include display order in export             | N        | false   |
| limit                           | number   | Max responses to export                     | N        |         |
| multiselectSeenUnansweredRecode | number   | Recode seen, but unanswered for multiselect | N        |         |
| newlineReplacement              | string   | Replace newline character with this         | N        |         |
| seenUnansweredRecode            | number   | Recode seen, but unanswered with this       | N        |         |
| timeZone                        | string   | Timezone used to determine response date    | N        | 'UTC"   |
| useLabels                       | boolean  | Export text of answer choice                | N        | false   |
| embeddedDataIds                 | string[] | Only export these embedded data fields      | N        |         |
| questionIds                     | string[] | Only export these question IDs              | N        |         |
| surveyMetadataIds               | string[] | Only export these metadata fields           | N        |         |
| continuationToken               | string   | Previous export continuation token          | N        |         |
| allowContinuation               | boolean  | Request continuation token                  | N        | false   |
| includeLabelColumns             | boolean  | Export two columns, recode and labels       | N        | false   |
| sortByLastModifiedDate          | boolean  | Sort responses by modified date             | N        | false   |

#### Mailing Lists

##### createMailingList(options)

Implements [Create Mailing List](https://api.qualtrics.com/3f633e4cea6cd-create-mailing-list)

`options`

| Property               | Type    | Description                      | Required | Default |
| ---------------------- | ------- | -------------------------------- | -------- | ------- |
| directoryId            | string  | Qualtrics Directory ID           | Y        |         |
| name                   | string  | Mailing List Name                | Y        |         |
| ownerId                | string  | Owner ID                         | Y        |         |
| prioritizeListMetadata | boolean | Import metadata as list metadata | N        | false   |

#### Messages

##### listLibraryMessages(options)

Implements [List Library Messages](https://api.qualtrics.com/1d60a66b340fa-list-library-messages)

`options`

| Property  | Type   | Description          | Required |
| --------- | ------ | -------------------- | -------- |
| libraryId | string | Qualtrics Library ID | Y        |
| category  | string | Message category     | N        |
| offset    | number | Pagination offset    | N        |

##### getNextLibraryMessagesPage(options)

Fetches the page a previous result's `nextPage` points at (same-host only).

##### listAllLibraryMessages(options)

Same options as `listLibraryMessages` plus `maxPages?: number`. Resolves to `LibraryMessage[]`.

##### iterateLibraryMessages(options)

Async iterator over pages of library messages; see `iterateDistributions`.

#### Utilities

##### testConnection(options)

Calls `/API/v3/whoami` and resolves to `'Connection successful'`. Takes `RequestOptions` only.

## Migrating to 1.0

- **`exportResponses` returns the decoded export** (`string` for text formats, `Buffer` for `spss`) instead of the raw downloaded file. If you were unzipping the result yourself, remove that step. For the raw bytes use `getResponseExportFile`. `exportResponseData` (added in 0.7) is now an alias and will be removed in 2.0.
- **`testConnection(bearerToken: string)` is gone.** Call `testConnection({ bearerToken })` or just `testConnection()`.

Everything added during 0.x — structured `Failure` with `code`, `RequestOptions` (`signal`/`timeout`/`bearerToken`), managed OAuth (`oauth`), `retry`, the paging helpers, named option types — is unchanged. If you are coming from 0.3 or earlier, note that `Failure` gained a required `code` property in 0.5; branch on it instead of matching `error` text.

## Contributing

This is a personal project maintained for my own work and is not accepting contributions. Bug reports via [issues](https://github.com/B-Jones-RFD/qualtrics-api-tasks/issues) are welcome; security problems go through [private reporting](SECURITY.md).

## Versioning

[SemVer](http://semver.org/). See the [CHANGELOG](CHANGELOG.md) and the [tags on this repository](https://github.com/B-Jones-RFD/qualtrics-api-tasks/tags).

## License

[MIT](https://github.com/B-Jones-RFD/qualtrics-api-tasks/blob/main/LICENSE) — B-Jones-RFD
