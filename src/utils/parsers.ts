import type {
  Contact,
  ContactsImportStatusResponse,
  ContactsImportSummaryResponse,
  FileProgressResponse,
  Result,
} from '../types'
import { success, failure } from './index'

export function safeParseBearerToken(response: any): Result<string> {
  return response?.access_token && typeof response.access_token === 'string'
    ? success(response.access_token)
    : failure('Incorrect token format')
}

export function safeParseTestResponse(response: any): Result<string> {
  return response?.result?.userId
    ? success('Connection successful')
    : failure('Incorrect test response format')
}

export function safeParseStartFileExportResponse(response: any): Result<{
  progressId: string
  percentComplete: number
  status: string
  continuationToken?: string
}> {
  return 'result' in response
    ? 'progressId' in response.result &&
      'percentComplete' in response.result &&
      'status' in response.result
      ? success(response.result)
      : failure('Start Export Response invalid format')
    : 'error' in response
      ? failure(`${response.error.errorCode}: ${response.error.errorMessage}`)
      : failure(`Unable to parse Start Export Response`)
}

export function safeParseFileProgressResponse(
  response: any
): Result<FileProgressResponse> {
  return 'result' in response
    ? 'fileId' in response.result &&
      'percentComplete' in response.result &&
      'status' in response.result
      ? success(response.result)
      : failure('File Progress Response invalid format')
    : 'error' in response
      ? failure(`${response.error.errorCode}: ${response.error.errorMessage}`)
      : failure(`Unable to parse File Progress Response`)
}

export function safeParseCreateMailingListResponse(
  response: any
): Result<string> {
  return 'result' in response
    ? 'id' in response.result
      ? success(response.result.id)
      : failure(`Id missing in Create Mailing List Response`)
    : failure(`Unable to parse Create Mailing List Response`)
}

export function safeParseStartContactsImportResponse(response: any): Result<{
  id: string
  contacts: Array<Contact>
  tracking: object
  status: string
}> {
  return 'result' in response
    ? 'id' in response.result &&
      'contacts' in response.result &&
      'tracking' in response.result &&
      'status' in response.result
      ? success(response.result)
      : failure('Start contacts import response invalid format')
    : failure(`Unable to parse Start Contacts Import Response`)
}

export function safeParseContactsImportSummary(
  response: any
): Result<ContactsImportSummaryResponse> {
  return 'result' in response
    ? 'percentComplete' in response.result &&
      'contacts' in response.result &&
      'invalidEmails' in response.result &&
      'transactions' in response.result &&
      'status' in response.result
      ? success(response.result)
      : failure('Contacts import summary response invalid format')
    : failure(`Unable to parse Contacts Import Summary Response`)
}

export function safeParseContactsImportStatus(
  response: any
): Result<ContactsImportStatusResponse> {
  return 'result' in response
    ? 'percentComplete' in response.result &&
      'contacts' in response.result &&
      'transactions' in response.result &&
      'status' in response.result
      ? success(response.result)
      : failure('Contacts import summary response invalid format')
    : failure(`Unable to parse Contacts Import Summary Response`)
}

export function safeParseCreateDistributionResponse(
  response: any
): Result<string> {
  return 'result' in response
    ? 'id' in response.result
      ? success(response.result.id)
      : failure(`Id missing in Create Distribution Response`)
    : failure(`Unable to parse Create Distribution Response`)
}

export function safeParseCreateReminderResponse(response: any): Result<string> {
  return 'result' in response
    ? 'distributionId' in response.result
      ? success(response.result.distributionId)
      : failure(`distributionId missing in Create Reminder Response`)
    : failure(`Unable to parse Create Reminder Response`)
}
