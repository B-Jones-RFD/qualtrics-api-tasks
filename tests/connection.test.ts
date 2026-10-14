import { describe, it, expect } from 'vitest'
import { createConnection, validateConnectionOptions } from '../src'

describe('createConnection', () => {
  it('binds every action without performing I/O', () => {
    const connection = createConnection({ datacenterId: 'ca1' })
    expect(typeof connection.testConnection).toBe('function')
    expect(typeof connection.exportResponses).toBe('function')
  })

  it('rejects malformed options', () => {
    expect(() => validateConnectionOptions({ datacenterId: '' })).toThrow(
      TypeError
    )
    expect(() =>
      validateConnectionOptions({ datacenterId: 'https://ca1.qualtrics.com' })
    ).toThrow(/datacenter id/)
    expect(() =>
      validateConnectionOptions({ datacenterId: 'ca1', timeout: -1 })
    ).toThrow(/timeout/)
    expect(() =>
      validateConnectionOptions({ datacenterId: 'ca1', timeout: 1000 })
    ).not.toThrow()
  })
})
