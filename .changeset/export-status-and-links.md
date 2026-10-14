---
'@b-jones-rfd/qualtrics-api-tasks': patch
---

**Response export fixes and documentation corrections**

- `exportResponses` now waits for `status === 'complete'` instead of `percentComplete === 100`, as the Qualtrics docs require (`percentComplete` is a convenience field and `fileId` is `null` until the export completes).
- A failed export's reason is no longer lost: the `Failure` message includes the job's `code: message` and `details` carries them as `errorCode`/`errorMessage`.
- `getResponseExportFile` always returns the body as a `Buffer`; an uncompressed `json` export (`compress: false`) was being parsed by content type and failed with `Unexpected file response format`.
- `FileProgressResponse.fileId` is typed `string | null` and the new `error` field (`ResponseExportJobError`) and `ResponseExportStatus` type describe what Qualtrics returns. `safeParseFileProgressResponse` no longer rejects a progress response without `fileId`.
- Corrected the `@see` links on `createDistribution`, `createReminder` and `getDistribution` (the old pages 404) and pointed the contact-import and export step actions at their endpoint pages.
