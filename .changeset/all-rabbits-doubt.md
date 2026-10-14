---
'@b-jones-rfd/qualtrics-api-tasks': major
---

Breaking changes

- exportResponses resolves to the decoded export — a string for csv/tsv/json/ndjson/xml, a Buffer for spss — instead of the raw downloaded file. Remove any unzip step; use getResponseExportFile for raw bytes. exportResponseData is now a deprecated alias.

- testConnection(bearerToken: string) removed; call testConnection({ bearerToken }).
