import type { ConnectionFactory } from './types'
import * as methods from './methods'

export const createConnection: ConnectionFactory = (options) => ({
  testConnection: methods.testConnection(options),
  getBearerToken: methods.getBearerToken(options),
})
