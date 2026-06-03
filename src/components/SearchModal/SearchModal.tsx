// SearchModal — Cmd+K search overlay over the loaded map's nodes.
//
// Ported from viewer.js `initSearch` / `runSearch` / `highlightMatch`
// (~lines 645-770). Match logic is unchanged: case-insensitive substring
// against id + title + sub + objective + lane.label + phase.label, capped
// at 50 results. Keyboard: ↑/↓ navigate, Enter selects, Esc closes; the
// input is auto-focused when the modal opens.
//
// NOTE: opening on Cmd+K is wired by the parent (header/global shortcut),
// not here — this component only reacts to `open` and emits `onClose`.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useI18n } from '@/contexts/I18nContext';
import type { NormalizedMap } from '@/types/lifecycle-map';

import styles from './SearchModal.module.css';

export interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  data: NormalizedMap | null;
  L: (v: unknown) => string;
  onSelect: (nodeId: string) => void;
}

interface SearchResult {
  id: string;
  title: string;
  sub: string;
  objective: string;
  laneLabel: string;
  phaseLabel: string;
}

const MAX_RESULTS = 50;

function buildIndex(data: NormalizedMap, L: (v: unknown) => string): SearchResult[] {
  const laneById = new Map(data.lanes.map((l) => [l.id, L(l.label)]));
  const phaseById = new Map(data.phases.map((p) => [p.id, L(p.label)]));
  return data.nodes.map((n) => ({
    id: n.id,
    title: L(n.title) || n.id,
    sub: L(n.sub) || '',
    objective: L(n.objective) || '',
    laneLabel: laneById.get(n.lane) ?? '',
    phaseLabel: phaseById.get(n.phase) ?? '',
  }));
}

function filterResults(index: SearchResult[], q: string): SearchResult[] {
  if (!q) return index.slice(0, MAX_RESULTS);
  const needle = q.toLowerCase();
  const out: SearchResult[] = [];
  for (const n of index) {
    const hay = (
      n.id +
      ' ' +
      n.title +
      ' ' +
      n.sub +
      ' ' +
      n.objective +
      ' ' +
      n.laneLabel +
      ' ' +
      n.phaseLabel
    ).toLowerCase();
    if (hay.includes(needle)) {
      out.push(n);
      if (out.length >= MAX_RESULTS) break;
    }
  }
  return out;
}

/** Wraps the matched substring in <mark>. */
function highlight(text: string, q: string): ReactNode {
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark>{match}</mark>
      {after}
    </>
  );
}

export default function SearchModal({
  open,
  onClose,
  data,
  L,
  onSelect,
}: SearchModalProps): JSX.Element {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const activeRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  // Rebuild index whenever data or L (data-lang) changes.
  const index = useMemo(() => (data ? buildIndex(data, L) : []), [data, L]);
  const results = useMemo(() => filterResults(index, query), [index, query]);

  // Reset query + selection on open.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIdx(0);
    }
  }, [open]);

  // Auto-focus input on open. Microtask delay matches the legacy setTimeout(0)
  // — keeps focus working when the modal appears on the same tick as a key
  // event that triggered it.
  useEffect(() => {
    if (open) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  // Clamp active index when results change.
  useEffect(() => {
    setActiveIdx((prev) => {
      if (results.length === 0) return 0;
      if (prev >= results.length) return results.length - 1;
      return prev;
    });
  }, [results]);

  // Keep the active row scrolled into view.
  useLayoutEffect(() => {
    if (!open) return;
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  // Keyboard nav.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIdx((i) => (results.length ? Math.min(i + 1, results.length - 1) : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIdx((i) => (results.length ? Math.max(i - 1, 0) : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const hit = results[activeIdx];
        if (hit) {
          onSelect(hit.id);
          onClose();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose, onSelect, results, activeIdx]);

  const pickResult = useCallback(
    (id: string) => {
      onSelect(id);
      onClose();
    },
    [onSelect, onClose],
  );

  const modalClass = open ? `${styles.modal} ${styles.open}` : styles.modal;

  return (
    <div
      className={modalClass}
      role="dialog"
      aria-modal="true"
      aria-label="Search nodes"
      aria-hidden={open ? 'false' : 'true'}
    >
      <div className={styles.scrim} onClick={onClose} aria-hidden="true" />
      <div className={styles.panel}>
        <div className={styles.inputWrap}>
          <svg
            className={styles.icon}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11 L14 14" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder={t('search.placeholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            role="combobox"
            aria-expanded={open}
            aria-controls="search-results-list"
            aria-activedescendant={results[activeIdx] ? `search-result-${activeIdx}` : undefined}
          />
          <span className={styles.hint}>ESC</span>
        </div>
        <div
          className={styles.results}
          id="search-results-list"
          role="listbox"
          aria-label="Search results"
        >
          {results.length === 0 ? (
            <div className={styles.empty}>{t('search.empty')}</div>
          ) : (
            results.map((r, i) => {
              const cls =
                i === activeIdx ? `${styles.result} ${styles.resultActive}` : styles.result;
              return (
                <div
                  key={r.id}
                  id={`search-result-${i}`}
                  ref={i === activeIdx ? activeRef : null}
                  className={cls}
                  role="option"
                  aria-selected={i === activeIdx}
                  onMouseEnter={() => setActiveIdx(i)}
                  onClick={() => pickResult(r.id)}
                >
                  <div className={styles.resultTitle}>{highlight(r.title, query)}</div>
                  <div className={styles.resultMeta}>
                    <span className={styles.idChip}>{r.id}</span>
                    {r.laneLabel ? <> · {r.laneLabel}</> : null}
                    {r.phaseLabel ? <> · {r.phaseLabel}</> : null}
                    {r.sub ? <> · {highlight(r.sub, query)}</> : null}
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div className={styles.foot}>
          <span>
            <kbd>↑</kbd> <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
