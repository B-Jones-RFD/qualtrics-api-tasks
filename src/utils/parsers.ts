import type {
  BearerTokenResponse,
  ContactsImportStatusResponse,
  Distribution,
  FileProgressResponse,
  LibraryMessage,
  PagedResponse,
  Result,
  StartContactsImportResponse,
  StartResponseExportResponse,
  WhoAmI,
} from '../types'
import { success, failure } from './index'

type Rec = Record<string, unknown>

function isRecord(value: unknown): value is Rec {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Returns `response.result` when the body has the standard Qualtrics envelope. */
function resultOf(response: unknown): Rec | undefined {
  if (!isRecord(response)) return undefined
  return isRecord(response.result) ? response.result : undefined
}

function hasAll(record: Rec, keys: string[]): boolean {
  return keys.every((key) => key in record)
}

/**
 * Generic envelope parser: fails with `Unable to parse <what>` when the
 * envelope is missing and `<what> invalid format` when `keys` are absent.
 */
function parseEnvelope<T>(
  response: unknown,
  what: string,
  keys: string[]
): Result<T> {
  const result = resultOf(response)
  if (!result) return failure(`Unable to parse ${what}`)
  return hasAll(result, keys)
    ? success(result as T)
    : failure(`${what} invalid format`)
}

export function safeParseOAuthToken(
  response: unknown
): Result<BearerTokenResponse> {
  if (!isRecord(response) || typeof response.access_token !== 'string')
    return failure('Incorrect token format')
  const expiresIn =
    typeof response.expires_in === 'number' && response.expires_in > 0
      ? response.expires_in
      : 3600
  return success({ accessToken: response.access_token, expiresIn })
}

export function safeParseWhoAmI(response: unknown): Result<WhoAmI> {
  const result = resultOf(response)
  return typeof result?.userId === 'string'
    ? success(result as WhoAmI)
    : failure('Incorrect whoami response format')
}

export function safeParseStartFileExportResponse(
  response: unknown
): Result<StartResponseExportResponse> {
  return parseEnvelope(response, 'Start Export Response', [
    'progressId',
    'percentComplete',
    'status',
  ])
}

export function safeParseFileProgressResponse(
  response: unknown
): Result<FileProgressResponse> {
  const parsed = parseEnvelope<
    Omit<FileProgressResponse, 'fileId'> & { fileId?: unknown }
  >(response, 'File Progress Response', ['percentComplete', 'status'])
  if (!parsed.success) return parsed
  const { fileId, ...rest } = parsed.data
  return success({
    ...rest,
    fileId: typeof fileId === 'string' ? fileId : null,
  })
}

export function safeParseCreateMailingListResponse(
  response: unknown
): Result<string> {
  const result = resultOf(response)
  if (!result) return failure('Unable to parse Create Mailing List Response')
  return typeof result.id === 'string'
    ? success(result.id)
    : failure('Id missing in Create Mailing List Response')
}

export function safeParseStartContactsImportResponse(
  response: unknown
): Result<StartContactsImportResponse> {
  return parseEnvelope(response, 'Start Contacts Import Response', [
    'id',
    'contacts',
    'tracking',
    'status',
  ])
}

export function safeParseContactsImportStatus(
  response: unknown
): Result<ContactsImportStatusResponse> {
  return parseEnvelope(response, 'Contacts Import Status Response', [
    'percentComplete',
    'contacts',
    'transactions',
    'status',
  ])
}

export function safeParseCreateDistributionResponse(
  response: unknown
): Result<string> {
  const result = resultOf(response)
  if (!result) return failure('Unable to parse Create Distribution Response')
  return typeof result.id === 'string'
    ? success(result.id)
    : failure('Id missing in Create Distribution Response')
}

export function safeParseCreateReminderResponse(
  response: unknown
): Result<string> {
  const result = resultOf(response)
  if (!result) return failure('Unable to parse Create Reminder Response')
  return typeof result.distributionId === 'string'
    ? success(result.distributionId)
    : failure('distributionId missing in Create Reminder Response')
}

function parsePage<T>(
  response: unknown,
  what: string
): Result<PagedResponse<T>> {
  const result = resultOf(response)
  if (!result) return failure(`Unable to parse ${what}`)
  if (!Array.isArray(result.elements))
    return failure(`elements missing in ${what}`)
  const nextPage = typeof result.nextPage === 'string' ? result.nextPage : null
  return success({ elements: result.elements as T[], nextPage })
}

export function safeParseListLibraryMessages(
  response: unknown
): Result<PagedResponse<LibraryMessage>> {
  return parsePage(response, 'List Library Messages response')
}

export function safeParseGetDistribution(
  response: unknown
): Result<Distribution> {
  const result = resultOf(response)
  if (!result) return failure('Unable to parse Get Distribution response')
  return hasAll(result, ['id', 'stats'])
    ? success(result as unknown as Distribution)
    : failure('Properties missing in Get Distribution response')
}

export function safeParseListDistributions(
  response: unknown
): Result<PagedResponse<Distribution>> {
  return parsePage(response, 'List Distributions response')
}

/** Accepts a downloaded file body as a `Buffer` (text bodies are encoded as UTF-8). */
export function safeParseFile(response: unknown): Result<Buffer> {
  if (Buffer.isBuffer(response)) return success(response)
  if (typeof response === 'string')
    return success(Buffer.from(response, 'utf8'))
  return failure('Unexpected file response format')
}
