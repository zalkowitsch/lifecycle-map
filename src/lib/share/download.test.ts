// Tests for src/lib/share/download.ts
//
// Covers the synthetic-anchor download flow: createObjectURL is called,
// a hidden <a> is appended, clicked, and removed, and revokeObjectURL is
// scheduled for cleanup.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadJson } from '@/lib/share/download';

describe('downloadJson', () => {
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;

  beforeEach(() => {
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    createObjectURL = vi.fn(() => 'blob:test-url');
    revokeObjectURL = vi.fn();
    URL.createObjectURL = createObjectURL as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as unknown as typeof URL.revokeObjectURL;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
  });

  it('calls URL.createObjectURL with a Blob', () => {
    downloadJson('{"x":1}', 'name.json');
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const arg = createObjectURL.mock.calls[0]![0] as Blob;
    expect(arg).toBeInstanceOf(Blob);
    expect(arg.type).toBe('application/json');
  });

  it('creates an anchor, sets href/download, clicks it, then removes it', () => {
    const clickSpy = vi.fn();
    const fakeAnchor: Partial<HTMLAnchorElement> & { click: () => void; remove: () => void } = {
      href: '',
      download: '',
      click: clickSpy,
      remove: vi.fn(),
    };
    const createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tag: string) => {
        if (tag === 'a') return fakeAnchor as unknown as HTMLAnchorElement;
        return document.createElement.call(document, tag) as HTMLElement;
      });
    const appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockImplementation(((n: Node) => n) as typeof document.body.appendChild);

    downloadJson('hello', 'report.json');

    expect(createElementSpy).toHaveBeenCalledWith('a');
    expect(fakeAnchor.href).toBe('blob:test-url');
    expect(fakeAnchor.download).toBe('report.json');
    expect(appendChildSpy).toHaveBeenCalledWith(fakeAnchor);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(fakeAnchor.remove).toHaveBeenCalledTimes(1);
  });

  it('schedules URL.revokeObjectURL after ~1s', () => {
    downloadJson('payload', 'file.json');
    expect(revokeObjectURL).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });
});
