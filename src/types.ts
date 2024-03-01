export type Success<T> = { success: true; data: T }

export type Failure = { success: false; error: string }

export type Result<T> = Success<T> | Failure

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
  testConnection: Action<{ bearerToken?: string }, void>
  getBearerToken: Action<{ clientId: string; clientSecret: string }, string>
}

export type ConnectionFactory = (options: ConnectionOptions) => Connection
