export type Success<T> = { success: true; data: T }

export type Failure = { success: false; error: string }

export type Result<T> = Success<T> | Failure

export type ResponseFormat = 'csv' | 'json' | 'ndjson' | 'spss' | 'tsv' | 'xml'

export type Action<TConfig, TResponse> = (
  options: TConfig
) => Promise<Result<TResponse>>

export type ConnectionOptions = {
  datacenterId: string
  apiToken?: string
  timeout?: number
}

export type ActionFactory<TParams, TResponse> = (
  options: ConnectionOptions
) => Action<TParams, TResponse>

export type Connection = {
  exportResponses: Action<ExportResponsesOptions, Buffer>
  getBearerToken: Action<
    { clientId: string; clientSecret: string; scope: string },
    string
  >
  getResponseExportProgress: Action<
    { exportProgressId: string; surveyId: string; bearerToken?: string },
    FileProgressResponse
  >
  startResponseExport: Action<
    ExportResponsesOptions,
    {
      progressId: string
      percentComplete: number
      status: string
      continuationToken?: string
    }
  >
  testConnection: (bearerToken?: string) => Promise<Result<void>>
}

export type ConnectionFactory = (options: ConnectionOptions) => Connection

export type ExportResponsesOptions = {
  surveyId: string
  startDate: Date
  endDate: Date
  format?: ResponseFormat
  breakoutSets?: boolean
  compress?: boolean
  exportResponsesInProgress?: boolean
  filterId?: string
  formatDecimalAsComma?: boolean
  includeDisplayOrder?: boolean
  limit?: number
  multiselectSeenUnansweredRecode?: number
  newlineReplacement?: string
  seenUnansweredRecode?: number
  timeZone?: string
  useLabels?: boolean
  embeddedDataIds?: string[]
  questionIds?: string[]
  surveyMetadataIds?: string[]
  continuationToken?: string
  allowContinuation?: boolean
  includeLabelColumns?: boolean
  sortByLastModifiedDate?: boolean
  bearerToken?: string
}

export type FileProgressResponse = {
  fileId: string
  percentComplete: number
  status: string
  continuationToken?: string
}
