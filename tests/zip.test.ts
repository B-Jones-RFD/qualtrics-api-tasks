import { describe, it, expect } from 'vitest'
import { deflateRawSync } from 'node:zlib'
import { readZip } from '../src/zip'
import { decodeResponseExport } from '../src/methods/responses/decodeResponseExport'

/** Builds a minimal zip archive (no zip64) the way Qualtrics' exporter does. */
export function makeZip(
  entries: Array<{ name: string; data: Buffer | string; store?: boolean }>
): Buffer {
  const locals: Buffer[] = []
  const centrals: Buffer[] = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const raw = Buffer.isBuffer(entry.data)
      ? entry.data
      : Buffer.from(entry.data)
    const compressed = entry.store ? raw : deflateRawSync(raw)
    const method = entry.store ? 0 : 8
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0, 6)
    local.writeUInt16LE(method, 8)
    local.writeUInt32LE(0, 10) // time/date
    local.writeUInt32LE(0, 14) // crc (not checked)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(raw.length, 22)
    local.writeUInt16LE(name.length, 26)
    local.writeUInt16LE(0, 28)
    const central = Buffer.alloc(46)
    central.writeUInt32LE(0x02014b50, 0)
    central.writeUInt16LE(20, 4)
    central.writeUInt16LE(20, 6)
    central.writeUInt16LE(0, 8)
    central.writeUInt16LE(method, 10)
    central.writeUInt32LE(0, 12)
    central.writeUInt32LE(0, 16)
    central.writeUInt32LE(compressed.length, 20)
    central.writeUInt32LE(raw.length, 24)
    central.writeUInt16LE(name.length, 28)
    central.writeUInt16LE(0, 30)
    central.writeUInt16LE(0, 32)
    central.writeUInt16LE(0, 34)
    central.writeUInt16LE(0, 36)
    central.writeUInt32LE(0, 38)
    central.writeUInt32LE(offset, 42)
    locals.push(local, name, compressed)
    centrals.push(central, name)
    offset += local.length + name.length + compressed.length
  }
  const centralBytes = Buffer.concat(centrals)
  const eocd = Buffer.alloc(22)
  eocd.writeUInt32LE(0x06054b50, 0)
  eocd.writeUInt16LE(0, 4)
  eocd.writeUInt16LE(0, 6)
  eocd.writeUInt16LE(entries.length, 8)
  eocd.writeUInt16LE(entries.length, 10)
  eocd.writeUInt32LE(centralBytes.length, 12)
  eocd.writeUInt32LE(offset, 16)
  eocd.writeUInt16LE(0, 20)
  return Buffer.concat([...locals, centralBytes, eocd])
}

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
