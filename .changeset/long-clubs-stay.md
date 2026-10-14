---
'@b-jones-rfd/qualtrics-api-tasks': minor
---

Paging helpers and decoded response exports. listAllDistributions / listAllLibraryMessages collect every page, iterateDistributions / iterateLibraryMessages yield one page per request, and getNextDistributionsPage / getNextLibraryMessagesPage follow a nextPage link (same datacenter host only); all accept maxPages. exportResponseData returns the export’s contents decoded (string for text formats, Buffer for spss) using the new exported decodeResponseExport and readZip. exportResponses still returns the raw file and will return decoded contents in 1.0. Full TSDoc on the Connection type. New types: GetNextPageOptions, ListAllOptions, PagedIterator, ResponseExportData, ZipEntry
