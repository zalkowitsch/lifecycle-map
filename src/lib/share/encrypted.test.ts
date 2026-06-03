// Tests for src/lib/share/encrypted.ts
//
// Covers randomDigits, encrypt/decrypt round-trips, magic-bytes / wrong-password
// failure modes, and (with canvas + Image + fetch mocks) the PNG steganography
// pipeline + shareEncryptedImage / decodeFromImageUrl end-to-end.
//
// WebCrypto-dependent tests are skipped when crypto.subtle isn't available.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  bytesToPng,
  decodeFromImageUrl,
  decryptPayload,
  encryptPayload,
  pngToBytes,
  randomDigits,
  shareEncryptedImage,
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

// ---------------------------------------------------------------------------
// PNG steganography + end-to-end share/decode
//
// jsdom doesn't implement <canvas>. We install stubs that:
//   - back ImageData with a single shared Uint8ClampedArray per canvas
//   - serialize/deserialize that array through a Blob so a "PNG" round-trips
//   - hand the same array back to drawImage→getImageData on the decode side
//
// This isn't a real PNG, but it's faithful to the LSB read/write contract
// bytesToPng / pngToBytes rely on.
// ---------------------------------------------------------------------------

interface StubImageData {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

interface PixelStore {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

// Map blob URLs -> the pixel buffer that produced them, so toBlob + Image.onload +
// drawImage + getImageData can shuttle pixels through "the network".
const blobStore = new Map<string, PixelStore>();
// Map blob identity -> stub id, so FormData re-wraps don't lose the tag.
const blobIdRegistry = new WeakMap<Blob, string>();
let nextBlobId = 0;

const originalFetch = globalThis.fetch;
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
const originalImage = globalThis.Image;
const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalToBlob = HTMLCanvasElement.prototype.toBlob;

interface StubCanvasContext {
  canvas: HTMLCanvasElement;
  _pixels: Uint8ClampedArray | null;
  createImageData(w: number, h: number): StubImageData;
  putImageData(img: StubImageData): void;
  getImageData(x: number, y: number, w: number, h: number): StubImageData;
  drawImage(image: { _pixels?: Uint8ClampedArray | null; naturalWidth: number; naturalHeight: number }): void;
  fillRect: () => void;
}

function installCanvasStubs(): void {
  HTMLCanvasElement.prototype.getContext = function (
    this: HTMLCanvasElement,
    type: string,
  ): unknown {
    if (type !== '2d') return null;
    // Reuse a single context per canvas so the pixel buffer survives across
    // putImageData / toBlob / getImageData on the same canvas instance.
    const cache = this as HTMLCanvasElement & { _stubCtx?: StubCanvasContext };
    if (cache._stubCtx) return cache._stubCtx;

    const canvas = this;
    const ctx: StubCanvasContext = {
      canvas,
      _pixels: null,
      createImageData(w: number, h: number): StubImageData {
        return {
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        };
      },
      putImageData(img: StubImageData): void {
        this._pixels = new Uint8ClampedArray(img.data);
      },
      getImageData(_x: number, _y: number, w: number, h: number): StubImageData {
        if (!this._pixels || this._pixels.length !== w * h * 4) {
          this._pixels = new Uint8ClampedArray(w * h * 4);
        }
        return { data: this._pixels, width: w, height: h };
      },
      drawImage(image): void {
        if (image._pixels) {
          this._pixels = new Uint8ClampedArray(image._pixels);
        }
      },
      fillRect: (): void => {
        /* no-op */
      },
    };
    cache._stubCtx = ctx;
    return ctx;
  } as typeof HTMLCanvasElement.prototype.getContext;

  HTMLCanvasElement.prototype.toBlob = function (
    this: HTMLCanvasElement,
    cb: BlobCallback,
  ): void {
    // Snapshot the pixel buffer that was just put via putImageData.
    const ctx = this.getContext('2d') as unknown as StubCanvasContext | null;
    const pixelData =
      ctx && ctx._pixels
        ? new Uint8ClampedArray(ctx._pixels)
        : new Uint8ClampedArray(this.width * this.height * 4);
    const id = `stub-png-${nextBlobId++}`;
    blobStore.set(id, {
      width: this.width,
      height: this.height,
      data: pixelData,
    });
    const blob = new Blob([id], { type: 'image/png' });
    (blob as Blob & { _stubId?: string })._stubId = id;
    blobIdRegistry.set(blob, id);
    cb(blob);
  } as typeof HTMLCanvasElement.prototype.toBlob;

  URL.createObjectURL = ((blob: Blob): string => {
    const tagged =
      (blob as Blob & { _stubId?: string })._stubId ?? blobIdRegistry.get(blob);
    if (tagged) return `blob:${tagged}`;
    return `blob:stub-blob-${nextBlobId++}`;
  }) as typeof URL.createObjectURL;

  URL.revokeObjectURL = (() => {
    /* no-op */
  }) as typeof URL.revokeObjectURL;

  class MockImage {
    crossOrigin = '';
    onload: (() => void) | null = null;
    onerror: ((err?: unknown) => void) | null = null;
    naturalWidth = 32;
    naturalHeight = 32;
    _pixels: Uint8ClampedArray | null = null;
    private _src = '';
    get src(): string {
      return this._src;
    }
    set src(v: string) {
      this._src = v;
      const id = v.startsWith('blob:') ? v.slice('blob:'.length) : v;
      const stored = blobStore.get(id);
      if (stored) {
        this.naturalWidth = stored.width;
        this.naturalHeight = stored.height;
        this._pixels = stored.data;
        setTimeout(() => this.onload?.(), 0);
      } else {
        setTimeout(() => this.onerror?.(new Error('stub image load failed')), 0);
      }
    }
  }
  globalThis.Image = MockImage as unknown as typeof Image;
}

function restoreCanvasStubs(): void {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.toBlob = originalToBlob;
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
  globalThis.Image = originalImage;
  blobStore.clear();
}

describe('bytesToPng / pngToBytes', () => {
  beforeEach(() => {
    installCanvasStubs();
  });
  afterEach(() => {
    restoreCanvasStubs();
  });

  it('bytesToPng returns a non-empty image/png Blob', async () => {
    const blob = await bytesToPng(new Uint8Array([1, 2, 3, 4]));
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
    expect(blob.size).toBeGreaterThan(0);
  });

  it('round-trips a short byte array through PNG LSB steganography', async () => {
    const original = new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0x00, 0xff, 0x55, 0xaa]);
    const blob = await bytesToPng(original);
    const recovered = await pngToBytes(blob);
    expect(Array.from(recovered)).toEqual(Array.from(original));
  });

