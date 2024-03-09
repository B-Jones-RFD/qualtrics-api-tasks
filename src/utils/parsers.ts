import type { FileProgressResponse, Result } from '../types'
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

export function safeParseFileResponse(response: any): Result<Buffer> {
  return Buffer.isBuffer(response)
    ? success(response)
    : failure('Incorrect file response format')
}
