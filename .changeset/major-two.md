---
'@b-jones-rfd/qualtrics-api-tasks': major
---

**2.0: richer workflow results, deprecations removed**

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
