/**
 * Strategy 2: Embedded URL
 *
 * Gzip + base64url the JSON, stash it in the URL fragment.
 * No upload — the map travels with the link itself.
 */

import pako from 'pako';

import type { ShareResult } from './index';

/**
 * Gzip `text` then encode the bytes as URL-safe base64 (no padding).
 * Chunked String.fromCharCode keeps us from blowing the call-stack on large inputs.
 */
export async function gzipBase64Url(text: string): Promise<string> {
  const bytes = pako.gzip(text);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function shareEmbedded(jsonText: string, baseUrl: string): Promise<ShareResult> {
  const enc = await gzipBase64Url(jsonText);
  return { url: `${baseUrl}#data=${enc}`, size: enc.length };
}