  it('round-trips a larger random byte array', async () => {
    const original = new Uint8Array(256);
    crypto.getRandomValues(original);
    const blob = await bytesToPng(original);
    const recovered = await pngToBytes(blob);
    expect(recovered.length).toBe(original.length);
    expect(Array.from(recovered)).toEqual(Array.from(original));
  });
});

describe('shareEncryptedImage + decodeFromImageUrl', () => {
  beforeEach(() => {
    installCanvasStubs();
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    restoreCanvasStubs();
    vi.restoreAllMocks();
  });

  it.skipIf(!hasSubtle)('uploads PNG and returns #img= URL', async () => {
    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u.includes('catbox')) {
        return {
          ok: true,
          status: 200,
          text: async () => 'https://files.catbox.moe/abc.png',
        } as Response;
      }
      return { ok: false, status: 404, text: async () => '' } as Response;
    }) as unknown as typeof fetch;

    const result = await shareEncryptedImage('{"x":1}', 'pw123', 'http://x/');
    expect(result.url).toContain('#img=');
    expect(result.url).toContain(encodeURIComponent('https://files.catbox.moe/abc.png'));
    expect(result.rawUrl).toBe('https://files.catbox.moe/abc.png');
    expect(result.password).toBe('pw123');
    expect(typeof result.pngSize).toBe('number');
    expect((result.pngSize ?? 0)).toBeGreaterThan(0);
  });

  it.skipIf(!hasSubtle)('end-to-end: shareEncryptedImage -> decodeFromImageUrl round-trips text', async () => {
    // Capture the original PNG blob from toBlob (FormData would strip our tag).
    let uploadedPng: Blob | null = null;
    const realToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (
      this: HTMLCanvasElement,
      cb: BlobCallback,
    ): void {
      realToBlob.call(this, (blob: Blob | null) => {
        if (blob && !uploadedPng) uploadedPng = blob;
        cb(blob);
      });
    } as typeof HTMLCanvasElement.prototype.toBlob;

    globalThis.fetch = vi.fn(async (url: RequestInfo | URL) => {
      const u = typeof url === 'string' ? url : url.toString();
      if (u === 'https://catbox.moe/user/api.php') {
        return {
          ok: true,
          status: 200,
          text: async () => 'https://files.catbox.moe/round.png',
        } as Response;
      }
      if (u === 'https://files.catbox.moe/round.png') {
        return {
          ok: true,
          status: 200,
          blob: async () => uploadedPng ?? new Blob([], { type: 'image/png' }),
        } as Response;
      }
      return { ok: false, status: 404, blob: async () => new Blob([]) } as Response;
    }) as unknown as typeof fetch;

    const original = JSON.stringify({ hello: 'world', n: 42 });
    const result = await shareEncryptedImage(original, 'pw-xyz', 'http://viewer/');
    expect(uploadedPng).toBeTruthy();

    const recovered = await decodeFromImageUrl(result.rawUrl ?? '', 'pw-xyz');
    expect(recovered).toBe(original);
  });

  it('decodeFromImageUrl throws when fetch HTTP fails', async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: false,
      status: 500,
      blob: async () => new Blob([]),
    })) as unknown as typeof fetch;

    await expect(
      decodeFromImageUrl('https://files.catbox.moe/missing.png', 'pw'),
    ).rejects.toThrow(/HTTP 500/);
  });
});
