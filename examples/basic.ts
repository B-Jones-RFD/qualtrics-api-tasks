/**
 * Usage examples. Not part of the published package; type-checked by
 * `pnpm lint` so they stay in sync with the API.
 */
import { createConnection, exportResponses } from '../src'
import type { ConnectionOptions } from '../src'

const connectionOptions: ConnectionOptions = {
  datacenterId: 'ca1',
  apiToken: process.env.QUALTRICS_API_TOKEN,
}

const connection = createConnection(connectionOptions)

// Using an instance method
export async function checkConnection() {
  const res = await connection.testConnection()
  if (res.success) return res.data
  throw new Error(res.error)
}

// Using OAuth client credentials: the connection manages the bearer token
const oauthConnection = createConnection({
  datacenterId: 'ca1',
  oauth: {
    clientId: process.env.QUALTRICS_CLIENT_ID ?? '',
    clientSecret: process.env.QUALTRICS_CLIENT_SECRET ?? '',
    scope: 'read:libraries',
  },
  retry: { retries: 3 }, // retry reads on 429/5xx and network errors
})

export async function listMessages(libraryId: string) {
  const res = await oauthConnection.listLibraryMessages({ libraryId })
  if (res.success) return res.data.elements
  if (res.code === 'AUTH')
    throw new Error(`Check the OAuth scope: ${res.error}`)
  throw new Error(res.error)
}

// Using a standalone factory action; the decoded CSV text comes back
export async function exportLastWeek(surveyId: string) {
  const action = exportResponses(connectionOptions)
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  const res = await action({ surveyId, startDate, endDate, format: 'csv' })
  if (res.success) return res.data as string
  throw new Error(res.error)
}

// Incremental export: keep the continuation token between runs
export async function exportSince(surveyId: string, token?: string) {
  const res = await connection.exportResponsesWithProgress({
    surveyId,
    format: 'json',
    ...(token ? { continuationToken: token } : { allowContinuation: true }),
    poll: { intervalMs: 2000, maxAttempts: 150 },
  })
  if (!res.success) throw new Error(res.error)
  return {
    json: res.data.data as string,
    token: res.data.progress.continuationToken,
  }
}

// Contacts import: the final status carries counts and invalid emails
export async function addContacts(directoryId: string, mailingListId: string) {
  const res = await connection.importContacts({
    directoryId,
    mailingListId,
    contacts: [{ email: 'a@example.com', embeddedData: { tier: 2 } }],
  })
  if (!res.success) throw new Error(res.error)
  return res.data.contacts.count
}

// Paging: every distribution sent this year, one page per request
export async function* distributionIds(surveyId: string) {
  const sendStartDate = new Date(new Date().getFullYear(), 0, 1)
  const sendEndDate = new Date()
  for await (const page of connection.iterateDistributions({
    surveyId,
    sendStartDate,
    sendEndDate,
  })) {
    if (!page.success) throw new Error(page.error)
    for (const distribution of page.data.elements) yield distribution.id
  }
}
