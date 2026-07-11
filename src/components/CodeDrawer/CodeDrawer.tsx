// CodeDrawer — raw source viewer + editor with per-tab undo/redo.
//
// Ported from viewer.js `openCodeDrawer`, `renderCodeTabs`, `tryApplyEdit`,
// `codeUndo`, `codeRedo` (~line 800–995). Differences from the legacy build:
//   - `<textarea>` instead of `contenteditable` (much simpler, same behavior
//     for our purposes).
//   - Undo/redo lives in component state, scoped per tab (not on the DOM).
//   - Parent owns the source list; we surface accepted edits via `onEdit`.
//
// Debounce: 600ms after the last keystroke we parse the buffer; on success
// we push the previous text onto the undo stack and call `onEdit`. On
// failure we show the parse error and keep the previous text live in the
// upstream `sources` array (the textarea still shows whatever the user
// typed — error state communicates that nothing was applied).

import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import yaml from 'js-yaml';

import { useI18n } from '@/contexts/I18nContext';
import { zipStore } from '@/lib/database/zip';
import { parseSource } from '@/lib/parseSource';

import styles from './CodeDrawer.module.css';

export interface CodeSource {
  name: string;
  text: string;
  lang: 'json' | 'yaml';
}

export interface CodeDrawerProps {
  open: boolean;
  onClose: () => void;
  sources: CodeSource[];
  /** Called when the user's edit parses cleanly. The parent owns the source
   *  array; we only forward the new text + tab index. */
  onEdit: (idx: number, newText: string) => void;
}

type Status = 'idle' | 'saved' | 'editing' | 'error';

const PARSE_DEBOUNCE_MS = 600;
const UNDO_LIMIT = 50;

