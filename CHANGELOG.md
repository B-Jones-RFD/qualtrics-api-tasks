# @b-jones-rfd/qualtrics-api-tasks

## 2.0.0

### Major Changes

- d742380: **2.0: richer workflow results, deprecations removed**

  - `distributeSurveys` resolves to `DistributionResult` — `{ mailingListId, import, distributionId, reminderId }` — instead of only the reminder's id.
  - `testConnection` resolves to the `/whoami` payload (`WhoAmI`: `userId`, `brandId`, `userName`, `accountType`, `firstName`, `lastName`, `email`, `datacenter`) instead of `'Connection successful'`.
  - New types: `DistributionResult`, `WhoAmI`.
  - README gains a "Low-level helpers" section documenting the remaining public utilities and a "Migrating to 2.0" section.

  **Breaking changes**

  - `distributeSurveys`: use `res.data.reminderId` where you used `res.data`.
  - `testConnection`: branch on `res.success`; `res.data` is now an object.
  - Removed `getContactsImportSummary` and `GetContactsImportSummaryOptions` (Qualtrics deprecated the endpoint; `getContactsImportStatus` and `importContacts` return the same fields).
  - Removed the `exportResponseData` alias; use `exportResponses`.
  - No longer exported: `toFailure`, `validateConnectionOptions`, `parseQualtricsError`, `parseRetryAfter` (internal helpers). `createConnection` still validates options and throws `TypeError`.

## 1.1.0

### Minor Changes

- 2c12723: **Alignment with the Qualtrics API docs, incremental exports and poll options**

  - **`importContacts` no longer calls the summary endpoint.** Qualtrics has deprecated `GET …/transactioncontacts/{importId}/summary` (unsupported after 2026-06-30); the workflow now returns the final status response, which carries the same `contacts.count`, `transactions.count`, `invalidEmails` and `status`. `getContactsImportSummary` is deprecated and will be removed in 2.0.
  - **New `exportResponsesWithProgress`** resolves to `{ data, progress }` so the `continuationToken` of an export started with `allowContinuation` can be kept for incremental exports. New type `ResponseExportResult`.
  - **Per-call `poll: { intervalMs?, maxAttempts? }`** on `importContacts`, `exportResponses`, `exportResponsesWithProgress` and `distributeSurveys` (defaults unchanged: 1 s, 300 attempts). New type `PollOptions`.
  - Options relaxed to match the API: `startDate`/`endDate` (exports), `sendStartDate`/`sendEndDate` (list distributions), `ownerId` (create mailing list, distribute surveys), `Contact.email` and `mailingListId` on `createDistribution` (give `transactionBatchId` instead) are now optional; absent values are omitted from the request.
  - Options added: `includeWaveWeights` (exports), `recipients.directoryId` (`createDistribution`), `Contact.phone` and `Contact.id`; embedded and transaction data values may be `string | number | boolean` (`EmbeddedDataValue`).
  - `ContactsImportStatusResponse` gains `invalidEmails?`; `ContactsImportSummaryResponse` is now that type with `invalidEmails` required.
  - TSDoc on every option and response type; README documents `Contact`, the new actions and the json/ndjson restrictions.

## 1.0.1

### Patch Changes

- 6570ac4: **Response export fixes and documentation corrections**

  - `exportResponses` now waits for `status === 'complete'` instead of `percentComplete === 100`, as the Qualtrics docs require (`percentComplete` is a convenience field and `fileId` is `null` until the export completes).
  - A failed export's reason is no longer lost: the `Failure` message includes the job's `code: message` and `details` carries them as `errorCode`/`errorMessage`.
  - `getResponseExportFile` always returns the body as a `Buffer`; an uncompressed `json` export (`compress: false`) was being parsed by content type and failed with `Unexpected file response format`.
  - `FileProgressResponse.fileId` is typed `string | null` and the new `error` field (`ResponseExportJobError`) and `ResponseExportStatus` type describe what Qualtrics returns. `safeParseFileProgressResponse` no longer rejects a progress response without `fileId`.
  - Corrected the `@see` links on `createDistribution`, `createReminder` and `getDistribution` (the old pages 404) and pointed the contact-import and export step actions at their endpoint pages.

## 1.0.0

### Major Changes

