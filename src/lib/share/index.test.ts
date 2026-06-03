// Tests for src/lib/share/index.ts
//
// Covers makeViewerBaseUrl path-stripping behavior under various
// window.location.pathname shapes.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { makeViewerBaseUrl } from '@/lib/share';

type LocationLike = { origin: string; pathname: string };

function setLocation(loc: LocationLike): void {
  Object.defineProperty(window, 'location', {
    value: loc,
    writable: true,
    configurable: true,
  });
}

describe('makeViewerBaseUrl', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  it('always returns a URL terminated in "/"', () => {
    setLocation({ origin: 'https://x.com', pathname: '/lifecycle-map/index.html' });
    const url = makeViewerBaseUrl();
    expect(url.endsWith('/')).toBe(true);
  });

  it('strips trailing index.html and keeps the directory', () => {
    setLocation({ origin: 'https://x.com', pathname: '/lifecycle-map/index.html' });
    expect(makeViewerBaseUrl()).toBe('https://x.com/lifecycle-map/');
  });

  it('strips a top-level file segment to "/"', () => {
    setLocation({ origin: 'https://x.com', pathname: '/foo.html' });
    expect(makeViewerBaseUrl()).toBe('https://x.com/');
  });

  it('leaves a directory-only path unchanged (still trims+adds trailing /)', () => {
    // Regex /\/[^/]*$/ matches the final "/" too when nothing follows it,
    // so '/lifecycle-map/' stays '/lifecycle-map/'.
    setLocation({ origin: 'https://x.com', pathname: '/lifecycle-map/' });
    expect(makeViewerBaseUrl()).toBe('https://x.com/lifecycle-map/');
  });

  it('handles nested paths with a trailing file segment', () => {
    setLocation({ origin: 'https://example.org', pathname: '/a/b/c/viewer.html' });
    expect(makeViewerBaseUrl()).toBe('https://example.org/a/b/c/');
  });

  it('handles bare origin (pathname = "/")', () => {
    setLocation({ origin: 'https://x.com', pathname: '/' });
    expect(makeViewerBaseUrl()).toBe('https://x.com/');
  });
});
