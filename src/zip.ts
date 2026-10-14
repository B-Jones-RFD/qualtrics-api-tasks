import { inflateRawSync } from 'node:zlib'
import type { Result } from './types'
import { failure, success } from './utils'

const EOCD_SIGNATURE = 0x06054b50
const CENTRAL_SIGNATURE = 0x02014b50
const LOCAL_SIGNATURE = 0x04034b50
const METHOD_STORE = 0
const METHOD_DEFLATE = 8

/** One file inside a zip archive. */
export type ZipEntry = { name: string; data: Buffer }

/**
 * Reads every entry of a zip archive. Supports stored and deflated entries,
 * which is all Qualtrics produces; zip64 archives and encrypted entries are
 * reported as a `PARSE` failure.
 */
export function readZip(archive: Buffer): Result<ZipEntry[]> {
  const eocd = findEndOfCentralDirectory(archive)
  if (eocd === -1)
    return failure('Not a zip archive (end of central directory not found)')
  const entryCount = archive.readUInt16LE(eocd + 10)
  const centralOffset = archive.readUInt32LE(eocd + 16)
  if (entryCount === 0xffff || centralOffset === 0xffffffff)
    return failure('zip64 archives are not supported')

  const entries: ZipEntry[] = []
  let offset = centralOffset
  for (let i = 0; i < entryCount; i++) {
    if (
      offset + 46 > archive.length ||
      archive.readUInt32LE(offset) !== CENTRAL_SIGNATURE
    )
      return failure('Corrupt zip archive (bad central directory entry)')
    const flags = archive.readUInt16LE(offset + 8)
    const method = archive.readUInt16LE(offset + 10)
    const compressedSize = archive.readUInt32LE(offset + 20)
    const uncompressedSize = archive.readUInt32LE(offset + 24)
    const nameLength = archive.readUInt16LE(offset + 28)
    const extraLength = archive.readUInt16LE(offset + 30)
    const commentLength = archive.readUInt16LE(offset + 32)
    const localOffset = archive.readUInt32LE(offset + 42)
    const name = archive.toString('utf8', offset + 46, offset + 46 + nameLength)
    offset += 46 + nameLength + extraLength + commentLength

    if (flags & 0x1)
      return failure(`Encrypted zip entry '${name}' is not supported`)
    if (compressedSize === 0xffffffff || uncompressedSize === 0xffffffff)
      return failure('zip64 archives are not supported')
    if (
      localOffset + 30 > archive.length ||
      archive.readUInt32LE(localOffset) !== LOCAL_SIGNATURE
    )
      return failure(`Corrupt zip archive (bad local header for '${name}')`)
    const localNameLength = archive.readUInt16LE(localOffset + 26)
    const localExtraLength = archive.readUInt16LE(localOffset + 28)
    const dataStart = localOffset + 30 + localNameLength + localExtraLength
    const compressed = archive.subarray(dataStart, dataStart + compressedSize)
    if (compressed.length !== compressedSize)
      return failure(`Corrupt zip archive (truncated data for '${name}')`)

    let data: Buffer
    if (method === METHOD_STORE) data = Buffer.from(compressed)
    else if (method === METHOD_DEFLATE) {
      try {
        data = inflateRawSync(compressed)
      } catch (error) {
        return failure(
          `Corrupt zip archive (could not inflate '${name}': ${
            error instanceof Error ? error.message : String(error)
          })`
        )
      }
    } else
      return failure(
        `Unsupported zip compression method ${method} for '${name}'`
      )
    if (data.length !== uncompressedSize)
      return failure(`Corrupt zip archive (size mismatch for '${name}')`)
    entries.push({ name, data })
  }
  return success(entries)
}

function findEndOfCentralDirectory(archive: Buffer): number {
  // The EOCD record is 22 bytes plus an optional comment of up to 65535 bytes.
  const min = Math.max(0, archive.length - 22 - 0xffff)
  for (let i = archive.length - 22; i >= min; i--) {
    if (archive.readUInt32LE(i) === EOCD_SIGNATURE) return i
  }
  return -1
}
