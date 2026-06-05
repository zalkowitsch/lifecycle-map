// DragDropOverlay — fullscreen drop target for JSON/YAML files.
//
// Ported from viewer.js `initDragAndDrop` (~line 1059). We track `dragenter`
// vs `dragleave` with a depth counter because browsers fire those events for
// every nested element the cursor crosses; counting up/down avoids flicker.
//
// Only files trigger the overlay (we sniff `dataTransfer.types` for 'Files').
// On drop, we hand all dropped files to the parent and let it parse + load
// (a map may be dropped together with a separate module/rubric catalog).

import { useEffect, useRef, useState } from 'react';

import { useI18n } from '@/contexts/I18nContext';

import styles from './DragDropOverlay.module.css';

export interface DragDropOverlayProps {
  onDrop: (files: File[]) => void;
}

function isFileDrag(e: DragEvent): boolean {
  const types = e.dataTransfer?.types;
  if (!types) return false;
  for (let i = 0; i < types.length; i++) {
    const v = types[i];
    if (v === 'Files' || v === 'application/x-moz-file') return true;
  }
  return false;
}

export default function DragDropOverlay({ onDrop }: DragDropOverlayProps): JSX.Element {
  const { t } = useI18n();
  const [active, setActive] = useState(false);
  // Mirrors `depth` in the legacy: increments on dragenter, decrements on
  // dragleave. We use a ref so handlers stay stable across renders.
  const depthRef = useRef(0);

  useEffect(() => {
    const handleEnter = (e: DragEvent): void => {
      if (!isFileDrag(e)) return;
      depthRef.current += 1;
      setActive(true);
      e.preventDefault();
    };
    const handleOver = (e: DragEvent): void => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const handleLeave = (e: DragEvent): void => {
      if (!isFileDrag(e)) return;
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setActive(false);
    };
    const handleDrop = (e: DragEvent): void => {
      if (!isFileDrag(e)) return;
      e.preventDefault();
      depthRef.current = 0;
      setActive(false);
      const files = e.dataTransfer?.files ? Array.from(e.dataTransfer.files) : [];
      if (files.length > 0) onDrop(files);
    };

    window.addEventListener('dragenter', handleEnter);
    window.addEventListener('dragover', handleOver);
    window.addEventListener('dragleave', handleLeave);
    window.addEventListener('drop', handleDrop);
    return () => {
      window.removeEventListener('dragenter', handleEnter);
      window.removeEventListener('dragover', handleOver);
      window.removeEventListener('dragleave', handleLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [onDrop]);

  const cls = active ? `${styles.overlay} ${styles.show}` : styles.overlay;

  return (
    <div className={cls} aria-hidden={active ? 'false' : 'true'}>
      <div className={styles.inner}>
        <div className={styles.icon}>
          <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M32 8 L32 40 M22 30 L32 40 L42 30" />
            <path d="M12 44 L12 52 L52 52 L52 44" strokeDasharray="2 3" />
          </svg>
        </div>
        <div className={styles.title}>{t('dnd.title')}</div>
        <div className={styles.sub}>{t('dnd.sub')}</div>
      </div>
    </div>
  );
}
