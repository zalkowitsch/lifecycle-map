// ShareModal — central modal listing the five share strategies.
//
// Ported from share.js `renderShareCards` (~line 458) and `runAction` (~line
// 330) — UI assembly + per-card status/result rendering. The strategies
// themselves live in `@/lib/share` and are pure side-effect functions; this
// component only owns UI state (which card is busy, per-card result, the
// encrypted-card password mode + custom input).
//
// Close behavior: scrim click, close button, or Esc.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { makeViewerBaseUrl, shareStrategies, type ShareResult } from '@/lib/share';
import { toMermaid } from '@/lib/mermaid';
import type { LifecycleMap } from '@/types/lifecycle-map';

import styles from './ShareModal.module.css';

export interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  getJsonText: () => string;
}

type StrategyId = 'download' | 'mermaid' | 'embedded' | 'catbox' | 'zerox' | 'encrypted';
type BadgeKind = 'ok' | 'public' | 'auth' | 'secure';
type PwMode = 'auto' | 'custom';

interface CardConfig {
  id: StrategyId;
  name: string;
  meta: string;
  badge: { label: string; kind: BadgeKind };
  desc: ReactNode;
  actionLabel: string;
}

const CARDS: CardConfig[] = [
  {
    id: 'download',
    name: 'Download JSON',
    meta: 'save locally · nothing leaves your browser',
    badge: { label: 'private', kind: 'ok' },
    desc: (
      <>
        Save the map as a <code>.json</code> file on your machine. The simplest option — no URL, no
        upload, no third party. Drop the file back onto the viewer later to reopen it.
      </>
    ),
    actionLabel: 'Download .json',
  },
  {
    id: 'mermaid',
    name: 'Export as Mermaid',
    meta: 'flowchart .mmd · paste into Mermaid Live / Notion / GitHub',
    badge: { label: 'private', kind: 'ok' },
    desc: (
      <>
        Convert the map to a{' '}
        <a href="https://mermaid.js.org/syntax/flowchart.html" target="_blank" rel="noopener noreferrer">
          Mermaid flowchart
        </a>{' '}
        — phases become subgraphs, lanes become classDefs, shapes survive. Roundtrips back via the
        viewer (rich fields like states and modules are stashed in comments). Nothing is uploaded.
      </>
    ),
    actionLabel: 'Download .mmd',
  },
  {
    id: 'embedded',
    name: 'Embedded URL',
    meta: 'no upload · private · long URL',
    badge: { label: 'private', kind: 'ok' },
    desc: (
      <>
        Gzip-compressed JSON in the URL fragment. The map travels with the link itself — nothing is
        uploaded anywhere. Works offline once opened.
      </>
    ),
    actionLabel: 'Generate URL',
  },
  {
    id: 'catbox',
    name: 'catbox.moe',
    meta: 'anonymous · permanent · 200 MB max',
    badge: { label: 'public', kind: 'public' },
    desc: (
      <>
        Uploads raw JSON to{' '}
        <a href="https://catbox.moe" target="_blank" rel="noopener noreferrer">
          catbox.moe
        </a>{' '}
        — a community-run anonymous file host. No account, no expiration. JSON is publicly readable
        by anyone with the URL.
      </>
    ),
    actionLabel: 'Upload & share',
  },
  {
    id: 'zerox',
    name: '0x0.st',
    meta: 'anonymous · expires 30d–1y · short URL',
    badge: { label: 'public', kind: 'public' },
    desc: (
      <>
        Uploads raw JSON to{' '}
        <a href="https://0x0.st" target="_blank" rel="noopener noreferrer">
          0x0.st
        </a>
        . Very short URL, but the file expires (longer-lived for smaller files).
      </>
    ),
    actionLabel: 'Upload & share',
  },
  {
    id: 'encrypted',
    name: 'Encrypted image',
    meta: 'AES-GCM · hidden in PNG · catbox.moe',
    badge: { label: 'encrypted', kind: 'secure' },
    desc: (
      <>
        Encrypts the map with your password (AES-GCM, PBKDF2 200k iter), hides the ciphertext in
        PNG pixels via LSB steganography, uploads the image to catbox.moe. Host sees only an image.
        Anyone with the URL <em>and</em> the password can decode.
      </>
    ),
    actionLabel: 'Encrypt, upload & share',
  },
];

function badgeClass(kind: BadgeKind): string {
  switch (kind) {
    case 'ok':
      return `${styles.badge} ${styles.badgeOk}`;
    case 'public':
      return `${styles.badge} ${styles.badgePublic}`;
    case 'auth':
      return `${styles.badge} ${styles.badgeAuth}`;
    case 'secure':
      return `${styles.badge} ${styles.badgeSecure}`;
  }
}

function formatSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

interface LinkRowProps {
  label: string;
  value: string;
  href?: string;
  secondary?: boolean;
}

