/**
 * Strategy 1: Download JSON
 *
 * Pure local download — nothing leaves the browser.
 * Triggers a synthetic anchor click to save the file.
 */

export function downloadJson(text: string, filename: string, mimeType: string = 'application/json'): void {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
