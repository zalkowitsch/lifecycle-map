import { describe, expect, it } from 'vitest';
import { zipStore, crc32 } from '@/lib/database/zip';

describe('crc32', () => {
  it('computes the known CRC32 of "hello"', () => {
    // CRC32("hello") = 0x3610a686
    expect(crc32(new TextEncoder().encode('hello')) >>> 0).toBe(0x3610a686);
  });
});

describe('zipStore', () => {
  it('produces bytes starting with the local file header magic PK\\x03\\x04', () => {
    const zip = zipStore([{ name: 'a.json', text: '{}' }]);
    expect(zip[0]).toBe(0x50); // P
    expect(zip[1]).toBe(0x4b); // K
    expect(zip[2]).toBe(0x03);
    expect(zip[3]).toBe(0x04);
  });
  it('ends with the end-of-central-directory magic PK\\x05\\x06', () => {
    const zip = zipStore([{ name: 'a.json', text: '{}' }, { name: 'b.csv', text: 'id\n1' }]);
    // find EOCD signature 0x06054b50 near the end
    let found = false;
    for (let i = zip.length - 22; i >= 0; i--) {
      if (zip[i] === 0x50 && zip[i + 1] === 0x4b && zip[i + 2] === 0x05 && zip[i + 3] === 0x06) { found = true; break; }
    }
    expect(found).toBe(true);
  });
  it('records the correct number of entries in the EOCD', () => {
    const zip = zipStore([{ name: 'a', text: 'x' }, { name: 'b', text: 'y' }, { name: 'c', text: 'z' }]);
    // EOCD total-entries field (offset +10 from EOCD start) should be 3
    let eocd = -1;
    for (let i = zip.length - 22; i >= 0; i--) {
      if (zip[i] === 0x50 && zip[i + 1] === 0x4b && zip[i + 2] === 0x05 && zip[i + 3] === 0x06) { eocd = i; break; }
    }
    const total = zip[eocd + 10]! | (zip[eocd + 11]! << 8);
    expect(total).toBe(3);
  });
});
