import { describe, it, expect } from 'vitest'
import { readZip } from '../src/zip'
import { decodeResponseExport } from '../src/methods/responses/decodeResponseExport'
import { makeZip } from './test-utils'

describe('readZip', () => {
  it('reads deflated and stored entries', () => {
    const zip = makeZip([
      { name: 'a.csv', data: 'x,y\n1,2\n' },
      { name: 'b.bin', data: Buffer.from([1, 2, 3]), store: true },
    ])
    const res = readZip(zip)
    expect(res.success).toBe(true)
    if (res.success) {
      expect(res.data.map((e) => e.name)).toStrictEqual(['a.csv', 'b.bin'])
      expect(res.data[0].data.toString()).toBe('x,y\n1,2\n')
      expect([...res.data[1].data]).toStrictEqual([1, 2, 3])
    }
  })

  it('rejects non-archives and truncated archives', () => {
    expect(readZip(Buffer.from('hello')).success).toBe(false)
    const zip = makeZip([{ name: 'a.csv', data: 'x'.repeat(1000) }])
    const truncated = Buffer.concat([zip.subarray(0, 40), zip.subarray(-22)])
    expect(readZip(truncated).success).toBe(false)
  })
})

describe('decodeResponseExport', () => {
  it('unzips and decodes text formats', () => {
    const zip = makeZip([{ name: 'Survey.csv', data: 'a,b\n1,2\n' }])
    expect(decodeResponseExport(zip, 'csv')).toStrictEqual({
      success: true,
      data: 'a,b\n1,2\n',
    })
  })

  it('returns a Buffer for spss', () => {
    const zip = makeZip([{ name: 'Survey.sav', data: Buffer.from([0, 255]) }])
    const res = decodeResponseExport(zip, 'spss')
    expect(res.success && Buffer.isBuffer(res.data)).toBe(true)
  })

  it('passes uncompressed exports through', () => {
    expect(
      decodeResponseExport(Buffer.from('{"responses":[]}'), 'json')
    ).toStrictEqual({
      success: true,
      data: '{"responses":[]}',
    })
  })

  it('fails on an empty or multi-entry archive', () => {
    expect(decodeResponseExport(makeZip([]), 'csv').success).toBe(false)
    const two = makeZip([
      { name: 'a.csv', data: 'a' },
      { name: 'b.csv', data: 'b' },
    ])
    const res = decodeResponseExport(two, 'csv')
    expect(res.success).toBe(false)
    if (!res.success) expect(res.error).toMatch(/2 entries/)
  })
})
