import { inflateRawSync } from "node:zlib";

/**
 * Minimal ZIP reader/writer.
 *
 * Writing only ever uses STORED (uncompressed) entries — a personal export is
 * a few hundred KB of JSON at most, so compression buys nothing worth the
 * complexity. This is the same "write the file format by hand" approach used
 * for the PNG icons and the ONYX logo assets — no new package.
 *
 * Reading also accepts DEFLATE, via Node's built-in zlib: if someone re-zips
 * the exported file with Windows' "Compressed folder", 7-Zip, or macOS
 * Archive Utility, those default to DEFLATE rather than STORE, and the
 * import should still work.
 */

const crcTable = ((): number[] => {
  const table = new Array<number>(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** MS-DOS date/time packed the way ZIP wants it — a fixed timestamp is fine here. */
const DOS_TIME = 0;
const DOS_DATE = ((2000 - 1980) << 9) | (1 << 5) | 1;

export type ZipEntry = { name: string; data: Buffer };

export function writeZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const { name, data } of entries) {
    const nameBuf = Buffer.from(name, "utf8");
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4); // version needed
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // method: stored
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18); // compressed size
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra length

    localParts.push(local, nameBuf, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(0, 10); // method
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number
    central.writeUInt16LE(0, 36); // internal attrs
    central.writeUInt32LE(0, 38); // external attrs
    central.writeUInt32LE(offset, 42); // local header offset

    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + data.length;
  }

  const centralStart = offset;
  const centralBuf = Buffer.concat(centralParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // disk with central dir
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralBuf.length, 12);
  end.writeUInt32LE(centralStart, 16);
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, centralBuf, end]);
}

/** Reads back STORED entries. Enough for round-tripping our own export. */
export function readZip(buffer: Buffer): ZipEntry[] {
  const endSig = 0x06054b50;
  let endOffset = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === endSig) {
      endOffset = i;
      break;
    }
  }
  if (endOffset === -1) throw new Error("Not a valid zip file");

  const total = buffer.readUInt16LE(endOffset + 10);
  const centralStart = buffer.readUInt32LE(endOffset + 16);

  const entries: ZipEntry[] = [];
  let pointer = centralStart;

  for (let i = 0; i < total; i += 1) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) throw new Error("Corrupt zip central directory");

    const method = buffer.readUInt16LE(pointer + 10);
    const compSize = buffer.readUInt32LE(pointer + 20);
    const nameLen = buffer.readUInt16LE(pointer + 28);
    const extraLen = buffer.readUInt16LE(pointer + 30);
    const commentLen = buffer.readUInt16LE(pointer + 32);
    const localOffset = buffer.readUInt32LE(pointer + 42);
    const name = buffer.toString("utf8", pointer + 46, pointer + 46 + nameLen);

    if (method !== 0 && method !== 8) {
      throw new Error(`Unsupported zip compression method (${method}) for ${name}`);
    }

    const localNameLen = buffer.readUInt16LE(localOffset + 26);
    const localExtraLen = buffer.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
    const raw = buffer.subarray(dataStart, dataStart + compSize);

    entries.push({ name, data: method === 8 ? inflateRawSync(raw) : raw });
    pointer += 46 + nameLen + extraLen + commentLen;
  }

  return entries;
}
