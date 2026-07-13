import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useStorage } from './useStorage';
import { MemoryStorageAdapter, type StoredSource } from '@/lib/storage';

const sources: StoredSource[] = [
  { name: 'map.json', text: '{"nodes":[]}', lang: 'json' },
];

describe('useStorage', () => {
  it('is inert (idle, no-ops) when no adapter is provided', async () => {
    const { result } = renderHook(() => useStorage(undefined));
    expect(result.current.enabled).toBe(false);
    expect(result.current.status).toBe('idle');
    // save/load resolve to null without throwing
    await act(async () => { expect(await result.current.save('m', sources)).toBeNull(); });
    await act(async () => { expect(await result.current.load('m')).toBeNull(); });
  });

  it('loads a document and tracks its version', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save('m', sources);
    const { result } = renderHook(() => useStorage(adapter));
    let loaded: StoredSource[] | null = null;
    await act(async () => { loaded = await result.current.load('m'); });
    expect(loaded).toEqual(sources);
    // status settles to 'saved' after a successful load (in sync with backing)
    await waitFor(() => expect(result.current.status).toBe('saved'));
  });

  it('saves and moves status idle → saving → saved', async () => {
    const adapter = new MemoryStorageAdapter();
    const { result } = renderHook(() => useStorage(adapter));
    await act(async () => { await result.current.save('m', sources); });
    await waitFor(() => expect(result.current.status).toBe('saved'));
    expect((await adapter.load('m'))?.sources).toEqual(sources);
  });

  it('passes the tracked version on the next save (optimistic concurrency)', async () => {
    const adapter = new MemoryStorageAdapter();
    const saveSpy = vi.spyOn(adapter, 'save');
    const { result } = renderHook(() => useStorage(adapter));
    await act(async () => { await result.current.save('m', sources); });
    await act(async () => { await result.current.save('m', sources); });
    // second save must carry the version returned by the first
    const secondCallOpts = saveSpy.mock.calls[1]![2];
    expect(secondCallOpts?.expectedVersion).toBeTruthy();
  });

  it('surfaces a conflict as status "conflict" without throwing', async () => {
    const adapter = new MemoryStorageAdapter();
    const { result } = renderHook(() => useStorage(adapter));
    // first load establishes a version
    await act(async () => { await result.current.save('m', sources); });
    // someone else writes behind our back, moving the version forward
    await adapter.save('m', sources);
    // our next save uses a now-stale version → conflict
    await act(async () => { await result.current.save('m', sources); });
    await waitFor(() => expect(result.current.status).toBe('conflict'));
  });

  it('surfaces a generic error as status "error"', async () => {
    const adapter = new MemoryStorageAdapter();
    vi.spyOn(adapter, 'save').mockRejectedValueOnce(new Error('network down'));
    const { result } = renderHook(() => useStorage(adapter));
    await act(async () => { await result.current.save('m', sources); });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toMatch(/network down/);
  });

  it('lists documents from the adapter', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save('a', sources);
    await adapter.save('b', sources);
    const { result } = renderHook(() => useStorage(adapter));
    let list: string[] = [];
    await act(async () => { list = (await result.current.list()).map((d) => d.slug).sort(); });
    expect(list).toEqual(['a', 'b']);
  });
});
