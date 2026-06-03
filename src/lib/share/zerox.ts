/**
 * Strategy 4: 0x0.st
 *
 * Anonymous file host with short URLs. Files expire (30 days – 1 year
 * depending on size). Returns a viewer URL with raw URL in ?src=.
 */

import type { ShareResult } from './index';

function makeJsonBlob(text: string): Blob {
  return new Blob([text], { type: 'application/json' });
}

export async function uploadToZeroXZero(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append('file', blob, filename);
  const resp = await fetch('https://0x0.st', { method: 'POST', body: form });
  if (!resp.ok) throw new Error(`0x0.st HTTP ${resp.status}`);
  const url = (await resp.text()).trim();
  if (!url.startsWith('http')) throw new Error('0x0.st returned: ' + url);
  return url;
}

export async function shareZeroXZero(jsonText: string, baseUrl: string): Promise<ShareResult> {
  const blob = makeJsonBlob(jsonText);
  const rawUrl = await uploadToZeroXZero(blob, 'lifecycle-map.json');
  return { url: `${baseUrl}?src=${encodeURIComponent(rawUrl)}`, rawUrl };
}
