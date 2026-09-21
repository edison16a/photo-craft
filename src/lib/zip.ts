/**
 * Minimal ZIP writer, store only (no compression), so an export of several
 * pages can download as one file. PNG and JPEG are already compressed, so
 * deflating again buys nothing. Layout: one local header plus data per
 * entry, then the central directory, then the end of central directory
 * record. Names are UTF-8 with general purpose bit 11 set.
 */

/** One file inside the archive. `name` may contain slashes for folders. */
export interface ZipEntry {
  name: string;
  data: Uint8Array;
}

const LOCAL_HEADER_SIGNATURE = 0x04034b50;
const CENTRAL_HEADER_SIGNATURE = 0x02014b50;
const EOCD_SIGNATURE = 0x06054b50;
const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;
/** Version 2.0, the lowest that understands what we write. */
const ZIP_VERSION = 20;
/** General purpose bit 11: file names and comments are UTF-8. */
const UTF8_FLAG = 0x0800;
const METHOD_STORE = 0;
const MAX_U16 = 0xffff;
const MAX_U32 = 0xffffffff;

let crcTable: Uint32Array | undefined;

/** Builds the standard 256 entry lookup table once and keeps it around. */
function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

/**
 * Standard CRC-32 (the same one ZIP, PNG and gzip use) of a byte array.
 * Returns an unsigned 32 bit number, so crc32 of "123456789" is 0xCBF43926.
 */
export function crc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Packs a date into the two 16 bit DOS fields ZIP headers expect. */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(date.getFullYear(), 1980);
  const time =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, date: dosDate };
}

interface PreparedEntry {
  nameBytes: Uint8Array;
  data: Uint8Array;
  crc: number;
  localOffset: number;
}

/**
 * Encodes names, computes checksums and works out where each local header
 * will land. Throws a readable Error when the classic (non ZIP64) limits
 * would be exceeded.
 */
function prepareEntries(entries: ZipEntry[]): PreparedEntry[] {
  if (entries.length > MAX_U16) {
    throw new Error(`A ZIP file can hold at most ${MAX_U16} entries.`);
  }
  const encoder = new TextEncoder();
  const prepared: PreparedEntry[] = [];
  let offset = 0;
  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    if (nameBytes.length === 0) {
      throw new Error("Every ZIP entry needs a name.");
    }
    if (nameBytes.length > MAX_U16) {
      throw new Error(`ZIP entry name is too long: ${entry.name}`);
    }
    prepared.push({
      nameBytes,
      data: entry.data,
      crc: crc32(entry.data),
      localOffset: offset,
    });
    offset += LOCAL_HEADER_SIZE + nameBytes.length + entry.data.length;
    if (offset > MAX_U32) {
      throw new Error("ZIP file would be larger than 4 GB.");
    }
  }
  return prepared;
}

/**
 * Writes the fields shared by the local and central headers, starting at
 * the version needed field. Returns the offset just past them.
 */
function writeCommonFields(
  view: DataView,
  offset: number,
  entry: PreparedEntry,
  stamp: { time: number; date: number },
): number {
  view.setUint16(offset, ZIP_VERSION, true);
  view.setUint16(offset + 2, UTF8_FLAG, true);
  view.setUint16(offset + 4, METHOD_STORE, true);
  view.setUint16(offset + 6, stamp.time, true);
  view.setUint16(offset + 8, stamp.date, true);
  view.setUint32(offset + 10, entry.crc, true);
  view.setUint32(offset + 14, entry.data.length, true);
  view.setUint32(offset + 18, entry.data.length, true);
  view.setUint16(offset + 22, entry.nameBytes.length, true);
  view.setUint16(offset + 24, 0, true);
  return offset + 26;
}

/** Does the real work. Typed with a plain ArrayBuffer so Blob accepts it. */
function buildZip(entries: ZipEntry[]): Uint8Array<ArrayBuffer> {
  const prepared = prepareEntries(entries);
  const stamp = dosDateTime(new Date());
  let centralOffset = 0;
  let centralSize = 0;
  for (const entry of prepared) {
    centralOffset += LOCAL_HEADER_SIZE + entry.nameBytes.length + entry.data.length;
    centralSize += CENTRAL_HEADER_SIZE + entry.nameBytes.length;
  }
  const totalSize = centralOffset + centralSize + EOCD_SIZE;
  if (totalSize > MAX_U32) {
    throw new Error("ZIP file would be larger than 4 GB.");
  }

  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);

  for (const entry of prepared) {
    let pos = entry.localOffset;
    view.setUint32(pos, LOCAL_HEADER_SIGNATURE, true);
    pos = writeCommonFields(view, pos + 4, entry, stamp);
    bytes.set(entry.nameBytes, pos);
    pos += entry.nameBytes.length;
    bytes.set(entry.data, pos);
  }

  let pos = centralOffset;
  for (const entry of prepared) {
    view.setUint32(pos, CENTRAL_HEADER_SIGNATURE, true);
    view.setUint16(pos + 4, ZIP_VERSION, true);
    pos = writeCommonFields(view, pos + 6, entry, stamp);
    view.setUint16(pos, 0, true); // comment length
    view.setUint16(pos + 2, 0, true); // disk number start
    view.setUint16(pos + 4, 0, true); // internal attributes
    view.setUint32(pos + 6, 0, true); // external attributes
    view.setUint32(pos + 10, entry.localOffset, true);
    pos += 14;
    bytes.set(entry.nameBytes, pos);
    pos += entry.nameBytes.length;
  }

  view.setUint32(pos, EOCD_SIGNATURE, true);
  view.setUint16(pos + 4, 0, true); // this disk
  view.setUint16(pos + 6, 0, true); // disk holding the central directory
  view.setUint16(pos + 8, prepared.length, true);
  view.setUint16(pos + 10, prepared.length, true);
  view.setUint32(pos + 12, centralSize, true);
  view.setUint32(pos + 16, centralOffset, true);
  view.setUint16(pos + 20, 0, true); // comment length
  return bytes;
}

/**
 * Builds the whole archive in memory and returns its bytes. Entries keep
 * the order you pass them in. An empty list gives a valid, empty archive.
 * Throws if an entry has no name or the archive would not fit the classic
 * ZIP limits (65535 entries, 4 GB).
 */
export function createZipBytes(entries: ZipEntry[]): Uint8Array {
  return buildZip(entries);
}

/**
 * Same as createZipBytes but wrapped in a Blob with type "application/zip",
 * ready to hand to a download helper.
 */
export function createZipBlob(entries: ZipEntry[]): Blob {
  return new Blob([buildZip(entries)], { type: "application/zip" });
}
