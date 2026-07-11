// Minimal ZIP writer using the "store" method (no compression). Enough to bundle
// a handful of small text files (a map + its datatables) with no dependency.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]!) & 0xff]! ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface Entry { nameBytes: Uint8Array; data: Uint8Array; crc: number; offset: number; }

export function zipStore(files: { name: string; text: string }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const entries: Entry[] = [];
  let offset = 0;

  const push = (u: Uint8Array): void => { chunks.push(u); offset += u.length; };
  const u16 = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >>> 8) & 0xff]);
  const u32 = (n: number): Uint8Array => new Uint8Array([n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]);

  // Local file headers + data.
  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const data = enc.encode(f.text);
    const crc = crc32(data);
    const localOffset = offset;
    push(u32(0x04034b50));        // local file header signature
    push(u16(20));                // version needed
    push(u16(0));                 // flags
    push(u16(0));                 // method 0 = store
    push(u16(0)); push(u16(0));   // mod time, mod date
    push(u32(crc));               // crc32
    push(u32(data.length));       // compressed size
    push(u32(data.length));       // uncompressed size
    push(u16(nameBytes.length));  // file name length
    push(u16(0));                 // extra length
    push(nameBytes);
    push(data);
    entries.push({ nameBytes, data, crc, offset: localOffset });
  }

  // Central directory.
  const cdStart = offset;
  for (const e of entries) {
    push(u32(0x02014b50));        // central dir header signature
    push(u16(20)); push(u16(20)); // version made by / needed
    push(u16(0)); push(u16(0));   // flags / method
    push(u16(0)); push(u16(0));   // time / date
    push(u32(e.crc));
    push(u32(e.data.length)); push(u32(e.data.length));
    push(u16(e.nameBytes.length));
    push(u16(0)); push(u16(0));   // extra / comment length
    push(u16(0)); push(u16(0));   // disk number / internal attrs
    push(u32(0));                 // external attrs
    push(u32(e.offset));          // local header offset
    push(e.nameBytes);
  }
  const cdSize = offset - cdStart;

  // End of central directory.
  push(u32(0x06054b50));
  push(u16(0)); push(u16(0));     // disk numbers
  push(u16(entries.length)); push(u16(entries.length));
  push(u32(cdSize));
  push(u32(cdStart));
  push(u16(0));                   // comment length

  const total = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}
