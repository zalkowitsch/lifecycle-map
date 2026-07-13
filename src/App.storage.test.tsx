import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { MemoryStorageAdapter } from '@/lib/storage';

// A minimal valid map, stored under a slug in a MemoryStorageAdapter. The App
// is given `?doc=<slug>` so it auto-loads that document from storage on mount.
const MAP = {
  meta: { title: { en: 'Stored Map' } },
  lanes: [{ id: 'user', label: { en: 'User' } }],
  phases: [{ id: 'p1', label: { en: 'Phase 1' } }],
  nodes: [{ id: 'n1', lane: 'user', phase: 'p1', title: { en: 'Node 1' }, type: 'step', context: {} }],
  edges: [],
};

function setDocParam(slug: string): void {
  window.history.replaceState(null, '', `${window.location.pathname}?doc=${slug}`);
}

afterEach(() => {
  window.history.replaceState(null, '', window.location.pathname);
  window.location.hash = '';
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('App + storage adapter', () => {
  it('auto-loads a document from the adapter when ?doc=<slug> is present', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save('my-doc', [{ name: 'my-doc.json', text: JSON.stringify(MAP), lang: 'json' }]);
    setDocParam('my-doc');

    render(<App storage={adapter} />);

    // The map renders → the Database button appears in the header.
    expect(await screen.findByRole('button', { name: /database/i }, { timeout: 5000 })).toBeInTheDocument();
  });

  it('loading a document does not itself trigger a save', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save('my-doc', [{ name: 'my-doc.json', text: JSON.stringify(MAP), lang: 'json' }]);
    const saveSpy = vi.spyOn(adapter, 'save');
    setDocParam('my-doc');

    render(<App storage={adapter} />);
    await screen.findByRole('button', { name: /database/i }, { timeout: 5000 });

    // The autosave baseline is the freshly-loaded content, so a plain load must
    // NOT write back (that would be a pointless save loop).
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('autosaves an edit back to the adapter under the loaded slug (debounced)', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save('my-doc', [{ name: 'my-doc.json', text: JSON.stringify(MAP), lang: 'json' }]);
    const saveSpy = vi.spyOn(adapter, 'save');
    setDocParam('my-doc');

    const user = userEvent.setup();
    render(<App storage={adapter} />);
    await screen.findByRole('button', { name: /database/i }, { timeout: 5000 });

    // Open the Code drawer and edit the map's source text.
    await user.click(screen.getByRole('button', { name: /view source/i }));
    const textarea = await screen.findByRole('textbox', undefined, { timeout: 5000 }) as HTMLTextAreaElement;

    const edited = { ...MAP, meta: { title: { en: 'Edited Title' } } };
    // Replace the buffer with a valid edited map. The drawer debounces its
    // parse→commit (~600ms); the App then debounces autosave (~800ms).
    await user.clear(textarea);
    await user.paste(JSON.stringify(edited));

    // Wait for the edit to reach the adapter as a save under the same slug.
    await waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    }, { timeout: 5000 });
    expect(saveSpy.mock.calls[0]![0]).toBe('my-doc');

    // And the stored document reflects the edit.
    await waitFor(async () => {
      const doc = await adapter.load('my-doc');
      expect(doc?.sources[0]?.text).toContain('Edited Title');
    }, { timeout: 5000 });
  });

  it('a failed autosave does not drop the edit — a later edit re-sends it', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save('my-doc', [{ name: 'my-doc.json', text: JSON.stringify(MAP), lang: 'json' }]);
    // First autosave fails (transient error); subsequent saves succeed.
    const saveSpy = vi.spyOn(adapter, 'save');
    const realSave = MemoryStorageAdapter.prototype.save;
    saveSpy.mockRejectedValueOnce(new Error('network down'));
    saveSpy.mockImplementation(function (this: MemoryStorageAdapter, ...args) {
      return realSave.apply(this, args);
    });
    setDocParam('my-doc');

    const user = userEvent.setup();
    render(<App storage={adapter} />);
    await screen.findByRole('button', { name: /database/i }, { timeout: 5000 });
    await user.click(screen.getByRole('button', { name: /view source/i }));
    const textarea = await screen.findByRole('textbox', undefined, { timeout: 5000 }) as HTMLTextAreaElement;

    // Edit #1 → autosave fires but the adapter rejects it.
    await user.clear(textarea);
    await user.paste(JSON.stringify({ ...MAP, meta: { title: { en: 'First Edit' } } }));
    await waitFor(() => expect(saveSpy).toHaveBeenCalledTimes(1), { timeout: 5000 });

    // The store must still hold the ORIGINAL (the failed save didn't persist).
    expect((await adapter.load('my-doc'))?.sources[0]?.text).toContain('Stored Map');

    // Edit #2 → the baseline never advanced past the failed edit, so this save
    // carries the latest content and persists it. The edit was not silently lost.
    await user.clear(textarea);
    await user.paste(JSON.stringify({ ...MAP, meta: { title: { en: 'Second Edit' } } }));
    await waitFor(async () => {
      const doc = await adapter.load('my-doc');
      expect(doc?.sources[0]?.text).toContain('Second Edit');
    }, { timeout: 5000 });
  });

  it('shows a save-status indicator when storage is enabled', async () => {
    const adapter = new MemoryStorageAdapter();
    await adapter.save('my-doc', [{ name: 'my-doc.json', text: JSON.stringify(MAP), lang: 'json' }]);
    setDocParam('my-doc');
    render(<App storage={adapter} />);
    // After the initial load, useStorage settles to 'saved' → a status role appears.
    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    }, { timeout: 5000 });
  });
});
