/**
 * Strategy 1: Download JSON
 *
 * Pure local download — nothing leaves the browser.
 * Triggers a synthetic anchor click to save the file.
 */

function makeJsonBlob(text: string): Blob {
  return new Blob([text], { type: 'application/json' });
}

export function downloadJson(text: string, filename: string): void {
  const blob = makeJsonBlob(text);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
