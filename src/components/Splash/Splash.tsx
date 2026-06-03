// Splash — landing screen shown when no map is loaded.
//
// Ported from viewer.js `showSplash` (~line 1448) and the splash markup in
// index-legacy.html (~line 1232). The five "ways" cards are pure callbacks;
// the parent decides what each one does (load example, prompt URL, open the
// paste textarea, etc.). The "drag a file in →" card is non-interactive in
// the legacy too — the DnD overlay handles drops globally.
//
// The i18n strings include HTML markup (`<code>`, `<em>`, `<strong>`) so we
// render them via `dangerouslySetInnerHTML`. This matches the legacy chrome
// (which set `innerHTML = t(key)`). The dictionaries are app-controlled,
// not user content, so the surface is acceptable.

import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/contexts/I18nContext';

import styles from './Splash.module.css';

export interface SplashProps {
  onLoadExample: () => void;
  onLoadMultiLang: () => void;
  onLoadFromUrl: (url: string) => void;
  onLoadHashHint: () => void;
  pasteMode: boolean;
  onPaste: (text: string) => void;
  onCancelPaste: () => void;
  error: string | null;
}

interface Html {
  __html: string;
}

function html(s: string): Html {
  return { __html: s };
}

export default function Splash({
  onLoadExample,
  onLoadMultiLang,
  onLoadFromUrl,
  onLoadHashHint,
  pasteMode,
  onPaste,
  onCancelPaste,
  error,
}: SplashProps): JSX.Element {
  const { t } = useI18n();
  const [pasteText, setPasteText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Focus the textarea when paste mode is enabled — mirrors the
  // `paste-input.focus()` calls in viewer.js (~lines 1475, 1488).
  useEffect(() => {
    if (pasteMode) {
      textareaRef.current?.focus();
    }
  }, [pasteMode]);

  const handleUrlClick = (): void => {
    // Matches the `prompt(...)` in viewer.js (~line 1470). The parent decides
    // whether to navigate via `?src=…` or do something else.
    const url = window.prompt('Enter the JSON or YAML URL:');
    if (url) onLoadFromUrl(url);
  };

  return (
    <div className={styles.splash}>
      <div className={styles.inner}>
        <h1 className={styles.title} dangerouslySetInnerHTML={html(t('splash.title'))} />
        <div className={styles.sub} dangerouslySetInnerHTML={html(t('splash.eyebrow'))} />
        <p className={styles.lead} dangerouslySetInnerHTML={html(t('splash.lead'))} />

        <div className={styles.ways}>
          <button type="button" className={styles.way} onClick={onLoadExample}>
            <h3 dangerouslySetInnerHTML={html(t('splash.example.h'))} />
            <p dangerouslySetInnerHTML={html(t('splash.example.p'))} />
          </button>
          <button type="button" className={styles.way} onClick={onLoadMultiLang}>
            <h3 dangerouslySetInnerHTML={html(t('splash.exampleMl.h'))} />
            <p dangerouslySetInnerHTML={html(t('splash.exampleMl.p'))} />
          </button>
          <button type="button" className={styles.way} onClick={handleUrlClick}>
            <h3 dangerouslySetInnerHTML={html(t('splash.url.h'))} />
            <p dangerouslySetInnerHTML={html(t('splash.url.p'))} />
          </button>
          <button type="button" className={styles.way} onClick={onLoadHashHint}>
            <h3 dangerouslySetInnerHTML={html(t('splash.hash.h'))} />
            <p dangerouslySetInnerHTML={html(t('splash.hash.p'))} />
          </button>
          <div
            className={`${styles.way} ${styles.wayInert}`}
            role="note"
            aria-label="Drag-and-drop hint"
          >
            <h3 dangerouslySetInnerHTML={html(t('splash.dnd.h'))} />
            <p dangerouslySetInnerHTML={html(t('splash.dnd.p'))} />
          </div>
        </div>

        {pasteMode ? (
          <div className={styles.pasteArea}>
            <h3 className={styles.pasteHeading} dangerouslySetInnerHTML={html(t('splash.paste.h'))} />
            <textarea
              ref={textareaRef}
              className={styles.textarea}
              placeholder='{ "lanes": [...], "phases": [...], "nodes": [...], "edges": [...] }'
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.button} ${styles.buttonPrimary}`}
                onClick={() => onPaste(pasteText)}
                dangerouslySetInnerHTML={html(t('splash.paste.render'))}
              />
              <button
                type="button"
                className={styles.button}
                onClick={() => {
                  setPasteText('');
                  onCancelPaste();
                }}
                dangerouslySetInnerHTML={html(t('splash.paste.cancel'))}
              />
            </div>
          </div>
        ) : null}

        {error ? <div className={styles.err}>{error}</div> : null}

        <div className={styles.footer}>
          <a href="./docs/" dangerouslySetInnerHTML={html(t('splash.footer.docs'))} /> &nbsp;·&nbsp;
          <a
            href="https://github.com/zalkowitsch/lifecycle-map"
            target="_blank"
            rel="noopener noreferrer"
            dangerouslySetInnerHTML={html(t('splash.footer.github'))}
          />{' '}
          &nbsp;·&nbsp;
          <span dangerouslySetInnerHTML={html(t('splash.footer.license'))} />
        </div>
      </div>
    </div>
  );
}
