// Tests for src/lib/share/encrypted.ts
//
// Covers randomDigits, encrypt/decrypt round-trips, and the magic-bytes /
// wrong-password failure modes. WebCrypto-dependent tests are skipped when
// crypto.subtle isn't available in the test environment.

import { describe, expect, it } from 'vitest';

import {
  decryptPayload,
  encryptPayload,
  randomDigits,
} from '@/lib/share/encrypted';

const hasSubtle =
  typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';

describe('randomDigits', () => {
  it('returns a string of exactly N digit characters', () => {
    const s = randomDigits(8);
    expect(s).toHaveLength(8);
    expect(s).toMatch(/^[0-9]{8}$/);
  });

  it('returns an empty string for n=0', () => {
    expect(randomDigits(0)).toBe('');
  });

  it('returns different strings on consecutive calls (probabilistic)', () => {
    const a = randomDigits(16);
    const b = randomDigits(16);
    expect(a).not.toBe(b);
  });
});

describe('encryptPayload / decryptPayload', () => {
  it.skipIf(!hasSubtle)('round-trips plain text', async () => {
    const text = 'hello, lifecycle map';
    const packet = await encryptPayload(text, 'pw-1234');
    expect(packet).toBeInstanceOf(Uint8Array);
    expect(packet.length).toBeGreaterThan(36); // header + ciphertext
    const decoded = await decryptPayload(packet, 'pw-1234');
    expect(decoded).toBe(text);
  });

  it.skipIf(!hasSubtle)('round-trips a sizable JSON payload', async () => {
    const obj = {
      meta: { title: 'Encrypted test' },
      lanes: Array.from({ length: 10 }, (_, i) => ({ id: `l${i}`, label: `Lane ${i}` })),
      phases: [],
      nodes: [],
      edges: [],
    };
    const text = JSON.stringify(obj);
    const packet = await encryptPayload(text, 'sekrit');
    const decoded = await decryptPayload(packet, 'sekrit');
    expect(JSON.parse(decoded)).toEqual(obj);
  });

  it('throws on packet shorter than header length', async () => {
    const tooShort = new Uint8Array(10);
    await expect(decryptPayload(tooShort, 'any')).rejects.toThrow(/too short/i);
  });

  it('throws on bad magic bytes', async () => {
    // 40 bytes of zeros — magic is "LM1\0" (0x4c 0x4d 0x31 0x00); zeros fail.
    const garbage = new Uint8Array(40);
    await expect(decryptPayload(garbage, 'any')).rejects.toThrow(/magic bytes/i);
  });

  it.skipIf(!hasSubtle)('throws when decrypted with the wrong password', async () => {
    const packet = await encryptPayload('top secret', 'correct-password');
    await expect(decryptPayload(packet, 'wrong-password')).rejects.toThrow();
  });
});
