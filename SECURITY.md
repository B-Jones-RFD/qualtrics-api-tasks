# Security Policy

This package sends Qualtrics API tokens and OAuth client credentials over the
network on your behalf, so security reports are taken seriously.

## Supported versions

| Version | Supported           |
| ------- | ------------------- |
| 2.x     | Yes                 |
| 1.x     | Security fixes only |
| < 1.0   | No                  |

## Reporting a vulnerability

Please **do not** open a public issue for security problems.

Use GitHub's private vulnerability reporting:
<https://github.com/B-Jones-RFD/qualtrics-api-tasks/security/advisories/new>.

Include what you found, how to reproduce it, and the version affected. You
should hear back within a week. If the report is confirmed, a fix will be
released as a patch and a GitHub Security Advisory published once it is
available.

## Scope notes

- Credentials (`apiToken`, per-call `bearerToken`, OAuth client id/secret) are
  held in memory for the lifetime of a connection and sent only to
  `https://<datacenterId>.qualtrics.com`.
- Every request goes over HTTPS using Node's built-in `fetch`; TLS verification
  is never disabled by this package.
- Error messages returned in a `Failure` may include the Qualtrics error text
  but never echo credentials.
