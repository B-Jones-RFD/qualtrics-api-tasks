---
'@b-jones-rfd/qualtrics-api-tasks': minor
---

Structured failures, request cancellation and startup validation. Failure now carries code, status, details and retryAfterMs — branch on code instead of matching error text (code that builds Failure objects by hand must add code). Every action accepts RequestOptions (bearerToken, timeout, signal). createConnection throws TypeError for malformed options. New exports: QualtricsApiError, parseQualtricsError, parseRetryAfter, toFailure, validateConnectionOptions, and named <Action>Options / response types. testConnection(string) is deprecated in favour of testConnection({ bearerToken }).
