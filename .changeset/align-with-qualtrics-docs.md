---
'@b-jones-rfd/qualtrics-api-tasks': minor
---

**Alignment with the Qualtrics API docs, incremental exports and poll options**

- **`importContacts` no longer calls the summary endpoint.** Qualtrics has deprecated `GET …/transactioncontacts/{importId}/summary` (unsupported after 2026-06-30); the workflow now returns the final status response, which carries the same `contacts.count`, `transactions.count`, `invalidEmails` and `status`. `getContactsImportSummary` is deprecated and will be removed in 2.0.
- **New `exportResponsesWithProgress`** resolves to `{ data, progress }` so the `continuationToken` of an export started with `allowContinuation` can be kept for incremental exports. New type `ResponseExportResult`.
- **Per-call `poll: { intervalMs?, maxAttempts? }`** on `importContacts`, `exportResponses`, `exportResponsesWithProgress` and `distributeSurveys` (defaults unchanged: 1 s, 300 attempts). New type `PollOptions`.
- Options relaxed to match the API: `startDate`/`endDate` (exports), `sendStartDate`/`sendEndDate` (list distributions), `ownerId` (create mailing list, distribute surveys), `Contact.email` and `mailingListId` on `createDistribution` (give `transactionBatchId` instead) are now optional; absent values are omitted from the request.
- Options added: `includeWaveWeights` (exports), `recipients.directoryId` (`createDistribution`), `Contact.phone` and `Contact.id`; embedded and transaction data values may be `string | number | boolean` (`EmbeddedDataValue`).
- `ContactsImportStatusResponse` gains `invalidEmails?`; `ContactsImportSummaryResponse` is now that type with `invalidEmails` required.
- TSDoc on every option and response type; README documents `Contact`, the new actions and the json/ndjson restrictions.