function LinkRow({ label, value, href, secondary }: LinkRowProps): JSX.Element {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      // Clipboard API can throw in insecure contexts — silently no-op.
    }
  }, [value]);

  const rowClass = secondary ? `${styles.linkRow} ${styles.linkRowSecondary}` : styles.linkRow;

  return (
    <div className={rowClass}>
      <div className={styles.linkLabel}>{label}</div>
      <div className={styles.linkBox}>
        <input type="text" readOnly value={value} />
        <button type="button" className={styles.copyBtn} onClick={copy} title="Copy">
          {copied ? 'Copied!' : 'Copy'}
        </button>
        {href ? (
          <a
            className={styles.openLink}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            title="Open"
          >
            Open ↗
          </a>
        ) : null}
      </div>
    </div>
  );
}

interface CardResult {
  busy: boolean;
  error: string | null;
  payload: {
    strategy: StrategyId;
    result?: ShareResult;
    downloadInfo?: { filename: string; size: number };
    password?: string;
  } | null;
}

const EMPTY_CARD_RESULT: CardResult = { busy: false, error: null, payload: null };

export default function ShareModal({ open, onClose, getJsonText }: ShareModalProps): JSX.Element {
  const [results, setResults] = useState<Record<StrategyId, CardResult>>({
    download: EMPTY_CARD_RESULT,
    mermaid: EMPTY_CARD_RESULT,
    embedded: EMPTY_CARD_RESULT,
    catbox: EMPTY_CARD_RESULT,
    zerox: EMPTY_CARD_RESULT,
    encrypted: EMPTY_CARD_RESULT,
  });
  const [pwMode, setPwMode] = useState<PwMode>('auto');
  const [pwCustom, setPwCustom] = useState('');

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const updateCard = useCallback((id: StrategyId, patch: Partial<CardResult>) => {
    setResults((prev) => ({
      ...prev,
      [id]: { ...prev[id], ...patch },
    }));
  }, []);

  const runAction = useCallback(
    async (id: StrategyId): Promise<void> => {
      const json = getJsonText();
      if (!json) {
        updateCard(id, { error: 'No map loaded yet.', busy: false, payload: null });
        return;
      }

      updateCard(id, { busy: true, error: null, payload: null });
      const baseUrl = makeViewerBaseUrl();

      try {
        if (id === 'download') {
          const ts = new Date().toISOString().slice(0, 10);
          const filename = `lifecycle-map-${ts}.json`;
          shareStrategies.download(json, filename);
          const size = new Blob([json], { type: 'application/json' }).size;
          updateCard(id, {
            busy: false,
            payload: { strategy: 'download', downloadInfo: { filename, size } },
          });
        } else if (id === 'mermaid') {
          const parsed = JSON.parse(json) as LifecycleMap;
          const mmd = toMermaid(parsed);
          const ts = new Date().toISOString().slice(0, 10);
          const filename = `lifecycle-map-${ts}.mmd`;
          shareStrategies.download(mmd, filename, 'text/plain');
          const size = new Blob([mmd], { type: 'text/plain' }).size;
          updateCard(id, {
            busy: false,
            payload: { strategy: 'mermaid', downloadInfo: { filename, size } },
          });
        } else if (id === 'embedded') {
          const r = await shareStrategies.embedded(json, baseUrl);
          updateCard(id, { busy: false, payload: { strategy: 'embedded', result: r } });
        } else if (id === 'catbox') {
          const r = await shareStrategies.catbox(json, baseUrl);
          updateCard(id, { busy: false, payload: { strategy: 'catbox', result: r } });
        } else if (id === 'zerox') {
          const r = await shareStrategies.zerox(json, baseUrl);
          updateCard(id, { busy: false, payload: { strategy: 'zerox', result: r } });
        } else if (id === 'encrypted') {
          let password: string;
          if (pwMode === 'auto') {
            // Use the strategy's own randomDigits helper indirectly: call with empty
            // string would fail validation, so derive 8-digit locally.
            password = generateDigits(8);
          } else {
            if (pwCustom.length < 6) {
              throw new Error('Password must be at least 6 characters.');
            }
            password = pwCustom;
          }
          const r = await shareStrategies.encryptedImage(json, password, baseUrl);
          updateCard(id, {
            busy: false,
            payload: { strategy: 'encrypted', result: r, password },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        updateCard(id, { busy: false, error: message, payload: null });
      }
    },
    [getJsonText, pwMode, pwCustom, updateCard],
  );

  const modalClass = useMemo(
    () => (open ? `${styles.modal} ${styles.open}` : styles.modal),
    [open],
  );
  const scrimClass = useMemo(
    () => (open ? `${styles.scrim} ${styles.open}` : styles.scrim),
    [open],
  );

  return (
    <>
      <div
        className={scrimClass}
        onClick={onClose}
        aria-hidden={open ? 'false' : 'true'}
      />
      <div
        className={modalClass}
        role="dialog"
        aria-modal="true"
        aria-label="Share"
        aria-hidden={open ? 'false' : 'true'}
      >
        <div className={styles.header}>
          <div>
            <div className={styles.eyebrow}>share</div>
            <h2 className={styles.title}>
              Share <em>· six ways</em>
            </h2>
          </div>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            aria-label="Close share dialog"
          >
            ×
          </button>
        </div>
        <div className={styles.body}>
          <div className={styles.disclaimer}>
            <strong>These are open-source third-party services.</strong> No uptime or privacy
            guarantees. You are responsible for the content you share.{' '}
            <strong>Embedded URL</strong> is the only option where data never leaves your browser.
          </div>
          <div className={styles.list}>
            {CARDS.map((card) => {
              const state = results[card.id];
              return (
                <div key={card.id} className={styles.card}>
                  <div className={styles.cardHead}>
                    <div>
                      <div className={styles.cardName}>{card.name}</div>
                      <div className={styles.cardMeta}>{card.meta}</div>
                    </div>
                    <span className={badgeClass(card.badge.kind)}>{card.badge.label}</span>
                  </div>
                  <p className={styles.cardDesc}>{card.desc}</p>
                  {card.id === 'encrypted' ? (
                    <div className={styles.cardInput}>
                      <label className={styles.pwModeRow}>
                        <input
                          type="radio"
                          name="pw-mode"
                          value="auto"
                          checked={pwMode === 'auto'}
                          onChange={() => setPwMode('auto')}
                        />
                        <span>Auto-generate 8-digit password</span>
                      </label>
                      <label className={styles.pwModeRow}>
                        <input
                          type="radio"
                          name="pw-mode"
                          value="custom"
                          checked={pwMode === 'custom'}
                          onChange={() => setPwMode('custom')}
                        />
                        <span>Choose my own password</span>
                      </label>
                      <input
                        type="password"
                        name="pw-custom"
                        placeholder="min 6 characters"
                        autoComplete="new-password"
                        disabled={pwMode !== 'custom'}
                        value={pwCustom}
                        onChange={(e) => setPwCustom(e.target.value)}
                      />
                    </div>
                  ) : null}
                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => {
                        void runAction(card.id);
                      }}
                      disabled={state.busy}
                    >
                      {card.actionLabel}
                    </button>
                  </div>
                  <div
                    className={state.busy ? `${styles.status} ${styles.statusBusy}` : styles.status}
                  >
                    {state.busy ? 'Working…' : ''}
                  </div>
                  <div className={styles.result}>
                    {state.error ? <div className={styles.err}>{state.error}</div> : null}
                    {state.payload ? renderPayload(state.payload) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

function renderPayload(payload: NonNullable<CardResult['payload']>): ReactNode {
  if (payload.strategy === 'download' && payload.downloadInfo) {
    const { filename, size } = payload.downloadInfo;
    return (
      <div className={styles.note}>
        Saved <code>{filename}</code> · {formatSize(size)}
        <br />
        Drop this file back onto the viewer anytime to reopen.
      </div>
    );
  }
  if (payload.strategy === 'mermaid' && payload.downloadInfo) {
    const { filename, size } = payload.downloadInfo;
    return (
      <div className={styles.note}>
        Saved <code>{filename}</code> · {formatSize(size)}
        <br />
        Paste into{' '}
        <a href="https://mermaid.live" target="_blank" rel="noopener noreferrer">mermaid.live</a>,
        a Notion / GitHub fenced block, or drop back onto the viewer to reopen.
      </div>
    );
  }
  if (payload.strategy === 'embedded' && payload.result) {
    return (
      <LinkRow
        label={`URL · ${formatSize(payload.result.url.length)}`}
        value={payload.result.url}
        href={payload.result.url}
      />
    );
  }
  if (
    (payload.strategy === 'catbox' || payload.strategy === 'zerox') &&
    payload.result
  ) {
    const { url, rawUrl } = payload.result;
    return (
      <>
        <LinkRow label="Viewer URL" value={url} href={url} />
        {rawUrl ? <LinkRow label="Raw JSON" value={rawUrl} href={rawUrl} secondary /> : null}
      </>
    );
  }
  if (payload.strategy === 'encrypted' && payload.result && payload.password) {
    const { url, pngSize } = payload.result;
    return (
      <>
        <LinkRow label="Share URL" value={url} href={url} />
        <LinkRow label="Password" value={payload.password} />
        <div className={styles.note}>
          Encrypted PNG <code>{pngSize != null ? formatSize(pngSize) : '?'}</code> on catbox.moe.
          <br />
          Share URL and password <strong>separately</strong> for real security.
        </div>
      </>
    );
  }
  return null;
}

/** Local digit generator — mirrors share.js `randomDigits`. Avoid importing
 *  the share-encrypted module just for this when we only need 8 digits. */
function generateDigits(n: number): string {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  let out = '';
  for (let i = 0; i < n; i++) {
    const v = buf[i];
    out += ((v ?? 0) % 10).toString();
  }
  return out;
}
