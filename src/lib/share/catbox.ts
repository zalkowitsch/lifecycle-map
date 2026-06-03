/**
 * Strategy 3: catbox.moe
 *
 * Anonymous community-run file host. Permanent, public, 200 MB max.
 * Uploads raw JSON; returns a viewer URL with the raw URL in ?src=.
 */

import type { ShareResult } from './index';

function makeJsonBlob(text: string): Blob {
  return new Blob([text], { type: 'application/json' });
}

export async function uploadToCatbox(blob: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('fileToUpload', blob, filename);
  const resp = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
  });
  if (!resp.ok) throw new Error(`catbox.moe HTTP ${resp.status}`);
  const url = (await resp.text()).trim();
  if (!url.startsWith('http')) throw new Error('catbox.moe returned: ' + url);
  return url;
}

export async function shareCatbox(jsonText: string, baseUrl: string): Promise<ShareResult> {
  const blob = makeJsonBlob(jsonText);
  const rawUrl = await uploadToCatbox(blob, 'lifecycle-map.json');
  return { url: `${baseUrl}?src=${encodeURIComponent(rawUrl)}`, rawUrl };
}
