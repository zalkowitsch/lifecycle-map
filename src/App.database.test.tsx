import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '@/App';
import { encodeHashData } from '@/lib/parseSource';

// A minimal but valid LifecycleMap, injected via the #data= hash codec so the
// test never touches `fetch` (loading a named example fetches ./examples/*.json,
// which is flaky under jsdom). #data= is decoded synchronously from the URL
// fragment (base64url + gzip, see src/lib/parseSource.ts) — same production
// code path used by real share links, no network involved.
const MINIMAL_MAP = {
  meta: { title: { en: 'Test Map' } },
  lanes: [{ id: 'user', label: { en: 'User' } }],
  phases: [{ id: 'p1', label: { en: 'Phase 1' } }],
  nodes: [
    { id: 'n1', lane: 'user', phase: 'p1', title: { en: 'Node 1' }, type: 'step', context: {} },
  ],
  edges: [],
};

async function renderWithData() {
  const blob = await encodeHashData(JSON.stringify(MINIMAL_MAP));
  window.location.hash = '#data=' + blob;
  render(<App />);
  return screen.findByRole('button', { name: /database/i }, { timeout: 5000 });
}

describe('App — Database button', () => {
  it('renders a Database toggle button in the header when a map is loaded', async () => {
    const btn = await renderWithData();
    expect(btn).toBeInTheDocument();
  });

  it('opens the Database panel when clicked', async () => {
    const btn = await renderWithData();
    await userEvent.click(btn);
    const dialog = await screen.findByRole('dialog', { name: /database editor/i }, { timeout: 5000 });
    expect(dialog).toBeInTheDocument();
  });
});
