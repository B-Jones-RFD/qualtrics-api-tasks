---
'@b-jones-rfd/qualtrics-api-tasks': minor
---

Managed OAuth token and opt-in retry. Pass oauth: { clientId, clientSecret, scope } to createConnection and the connection fetches, caches, refreshes and re-fetches the bearer token for you; a per-call bearerToken still wins. retry: { retries, baseDelayMs, maxDelayMs, retryOn } retries read actions on NETWORK/TIMEOUT/429/502/503/504 with jittered backoff and honours Retry-After; writes are never retried. Action factories accept an optional ConnectionContext to share a token between standalone actions. New exports: createConnectionContext, withRetry, isTransientFailure, ManagedTokenError, and types OAuthOptions, RetryOptions, TokenCache, ConnectionContext, BearerTokenResponse.
