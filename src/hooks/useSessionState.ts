// useSessionState — sessionStorage-backed scratchpad that survives a reload
// (e.g. the version-update badge's hard refresh) but dies with the tab.
//
// We only stash raw JSON for memory-only sources (drag-and-drop, paste) since
// URL-based sources (`?src=`, `#data=`, slug, `#img=`) can rehydrate from the
// URL itself. Anything older than the TTL is dropped on read.
//
// Ported from viewer.js (~lines 546-578... actually ~1167-1197 in the file —
// the SS_KEY block).

import { useCallback, useRef } from 'react';

export type SessionSource = 'dnd' | 'paste' | 'url' | 'hash' | 'slug' | 'img';

export interface SessionState {
  source: SessionSource;
  slug?: string;
  rawJson?: string;
  activeNodeId?: string | null;
  scrollLeft?: number;
  scrollTop?: number;
}

interface StoredSessionState extends SessionState {
  ts: number;
}

const SS_KEY = 'lifecycle-map.session';
const SS_TTL_MS = 24 * 60 * 60 * 1000; // 24h

function isSessionSource(value: unknown): value is SessionSource {
  return (
    value === 'dnd'
    || value === 'paste'
    || value === 'url'
    || value === 'hash'
    || value === 'slug'
    || value === 'img'
  );
}

function readRaw(): StoredSessionState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(SS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    const obj = parsed as Record<string, unknown>;
    const ts = obj['ts'];
    if (typeof ts !== 'number' || Date.now() - ts > SS_TTL_MS) {
      window.sessionStorage.removeItem(SS_KEY);
      return null;
    }
    const source = obj['source'];
    if (!isSessionSource(source)) return null;
    // Build the typed result explicitly so noUncheckedIndexedAccess is happy.
    const result: StoredSessionState = { source, ts };
    if (typeof obj['slug'] === 'string') result.slug = obj['slug'];
    if (typeof obj['rawJson'] === 'string') result.rawJson = obj['rawJson'];
    if (obj['activeNodeId'] === null || typeof obj['activeNodeId'] === 'string') {
      result.activeNodeId = obj['activeNodeId'];
    }
    if (typeof obj['scrollLeft'] === 'number') result.scrollLeft = obj['scrollLeft'];
    if (typeof obj['scrollTop'] === 'number') result.scrollTop = obj['scrollTop'];
    return result;
  } catch {
    return null;
  }
}

interface UseSessionStateResult {
  state: SessionState | null;
  save: (patch: Partial<SessionState>) => void;
  clear: () => void;
  load: () => SessionState | null;
}

export function useSessionState(): UseSessionStateResult {
  // We don't trigger React renders on save — callers tend to read on mount and
  // then drive the rest from their own state. `stateRef` keeps the latest
  // snapshot available without round-tripping through sessionStorage.
  const stateRef = useRef<SessionState | null>(readRaw());

  const load = useCallback((): SessionState | null => {
    const raw = readRaw();
    stateRef.current = raw;
    return raw;
  }, []);

  const save = useCallback((patch: Partial<SessionState>) => {
    if (typeof window === 'undefined') return;
    try {
      const prev = readRaw();
      // We only persist `source` from the patch or prev. If neither has one
      // (first-ever save with no source), we cannot persist — bail out, since
      // SessionState mandates `source`.
      const source = patch.source ?? prev?.source;
      if (!isSessionSource(source)) return;
      const next: StoredSessionState = {
        ...(prev ?? {}),
        ...patch,
        source,
        ts: Date.now(),
      };
      window.sessionStorage.setItem(SS_KEY, JSON.stringify(next));
      stateRef.current = next;
    } catch {
      // sessionStorage write can throw on quota or privacy mode — ignore.
    }
  }, []);

  const clear = useCallback(() => {
    stateRef.current = null;
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(SS_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { state: stateRef.current, save, clear, load };
}
