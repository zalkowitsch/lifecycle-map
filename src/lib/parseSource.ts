// Source-text parsing and #data= hash codec.
//
// Ported from viewer.js (parseSource, loadFromHash) and share.js (gzipBase64Url).
// - parseSource: try JSON, fall back to YAML.
// - decodeHashData: base64url + pako ungzip -> JSON.parse.
// - encodeHashData: pako gzip + base64url (matches the URL fragment encoder).

import yaml from 'js-yaml';
import pako from 'pako';

import type { LifecycleMap } from '@/types/lifecycle-map';

/**
 * Parse a source string as JSON first, then fall back to YAML.
 * Throws with a descriptive message if neither parser accepts the input.
 */
export function parseSource(text: string): LifecycleMap {
  try {
    return JSON.parse(text) as LifecycleMap;
  } catch (_jsonErr) {
    // fall through to YAML
  }
  try {
    return yaml.load(text) as LifecycleMap;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error('Failed to parse as JSON or YAML: ' + msg);
  }
}

/**
 * Decode a `#data=<blob>` URL-fragment payload: base64url -> bytes -> gunzip -> JSON.
 * Mirrors viewer.js `loadFromHash` (minus the splash/loading UI side effects).
 */
export async function decodeHashData(blob: string): Promise<LifecycleMap> {
  try {
    const b64 = blob
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(blob.length / 4) * 4, '=');
    const binStr = atob(b64);
    const bytes = new Uint8Array(binStr.length);
    for (let i = 0; i < binStr.length; i++) bytes[i] = binStr.charCodeAt(i);
    const inflated = pako.ungzip(bytes, { to: 'string' });
    return JSON.parse(inflated) as LifecycleMap;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error('Failed to decode #data: ' + msg);
  }
}

/**
 * Encode a source text as a base64url-encoded gzip blob suitable for `#data=`.
 * Mirrors share.js `gzipBase64Url`.
 */
export async function encodeHashData(text: string): Promise<string> {
  const bytes = pako.gzip(text);
  let bin = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