export function CodeDrawer(props: CodeDrawerProps): JSX.Element {
  const { open, onClose, sources, onEdit } = props;
  const { t } = useI18n();

  // Tab selection. Clamp when the source list shrinks.
  const [activeTab, setActiveTab] = useState(0);
  useEffect(() => {
    if (activeTab >= sources.length) setActiveTab(0);
  }, [sources.length, activeTab]);

  // Local buffer = what's currently in the textarea per tab. Mirrors
  // `sources[i].text` until the user types; then diverges until parse
  // succeeds (or undo/redo).
  const [buffers, setBuffers] = useState<string[]>(() => sources.map((s) => s.text));
  // Keep local buffer in sync when the upstream source text changes for
  // reasons OTHER than the user typing (e.g. parent loaded a new map).
  useEffect(() => {
    setBuffers((prev) => {
      // Only update entries that have changed upstream AND aren't currently
      // being edited (heuristic: if buffer === prev source text, accept the
      // new upstream value). Since we don't track the previous source text
      // here, we simply align by length and only overwrite when shape
      // changes — caller is expected to re-mount this drawer when reloading.
      if (prev.length !== sources.length) return sources.map((s) => s.text);
      return prev;
    });
  }, [sources]);

  // Per-tab undo/redo stacks of prior accepted text values.
  const undoStacks = useRef<string[][]>([]);
  const redoStacks = useRef<string[][]>([]);
  if (undoStacks.current.length !== sources.length) {
    undoStacks.current = sources.map(() => []);
    redoStacks.current = sources.map(() => []);
  }

  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Debounce handle.
  const debounceRef = useRef<number | null>(null);
  useEffect(() => () => {
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
  }, []);

  // Reset transient UI state when a new tab is selected.
  useEffect(() => {
    setStatus('saved');
    setErrorMsg(null);
  }, [activeTab]);

  // Escape closes.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const activeSource = sources[activeTab];
  const activeBuffer = buffers[activeTab] ?? activeSource?.text ?? '';

  const tryCommit = useCallback((idx: number, newText: string): void => {
    const src = sources[idx];
    if (!src) return;
    const prev = src.text;
    if (newText === prev) {
      setStatus('saved');
      setErrorMsg(null);
      return;
    }
    try {
      const parsed = parseSource(newText);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Top-level must be an object.');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setErrorMsg(msg);
      setStatus('error');
      return;
    }
    // Push prev onto undo, clear redo, cap stack length.
    const stack = undoStacks.current[idx] ?? [];
    stack.push(prev);
    if (stack.length > UNDO_LIMIT) stack.shift();
    undoStacks.current[idx] = stack;
    redoStacks.current[idx] = [];
    setErrorMsg(null);
    setStatus('saved');
    onEdit(idx, newText);
  }, [sources, onEdit]);

  const onChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>): void => {
    const idx = activeTab;
    const newText = e.target.value;
    setBuffers((prev) => {
      const next = prev.slice();
      next[idx] = newText;
      return next;
    });
    setStatus('editing');
    if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => {
      tryCommit(idx, newText);
    }, PARSE_DEBOUNCE_MS);
  }, [activeTab, tryCommit]);

  const undo = useCallback((): void => {
    const idx = activeTab;
    const stack = undoStacks.current[idx];
    const src = sources[idx];
    if (!src || !stack || stack.length === 0) return;
    const prev = stack.pop();
    if (prev === undefined) return;
    (redoStacks.current[idx] ??= []).push(src.text);
    setBuffers((prevBufs) => {
      const next = prevBufs.slice();
      next[idx] = prev;
      return next;
    });
    setErrorMsg(null);
    setStatus('saved');
    onEdit(idx, prev);
  }, [activeTab, sources, onEdit]);

  const redo = useCallback((): void => {
    const idx = activeTab;
    const stack = redoStacks.current[idx];
    const src = sources[idx];
    if (!src || !stack || stack.length === 0) return;
    const next = stack.pop();
    if (next === undefined) return;
    (undoStacks.current[idx] ??= []).push(src.text);
    setBuffers((prevBufs) => {
      const out = prevBufs.slice();
      out[idx] = next;
      return out;
    });
    setErrorMsg(null);
    setStatus('saved');
    onEdit(idx, next);
  }, [activeTab, sources, onEdit]);

  const canUndo = (undoStacks.current[activeTab]?.length ?? 0) > 0;
  const canRedo = (redoStacks.current[activeTab]?.length ?? 0) > 0;

  // Live "lines · KB" readout for the active tab.
  const meta = useMemo(() => {
    if (!activeSource) return '';
    const lines = activeBuffer.split('\n').length;
    const kb = (activeBuffer.length / 1024).toFixed(1);
    return `${lines} lines · ${kb} KB`;
  }, [activeBuffer, activeSource]);

  // Copy/download act on the LIVE buffer (matches the legacy behavior for
  // download; legacy copy reads `src.text` — we use the buffer so what the
  // user sees is what they copy).
  const onCopy = useCallback(async (): Promise<void> => {
    if (!activeSource) return;
    try {
      await navigator.clipboard.writeText(activeBuffer);
    } catch {
      // clipboard may throw in non-secure contexts; swallow.
    }
  }, [activeBuffer, activeSource]);

  const onDownload = useCallback((): void => {
    if (!activeSource) return;
    const type = activeSource.lang === 'yaml' ? 'application/x-yaml' : 'application/json';
    const blob = new Blob([activeBuffer], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeSource.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [activeBuffer, activeSource]);

  const onDownloadAll = useCallback((): void => {
    if (sources.length <= 1) { onDownload(); return; }
    const bytes = zipStore(sources.map((s, i) => ({ name: s.name, text: buffers[i] ?? s.text })));
    const blob = new Blob([bytes.slice()], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'map-bundle.zip';
    document.body.appendChild(a); a.click(); a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [sources, buffers, onDownload]);

  // Pretty-print the active buffer in place. Pushes the prior text onto the
  // tab's undo stack (so Undo can revert the reformat) and routes through
  // `onEdit` like any other accepted edit. No-ops (with an error status) on
  // invalid JSON/YAML — the buffer is left untouched.
  const onFormat = useCallback((): void => {
    if (!activeSource) return;
    try {
      const pretty = activeSource.lang === 'yaml'
        ? yaml.dump(yaml.load(activeBuffer))
        : JSON.stringify(JSON.parse(activeBuffer), null, 2);
      // Cancel any pending debounced commit: it captured the PRE-format text in
      // its closure and would fire `tryCommit(activeTab, preFormatText)` after
      // this, re-committing the minified text and undoing the format.
      if (debounceRef.current !== null) window.clearTimeout(debounceRef.current);
      // Push the current buffer onto this tab's undo stack (so Undo reverts the
      // reformat), matching tryCommit's discipline: cap at UNDO_LIMIT and clear
      // the redo stack (Format is a new edit, so any redo branch is stale).
      const stack = undoStacks.current[activeTab] ?? [];
      stack.push(activeBuffer);
      if (stack.length > UNDO_LIMIT) stack.shift();
      undoStacks.current[activeTab] = stack;
      redoStacks.current[activeTab] = [];
      setBuffers((prev) => prev.map((b, i) => (i === activeTab ? pretty : b)));
      // Reuse the debounced parse→onEdit path by simulating a change:
      onEdit(activeTab, pretty);
      setStatus('saved');
    } catch {
      setStatus('error');
      setErrorMsg('Cannot format: invalid ' + (activeSource.lang === 'yaml' ? 'YAML' : 'JSON'));
    }
  }, [activeBuffer, activeSource, activeTab, onEdit]);

  const drawerCls = open ? `${styles.drawer} ${styles.open}` : styles.drawer;

  const statusLabel = status === 'saved'
    ? `✓ ${t('code.status.saved')}`
    : status === 'editing'
      ? `… ${t('code.status.editing')}`
      : status === 'error'
        ? `⚠ ${t('code.status.error')}`
        : '';
  const statusCls = status === 'idle' ? styles.status : `${styles.status} ${styles[status]}`;

  // textarea typing-only attrs (avoid spellcheck/autocomplete noise).
  const taProps = {
    spellCheck: false,
    autoCorrect: 'off',
    autoCapitalize: 'off',
    autoComplete: 'off',
  } as const;

  return (
    <aside
      className={drawerCls}
      aria-hidden={open ? 'false' : 'true'}
      role="complementary"
    >
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <div className={styles.header}>
        <div className={styles.eyebrow}>{t('code.eyebrow')}</div>
        <h2
          className={styles.title}
          dangerouslySetInnerHTML={{ __html: t('code.title') }}
        />
      </div>

      <div className={styles.tabs} role="tablist">
        {sources.map((s, i) => {
          const cls = i === activeTab ? `${styles.tab} ${styles.active}` : styles.tab;
          return (
            <button
              key={`${s.name}-${i}`}
              type="button"
              className={cls}
              role="tab"
              aria-selected={i === activeTab}
              onClick={() => setActiveTab(i)}
            >
              {s.name}
              <span className={styles.langChip}>{s.lang}</span>
            </button>
          );
        })}
      </div>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={undo}
          disabled={!canUndo}
          title={t('code.undo')}
        >
          {t('code.undo')}
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={redo}
          disabled={!canRedo}
          title={t('code.redo')}
        >
          {t('code.redo')}
        </button>
        <span className={styles.toolbarSep} aria-hidden="true" />
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onFormat}
          disabled={!activeSource}
          title="Format"
        >
          Format
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={onCopy}
          disabled={!activeSource}
        >
          {t('code.copy')}
        </button>
        <button
          type="button"
          className={styles.actionBtn}
          onClick={sources.length > 1 ? onDownloadAll : onDownload}
          disabled={!activeSource}
        >
          {sources.length > 1 ? 'Download all' : t('code.download')}
        </button>
        <span className={statusCls}>{statusLabel}</span>
        <span className={styles.meta}>{meta}</span>
      </div>

      <div className={styles.body}>
        <textarea
          className={styles.editor}
          value={activeBuffer}
          onChange={onChange}
          placeholder={activeSource ? undefined : t('code.empty')}
          style={EDITOR_STYLE}
          {...taProps}
        />
        {errorMsg ? <div className={styles.error}>{errorMsg}</div> : null}
      </div>
    </aside>
  );
}

const EDITOR_STYLE: CSSProperties = {
  // textareas don't honor `white-space: pre` from CSS in every browser the
  // same way; explicit wrap=off keeps long lines from soft-wrapping.
};

export default CodeDrawer;
