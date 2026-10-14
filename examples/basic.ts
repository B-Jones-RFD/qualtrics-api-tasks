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

// Using OAuth client credentials and passing the bearer token per call
export async function listMessages(libraryId: string) {
  const token = await connection.getBearerToken({
    clientId: process.env.QUALTRICS_CLIENT_ID ?? '',
    clientSecret: process.env.QUALTRICS_CLIENT_SECRET ?? '',
    scope: 'read:libraries',
  })
  if (!token.success) throw new Error(token.error)
  const res = await connection.listLibraryMessages({
    libraryId,
    bearerToken: token.data,
  })
  if (res.success) return res.data.elements
  throw new Error(res.error)
}

// Using a standalone factory action
export async function exportLastWeek(surveyId: string) {
  const action = exportResponses(connectionOptions)
  const endDate = new Date()
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)
  const res = await action({ surveyId, startDate, endDate, format: 'csv' })
  if (res.success) return res.data // zip archive as a Buffer
  throw new Error(res.error)
}