- 6410296: Breaking changes

  - exportResponses resolves to the decoded export — a string for csv/tsv/json/ndjson/xml, a Buffer for spss — instead of the raw downloaded file. Remove any unzip step; use getResponseExportFile for raw bytes. exportResponseData is now a deprecated alias.

  - testConnection(bearerToken: string) removed; call testConnection({ bearerToken }).

## 0.7.0

### Minor Changes

- 55d8625: Paging helpers and decoded response exports. listAllDistributions / listAllLibraryMessages collect every page, iterateDistributions / iterateLibraryMessages yield one page per request, and getNextDistributionsPage / getNextLibraryMessagesPage follow a nextPage link (same datacenter host only); all accept maxPages. exportResponseData returns the export’s contents decoded (string for text formats, Buffer for spss) using the new exported decodeResponseExport and readZip. exportResponses still returns the raw file and will return decoded contents in 1.0. Full TSDoc on the Connection type. New types: GetNextPageOptions, ListAllOptions, PagedIterator, ResponseExportData, ZipEntry

## 0.6.0

### Minor Changes

- 197e474: Managed OAuth token and opt-in retry. Pass oauth: { clientId, clientSecret, scope } to createConnection and the connection fetches, caches, refreshes and re-fetches the bearer token for you; a per-call bearerToken still wins. retry: { retries, baseDelayMs, maxDelayMs, retryOn } retries read actions on NETWORK/TIMEOUT/429/502/503/504 with jittered backoff and honours Retry-After; writes are never retried. Action factories accept an optional ConnectionContext to share a token between standalone actions. New exports: createConnectionContext, withRetry, isTransientFailure, ManagedTokenError, and types OAuthOptions, RetryOptions, TokenCache, ConnectionContext, BearerTokenResponse.

## 0.5.0

### Minor Changes

- d2942cf: Structured failures, request cancellation and startup validation. Failure now carries code, status, details and retryAfterMs — branch on code instead of matching error text (code that builds Failure objects by hand must add code). Every action accepts RequestOptions (bearerToken, timeout, signal). createConnection throws TypeError for malformed options. New exports: QualtricsApiError, parseQualtricsError, parseRetryAfter, toFailure, validateConnectionOptions, and named <Action>Options / response types. testConnection(string) is deprecated in favour of testConnection({ bearerToken }).

## 0.4.1

### Patch Changes

- f3963af: Apply the packaging changes described in 0.4.0 (exports map, files allowlist, provenance, package checks, CI matrix, Node >=20); stop committing generated docs.

## 0.4.0

### Minor Changes

- bff35fb: Modern packaging: exports map, files allowlist, provenance, publint/attw checks, typedoc site, CI matrix Node 20/22/24, Node floor lowered to 20

## 0.3.8

### Patch Changes

- 0aa0178: Fix exportResponses returning a raw stream instead of a Result; poll jobs every second (was 1 ms) and fail fast on failed jobs; surface Qualtrics error messages and timeouts; per-call bearer token now takes precedence over apiToken; OAuth token request sent as form-urlencoded.

## 0.3.7

### Patch Changes

- abe7e92: Update package deployment

## 0.3.6

### Patch Changes

- 3bb9e4f: Revert list distributions params change

## 0.3.5

### Patch Changes

- 6d085dc: Update list distribution to make survey id optional

## 0.3.4

### Patch Changes

- da8c841: Update required props listDistributions

## 0.3.3

### Patch Changes

- e64a943: Fix export responses date range

## 0.3.2

### Patch Changes

- ec58f5e: Added distribute surveys method to documentation

## 0.3.1

### Patch Changes

- bb766b5: Cleaned up README

## 0.3.0

### Minor Changes

- 3bcc969: Added methods for Contacts and Distributions

## 0.2.0

### Minor Changes

- a5028bb: Support file export multiple formats

## 0.1.1

### Patch Changes

- 2f8dbdf: Added JSDoc action method descriptions

## 0.1.0

### Minor Changes

- efa27c7: Implemented survey file response methods

## 0.0.5

### Patch Changes

- df0e350: Implemented testConnection and getBearerToken methods

## 0.0.4

### Patch Changes

- cbceca7: Update changeset config

## 0.0.3

### Patch Changes

- 00a3792: Publish to github

## 0.0.2

### Patch Changes

- f9398a9: Initial commit
