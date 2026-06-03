import { useEffect, useState } from 'react';

export function App() {
  // Apply persisted theme + mode early so the page doesn't flash light → dark
  useEffect(() => {
    const html = document.documentElement;
    const theme = localStorage.getItem('lifecycle-map.theme') || 'paper';
    const mode = localStorage.getItem('lifecycle-map.mode')
      || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    html.dataset.theme = theme;
    html.dataset.mode = mode;
  }, []);

  const [tick] = useState(Date.now());

  return (
    <div className="app-shell">
      <header className="dev-header">
        <strong>lifecycle-map</strong> · React + TS migration
        <span className="dev-meta">build {new Date(tick).toISOString().slice(0, 16)}</span>
      </header>
      <main className="dev-main">
        <p className="dev-notice">
          This branch is being ported to React + TypeScript. Vite dev server is up.
          Feature parity coming back online module by module.
        </p>
      </main>
    </div>
  );
}
