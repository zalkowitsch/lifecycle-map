/* lifecycle-map · share.js
 *
 * Multiple open-source share strategies. All run client-side.
 * No first-party backend. The viewer page hosts no data.
 *
 * Strategies:
 *   1. Embedded URL     — gzip + base64url in URL fragment (no upload, private)
 *   2. catbox.moe       — anonymous file host, permanent, public
 *   3. 0x0.st           — anonymous file host, expires, public, short URL
 *   4. Encrypted image  — AES-GCM cipher + PNG steganography + catbox upload
 *
 * Exports a single function attachShareUI() that wires the share button + modal.
 */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  // ============ DISCLAIMERS ============
  const DISCLAIMER_HTML = `
    <div class="share-disclaimer">
      <strong>These are open-source third-party services.</strong>
      No uptime or privacy guarantees. You are responsible for the content you share.
      <strong>Embedded URL</strong> is the only option where data never leaves your browser.
    </div>
  `;

  // ============ COMPRESSION ============
  async function gzipBase64Url(text) {
    if (!window.pako) throw new Error('pako not loaded');
    const bytes = window.pako.gzip(text);
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function makeJsonBlob(text) {
    return new Blob([text], { type: 'application/json' });
  }

  // ============ STRATEGY 1: EMBEDDED URL ============
  async function shareEmbedded(jsonText) {
    const enc = await gzipBase64Url(jsonText);
    const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    return { url: `${base}#data=${enc}`, size: enc.length };
  }

  // ============ STRATEGY 2: CATBOX.MOE ============
  async function uploadToCatbox(blob, filename) {
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
  async function shareCatbox(jsonText) {
    const blob = makeJsonBlob(jsonText);
    const rawUrl = await uploadToCatbox(blob, 'lifecycle-map.json');
    const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    return { url: `${base}?src=${encodeURIComponent(rawUrl)}`, rawUrl };
  }

  // ============ STRATEGY 3: 0x0.st ============
  async function uploadToZeroXZero(blob, filename) {
    const form = new FormData();
    form.append('file', blob, filename);
    const resp = await fetch('https://0x0.st', { method: 'POST', body: form });
    if (!resp.ok) throw new Error(`0x0.st HTTP ${resp.status}`);
    const url = (await resp.text()).trim();
    if (!url.startsWith('http')) throw new Error('0x0.st returned: ' + url);
    return url;
  }
  async function shareZeroXZero(jsonText) {
    const blob = makeJsonBlob(jsonText);
    const rawUrl = await uploadToZeroXZero(blob, 'lifecycle-map.json');
    const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    return { url: `${base}?src=${encodeURIComponent(rawUrl)}`, rawUrl };
  }

  // ============ STRATEGY 4: ENCRYPTED IMAGE ============
  // Flow: JSON -> gzip -> AES-GCM (PBKDF2-derived key) -> ciphertext -> embed in PNG LSB
  //        -> upload PNG to catbox.moe -> share URL + password separately

  function randomDigits(n) {
    const buf = new Uint8Array(n);
    crypto.getRandomValues(buf);
    return Array.from(buf).map(b => (b % 10).toString()).join('');
  }
  function bytesToBase64(bytes) {
    let bin = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }
  function base64ToBytes(b64) {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function bytesToBase64Url(bytes) {
    return bytesToBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function base64UrlToBytes(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return base64ToBytes(s);
  }

  async function deriveKey(password, salt) {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
    );
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt, iterations: 200000, hash: 'SHA-256' },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptPayload(jsonText, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(password, salt);
    const compressed = window.pako.gzip(jsonText);
    const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, compressed
    ));
    // Packet: 4-byte magic "LM1\0" + 16-byte salt + 12-byte iv + 4-byte length + ciphertext
    const magic = new Uint8Array([0x4C, 0x4D, 0x31, 0x00]);
    const len = new Uint32Array([ciphertext.length]);
    const lenBytes = new Uint8Array(len.buffer);
    const packet = new Uint8Array(magic.length + salt.length + iv.length + lenBytes.length + ciphertext.length);
    let off = 0;
    packet.set(magic, off); off += magic.length;
    packet.set(salt, off); off += salt.length;
    packet.set(iv, off); off += iv.length;
    packet.set(lenBytes, off); off += lenBytes.length;
    packet.set(ciphertext, off);
    return packet;
  }

  async function decryptPayload(packet, password) {
    if (packet.length < 36) throw new Error('Payload too short.');
    const magic = packet.slice(0, 4);
    if (magic[0] !== 0x4C || magic[1] !== 0x4D || magic[2] !== 0x31) {
      throw new Error('Bad magic bytes. Not a lifecycle-map encrypted payload.');
    }
    const salt = packet.slice(4, 20);
    const iv = packet.slice(20, 32);
    const len = new DataView(packet.buffer, packet.byteOffset + 32, 4).getUint32(0, true);
    const ciphertext = packet.slice(36, 36 + len);
    const key = await deriveKey(password, salt);
    const plain = new Uint8Array(await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, ciphertext
    ));
    return window.pako.ungzip(plain, { to: 'string' });
  }

  // Encode `bytes` into PNG LSB. Uses RGB channels (3 bits per pixel).
  // Stores 32-bit length prefix at the start so the decoder knows where to stop.
  function bytesToPng(bytes) {
    const lenBytes = new Uint8Array(new Uint32Array([bytes.length]).buffer);
    const payload = new Uint8Array(lenBytes.length + bytes.length);
    payload.set(lenBytes, 0);
    payload.set(bytes, lenBytes.length);

    const totalBits = payload.length * 8;
    const pixelsNeeded = Math.ceil(totalBits / 3); // 3 bits per pixel (R,G,B LSB)
    const side = Math.max(32, Math.ceil(Math.sqrt(pixelsNeeded)));

    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;
    const ctx = canvas.getContext('2d');
    // Fill with random noise so it looks like a meaningful image
    const img = ctx.createImageData(side, side);
    crypto.getRandomValues(img.data);
    // Force alpha to fully opaque
    for (let i = 3; i < img.data.length; i += 4) img.data[i] = 255;

    let bitIdx = 0;
    for (let i = 0; i < payload.length; i++) {
      const byte = payload[i];
      for (let b = 7; b >= 0; b--) {
        const bit = (byte >> b) & 1;
        const pixelIdx = Math.floor(bitIdx / 3);
        const channel = bitIdx % 3; // 0=R, 1=G, 2=B
        const idx = pixelIdx * 4 + channel;
        img.data[idx] = (img.data[idx] & 0xFE) | bit;
        bitIdx++;
      }
    }
    ctx.putImageData(img, 0, 0);
    return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  }

  async function pngToBytes(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = await new Promise((resolve, reject) => {
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
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      // First 32 bits = length
      let lenBits = 0, len = 0;
      for (let bitIdx = 0; bitIdx < 32; bitIdx++) {
        const pixelIdx = Math.floor(bitIdx / 3);
        const channel = bitIdx % 3;
        const idx = pixelIdx * 4 + channel;
        const bit = data[idx] & 1;
        len = (len << 1) | bit;
      }
      // Little-endian 32-bit length
      len = (((len & 0xFF) << 24) | (((len >> 8) & 0xFF) << 16) | (((len >> 16) & 0xFF) << 8) | ((len >> 24) & 0xFF)) >>> 0;
      if (len > 10 * 1024 * 1024) throw new Error('Decoded length absurd. Bad image?');

      const totalBits = (4 + len) * 8;
      const payload = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        let byte = 0;
        for (let b = 0; b < 8; b++) {
          const bitIdx = 32 + i * 8 + b;
          const pixelIdx = Math.floor(bitIdx / 3);
          const channel = bitIdx % 3;
          const idx = pixelIdx * 4 + channel;
          const bit = data[idx] & 1;
          byte = (byte << 1) | bit;
        }
        payload[i] = byte;
      }
      return payload;
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function shareEncryptedImage(jsonText, password) {
    const packet = await encryptPayload(jsonText, password);
    const pngBlob = await bytesToPng(packet);
    const rawUrl = await uploadToCatbox(pngBlob, 'lifecycle-map.png');
    const base = window.location.origin + window.location.pathname.replace(/\/[^\/]*$/, '/');
    return {
      url: `${base}#img=${encodeURIComponent(rawUrl)}`,
      rawUrl,
      password,
      pngSize: pngBlob.size,
    };
  }

  // Decryption entry point (called by viewer.js when ?img=... or #img=... is present)
  async function decodeFromImageUrl(imageUrl, password) {
    const resp = await fetch(imageUrl);
    if (!resp.ok) throw new Error(`Failed to fetch image: HTTP ${resp.status}`);
    const blob = await resp.blob();
    const payload = await pngToBytes(blob);
    return decryptPayload(payload, password);
  }

  // ============ UI: SHARE MODAL ============
  function attachShareUI(getJsonText) {
    const btn = $('share-btn');
    const modal = $('share-modal');
    const scrim = $('share-scrim');
    const close = $('share-close');
    const list = $('share-list');
    if (!btn || !modal || !list) return;

    list.innerHTML = renderShareCards();

    btn.addEventListener('click', () => openShare());
    scrim.addEventListener('click', closeShare);
    close.addEventListener('click', closeShare);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('open')) closeShare();
    });

    list.addEventListener('click', async (e) => {
      const action = e.target.closest('[data-action]');
      if (!action) return;
      const card = action.closest('.share-card');
      const strategy = card?.dataset.strategy;
      const act = action.dataset.action;
      if (!strategy || !act) return;
      try {
        await runAction(strategy, act, card);
      } catch (err) {
        showCardError(card, err.message || String(err));
      }
    });

    function openShare() {
      modal.classList.add('open');
      scrim.classList.add('open');
      btn.classList.add('is-active');
      modal.setAttribute('aria-hidden', 'false');
    }
    function closeShare() {
      modal.classList.remove('open');
      scrim.classList.remove('open');
      btn.classList.remove('is-active');
      modal.setAttribute('aria-hidden', 'true');
    }

    async function runAction(strategy, act, card) {
      const json = getJsonText();
      if (!json) throw new Error('No map loaded yet.');

      const status = card.querySelector('.share-status');
      const result = card.querySelector('.share-result');
      result.innerHTML = '';
      setBusy(status, 'Working…');

      try {
        if (strategy === 'embedded') {
          const r = await shareEmbedded(json);
          showLink(result, r.url, `URL · ${formatSize(r.url.length)}`);
        }
        else if (strategy === 'catbox') {
          const r = await shareCatbox(json);
          showLink(result, r.url, 'Viewer URL');
          showLink(result, r.rawUrl, 'Raw JSON', { secondary: true });
        }
        else if (strategy === 'zerox') {
          const r = await shareZeroXZero(json);
          showLink(result, r.url, 'Viewer URL');
          showLink(result, r.rawUrl, 'Raw JSON', { secondary: true });
        }
        else if (strategy === 'encrypted') {
          const mode = card.querySelector('input[name="pw-mode"]:checked')?.value || 'auto';
          let password;
          if (mode === 'auto') {
            password = randomDigits(8);
          } else {
            const customInput = card.querySelector('input[name="pw-custom"]');
            password = customInput?.value || '';
            if (password.length < 6) throw new Error('Password must be at least 6 characters.');
          }
          const r = await shareEncryptedImage(json, password);
          showLink(result, r.url, 'Share URL');
          showCopy(result, password, 'Password');
          const note = document.createElement('div');
          note.className = 'share-note';
          note.innerHTML = `Encrypted PNG <code>${formatSize(r.pngSize)}</code> on catbox.moe.<br>Share URL and password <strong>separately</strong> for real security.`;
          result.appendChild(note);
        }
        clearBusy(status);
      } catch (err) {
        clearBusy(status);
        throw err;
      }
    }

    function setBusy(el, msg) { el.textContent = msg; el.classList.add('busy'); }
    function clearBusy(el) { el.textContent = ''; el.classList.remove('busy'); }
    function showCardError(card, msg) {
      const result = card.querySelector('.share-result');
      result.innerHTML = `<div class="share-err">${escapeHtml(msg)}</div>`;
    }
  }

  function showLink(parent, url, label, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'share-link-row' + (opts.secondary ? ' secondary' : '');
    wrap.innerHTML = `
      <div class="share-link-label">${escapeHtml(label)}</div>
      <div class="share-link-box">
        <input type="text" readonly value="${escapeAttr(url)}">
        <button class="share-copy-btn" data-copy="${escapeAttr(url)}" title="Copy">Copy</button>
        <a href="${escapeAttr(url)}" target="_blank" rel="noopener noreferrer" title="Open">Open ↗</a>
      </div>
    `;
    parent.appendChild(wrap);
    wireCopy(wrap);
  }
  function showCopy(parent, value, label) {
    const wrap = document.createElement('div');
    wrap.className = 'share-link-row';
    wrap.innerHTML = `
      <div class="share-link-label">${escapeHtml(label)}</div>
      <div class="share-link-box">
        <input type="text" readonly value="${escapeAttr(value)}">
        <button class="share-copy-btn" data-copy="${escapeAttr(value)}" title="Copy">Copy</button>
      </div>
    `;
    parent.appendChild(wrap);
    wireCopy(wrap);
  }
  function wireCopy(wrap) {
    wrap.querySelectorAll('[data-copy]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(btn.dataset.copy);
          const orig = btn.textContent;
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = orig; }, 1400);
        } catch (_) {
          // fallback: select the input
          const input = btn.parentElement.querySelector('input');
          if (input) { input.select(); document.execCommand('copy'); }
        }
      });
    });
  }
  function formatSize(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / 1024 / 1024).toFixed(2) + ' MB';
  }
  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function renderShareCards() {
    return `
      <div class="share-card" data-strategy="embedded">
        <div class="share-card-head">
          <div>
            <div class="share-card-name">Embedded URL</div>
            <div class="share-card-meta">no upload · private · long URL</div>
          </div>
          <span class="share-badge ok">private</span>
        </div>
        <p class="share-card-desc">Gzip-compressed JSON in the URL fragment. The map travels with the link itself — nothing is uploaded anywhere. Works offline once opened.</p>
        <div class="share-card-actions">
          <button class="share-action-btn" data-action="run">Generate URL</button>
        </div>
        <div class="share-status"></div>
        <div class="share-result"></div>
      </div>

      <div class="share-card" data-strategy="catbox">
        <div class="share-card-head">
          <div>
            <div class="share-card-name">catbox.moe</div>
            <div class="share-card-meta">anonymous · permanent · 200 MB max</div>
          </div>
          <span class="share-badge public">public</span>
        </div>
        <p class="share-card-desc">Uploads raw JSON to <a href="https://catbox.moe" target="_blank" rel="noopener">catbox.moe</a> — a community-run anonymous file host. No account, no expiration. JSON is publicly readable by anyone with the URL.</p>
        <div class="share-card-actions">
          <button class="share-action-btn" data-action="run">Upload &amp; share</button>
        </div>
        <div class="share-status"></div>
        <div class="share-result"></div>
      </div>

      <div class="share-card" data-strategy="zerox">
        <div class="share-card-head">
          <div>
            <div class="share-card-name">0x0.st</div>
            <div class="share-card-meta">anonymous · expires 30d–1y · short URL</div>
          </div>
          <span class="share-badge public">public</span>
        </div>
        <p class="share-card-desc">Uploads raw JSON to <a href="https://0x0.st" target="_blank" rel="noopener">0x0.st</a>. Very short URL, but the file expires (longer-lived for smaller files).</p>
        <div class="share-card-actions">
          <button class="share-action-btn" data-action="run">Upload &amp; share</button>
        </div>
        <div class="share-status"></div>
        <div class="share-result"></div>
      </div>

      <div class="share-card" data-strategy="encrypted">
        <div class="share-card-head">
          <div>
            <div class="share-card-name">Encrypted image</div>
            <div class="share-card-meta">AES-GCM · hidden in PNG · catbox.moe</div>
          </div>
          <span class="share-badge secure">encrypted</span>
        </div>
        <p class="share-card-desc">Encrypts the map with your password (AES-GCM, PBKDF2 200k iter), hides the ciphertext in PNG pixels via LSB steganography, uploads the image to catbox.moe. Host sees only an image. Anyone with the URL <em>and</em> the password can decode.</p>
        <div class="share-card-input">
          <label class="pw-mode-row">
            <input type="radio" name="pw-mode" value="auto" checked>
            <span>Auto-generate 8-digit password</span>
          </label>
          <label class="pw-mode-row">
            <input type="radio" name="pw-mode" value="custom">
            <span>Choose my own password</span>
          </label>
          <input type="password" name="pw-custom" placeholder="min 6 characters" autocomplete="new-password" disabled>
        </div>
        <div class="share-card-actions">
          <button class="share-action-btn" data-action="run">Encrypt, upload &amp; share</button>
        </div>
        <div class="share-status"></div>
        <div class="share-result"></div>
      </div>
    `;
  }

  // Wire up password mode toggle inside encrypted card
  document.addEventListener('change', (e) => {
    if (e.target.name === 'pw-mode') {
      const card = e.target.closest('.share-card');
      if (!card) return;
      const customInput = card.querySelector('input[name="pw-custom"]');
      if (customInput) {
        customInput.disabled = e.target.value !== 'custom';
        if (!customInput.disabled) customInput.focus();
      }
    }
  });

  // Public API
  window.LifecycleShare = {
    attachShareUI,
    decodeFromImageUrl,
    DISCLAIMER_HTML,
  };
})();
