---
'@b-jones-rfd/qualtrics-api-tasks': patch
---

Fix exportResponses returning a raw stream instead of a Result; poll jobs every second (was 1 ms) and fail fast on failed jobs; surface Qualtrics error messages and timeouts; per-call bearer token now takes precedence over apiToken; OAuth token request sent as form-urlencoded.
