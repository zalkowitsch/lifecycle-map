/**
 * Strategy 5: Encrypted image
 *
 * Flow: JSON -> gzip -> AES-GCM (PBKDF2-derived key) -> ciphertext
 *       -> LSB-embed in PNG -> upload PNG to catbox.moe
 *       -> share URL + password separately.
 *
 * Packet layout (encrypted bytes):
 *   [4 magic "LM1\0"] [16 salt] [12 iv] [4 le-length] [ciphertext...]
 *
 * Steganography: 32-bit length prefix in the first 32 RGB LSBs, then the
 * packet bytes one bit at a time across R/G/B channels (alpha is forced
 * opaque so the image renders normally).
 */

import pako from 'pako';
import { uploadToCatbox } from './catbox';
import type { ShareResult } from './index';

const PBKDF2_ITERATIONS = 200_000;
const SALT_LEN = 16;
const IV_LEN = 12;
const MAGIC = new Uint8Array([0x4c, 0x4d, 0x31, 0x00]); // "LM1\0"
const HEADER_LEN = MAGIC.length + SALT_LEN + IV_LEN + 4; // 36

/** Random N-digit string. Note: each digit is `byte % 10`, so distribution is
 *  slightly biased (256 % 10 != 0). Preserved from the original — the calling
 *  code only needs human-friendly entropy, not crypto-grade digits. */
export function randomDigits(n: number): string {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => (b % 10).toString())
    .join('');
}

export async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptPayload(text: string, password: string): Promise<Uint8Array> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(password, salt);
  const compressed = pako.gzip(text);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, compressed),
  );

  const lenBytes = new Uint8Array(new Uint32Array([ciphertext.length]).buffer);
  const packet = new Uint8Array(HEADER_LEN + ciphertext.length);
  let off = 0;
  packet.set(MAGIC, off);
  off += MAGIC.length;
  packet.set(salt, off);
  off += salt.length;
  packet.set(iv, off);
  off += iv.length;
  packet.set(lenBytes, off);
  off += lenBytes.length;
  packet.set(ciphertext, off);
  return packet;
}

export async function decryptPayload(packet: Uint8Array, password: string): Promise<string> {
  if (packet.length < HEADER_LEN) throw new Error('Payload too short.');
  if (packet[0] !== MAGIC[0] || packet[1] !== MAGIC[1] || packet[2] !== MAGIC[2]) {
    throw new Error('Bad magic bytes. Not a lifecycle-map encrypted payload.');
  }
  const salt = packet.slice(4, 4 + SALT_LEN);
  const iv = packet.slice(4 + SALT_LEN, 4 + SALT_LEN + IV_LEN);
  const len = new DataView(packet.buffer, packet.byteOffset + 32, 4).getUint32(0, true);
  const ciphertext = packet.slice(HEADER_LEN, HEADER_LEN + len);
  const key = await deriveKey(password, salt);
  const plain = new Uint8Array(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext),
  );
  return pako.ungzip(plain, { to: 'string' });
}

/**
 * Encode `bytes` into a square PNG via RGB LSB steganography.
 * 3 bits per pixel (one per channel). A 32-bit length prefix is written
 * first so the decoder knows where to stop.
 */
export async function bytesToPng(bytes: Uint8Array): Promise<Blob> {
  const lenBytes = new Uint8Array(new Uint32Array([bytes.length]).buffer);
  const payload = new Uint8Array(lenBytes.length + bytes.length);
  payload.set(lenBytes, 0);
  payload.set(bytes, lenBytes.length);

  const totalBits = payload.length * 8;
  const pixelsNeeded = Math.ceil(totalBits / 3);
  const side = Math.max(32, Math.ceil(Math.sqrt(pixelsNeeded)));

  const canvas = document.createElement('canvas');
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable.');

  // Random noise so the image looks meaningful, then force alpha opaque.
  const img = ctx.createImageData(side, side);
  crypto.getRandomValues(img.data);
  for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;

  let bitIdx = 0;
  for (let i = 0; i < payload.length; i++) {
    const byte = payload[i]!;
    for (let b = 7; b >= 0; b--) {
      const bit = (byte >> b) & 1;
      const pixelIdx = Math.floor(bitIdx / 3);
      const channel = bitIdx % 3; // 0=R, 1=G, 2=B
      const idx = pixelIdx * 4 + channel;
      img.data[idx] = (img.data[idx]! & 0xfe) | bit;
      bitIdx++;
    }
  }
  ctx.putImageData(img, 0, 0);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob() returned null.'));
    }, 'image/png');
  });
}

export async function pngToBytes(blob: Blob): Promise<Uint8Array> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable.');
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

    // First 32 bits = length (read as big-endian bits, then byteswap to LE).
    let len = 0;
    for (let bitIdx = 0; bitIdx < 32; bitIdx++) {
      const pixelIdx = Math.floor(bitIdx / 3);
      const channel = bitIdx % 3;
      const idx = pixelIdx * 4 + channel;
      const bit = data[idx]! & 1;
      len = (len << 1) | bit;
    }
    len =
      (((len & 0xff) << 24) |
        (((len >> 8) & 0xff) << 16) |
        (((len >> 16) & 0xff) << 8) |
        ((len >> 24) & 0xff)) >>>
      0;
    if (len > 10 * 1024 * 1024) throw new Error('Decoded length absurd. Bad image?');

    const payload = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      let byte = 0;
      for (let b = 0; b < 8; b++) {
        const bitIdx = 32 + i * 8 + b;
        const pixelIdx = Math.floor(bitIdx / 3);
        const channel = bitIdx % 3;
        const idx = pixelIdx * 4 + channel;
        const bit = data[idx]! & 1;
        byte = (byte << 1) | bit;
      }
      payload[i] = byte;
    }
    return payload;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function shareEncryptedImage(
  text: string,
  password: string,
  baseUrl: string,
): Promise<ShareResult> {
  const packet = await encryptPayload(text, password);
  const pngBlob = await bytesToPng(packet);
  const rawUrl = await uploadToCatbox(pngBlob, 'lifecycle-map.png');
  return {
    url: `${baseUrl}#img=${encodeURIComponent(rawUrl)}`,
    rawUrl,
    password,
    pngSize: pngBlob.size,
  };
}

/** Decryption entry point — fetch the PNG, recover bytes, decrypt. */
export async function decodeFromImageUrl(imageUrl: string, password: string): Promise<string> {
  const resp = await fetch(imageUrl);
  if (!resp.ok) throw new Error(`Failed to fetch image: HTTP ${resp.status}`);
  const blob = await resp.blob();
  const payload = await pngToBytes(blob);
  return decryptPayload(payload, password);
}
