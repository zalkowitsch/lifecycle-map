/**
 * Share strategies — pure TypeScript ports of share.js.
 *
 * All five strategies run client-side. No first-party backend.
 *
 *   1. download         — save a .json file locally
 *   2. embedded         — gzip + base64url in URL fragment
 *   3. catbox           — anonymous file host, permanent, public
 *   4. zerox            — anonymous file host, expires, public, short URL
 *   5. encryptedImage   — AES-GCM + PBKDF2 + PNG LSB steganography + catbox
 *
 * Functions touch the DOM where strictly necessary (canvas, anchor click,
 * crypto.subtle), but never React. UI wiring lives elsewhere.
 */

import { downloadJson } from './download';
import { shareEmbedded } from './embed';
import { shareCatbox } from './catbox';
import { shareZeroXZero } from './zerox';
import { shareEncryptedImage, decodeFromImageUrl } from './encrypted';

export interface ShareResult {
  url: string;
  rawUrl?: string;
  password?: string;
  pngSize?: number;
  /** For embedded URLs: encoded payload length (chars). */
  size?: number;
}

export interface ShareStrategies {
  download(jsonText: string, filename?: string): void;
  embedded(jsonText: string, baseUrl: string): Promise<ShareResult>;
  catbox(jsonText: string, baseUrl: string): Promise<ShareResult>;
  zerox(jsonText: string, baseUrl: string): Promise<ShareResult>;
  encryptedImage(jsonText: string, password: string, baseUrl: string): Promise<ShareResult>;
  decodeFromImageUrl(imageUrl: string, password: string): Promise<string>;
}

/**
 * Build the viewer base URL from the current window location, stripping any
 * trailing file segment so we always land on the directory (mirrors share.js).
 */
export function makeViewerBaseUrl(): string {
  return window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
}

function defaultDownloadFilename(): string {
  const ts = new Date().toISOString().slice(0, 10);
  return `lifecycle-map-${ts}.json`;
}

export const shareStrategies: ShareStrategies = {
  download(jsonText, filename) {
    downloadJson(jsonText, filename ?? defaultDownloadFilename());
  },
  embedded(jsonText, baseUrl) {
    return shareEmbedded(jsonText, baseUrl);
  },
  catbox(jsonText, baseUrl) {
    return shareCatbox(jsonText, baseUrl);
  },
  zerox(jsonText, baseUrl) {
    return shareZeroXZero(jsonText, baseUrl);
  },
  encryptedImage(jsonText, password, baseUrl) {
    return shareEncryptedImage(jsonText, password, baseUrl);
  },
  decodeFromImageUrl(imageUrl, password) {
    return decodeFromImageUrl(imageUrl, password);
  },
};

// Re-exports for callers that want to reach for individual functions directly.
export { downloadJson } from './download';
export { shareEmbedded, gzipBase64Url } from './embed';
export { shareCatbox, uploadToCatbox } from './catbox';
export { shareZeroXZero, uploadToZeroXZero } from './zerox';
export {
  shareEncryptedImage,
  decodeFromImageUrl,
  randomDigits,
  deriveKey,
  encryptPayload,
  decryptPayload,
  bytesToPng,
  pngToBytes,
} from './encrypted';
