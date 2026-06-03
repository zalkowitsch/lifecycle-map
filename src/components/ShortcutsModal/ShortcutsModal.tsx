/**
 * Modal showing available keyboard shortcuts + mouse interactions.
 * Opens via the keyboard-icon button in the header, or via "?" key.
 */
import { useEffect } from 'react';
import { useI18n } from '@/contexts/I18nContext';
import styles from './ShortcutsModal.module.css';

export interface ShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const CMD = navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl';

interface Shortcut {
  keys: string[];
  description: string;
}

interface ShortcutSection {
  title: string;
  items: Shortcut[];
}

export function ShortcutsModal({ open, onClose }: ShortcutsModalProps): JSX.Element | null {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sections: ShortcutSection[] = [
    {
      title: t('shortcuts.navigation') || 'Navigation',
      items: [
        { keys: ['←'], description: t('shortcuts.walkPrev') || 'Previous step' },
        { keys: ['→'], description: t('shortcuts.walkNext') || 'Next step' },
        { keys: ['drag empty'], description: t('shortcuts.pan') || 'Pan canvas' },
        { keys: ['Esc'], description: t('shortcuts.escape') || 'Close drawer / modal' },
      ],
    },
    {
      title: t('shortcuts.search') || 'Search',
      items: [
        { keys: [CMD, 'K'], description: t('shortcuts.openSearch') || 'Open search' },
      ],
    },
    {
      title: t('shortcuts.zoom') || 'Zoom',
      items: [
        { keys: [CMD, '0'], description: t('shortcuts.zoomReset') || 'Reset to 100%' },
        { keys: [CMD, '-'], description: t('shortcuts.zoomOut') || 'Zoom out' },
        { keys: [CMD, '+'], description: t('shortcuts.zoomIn') || 'Zoom in' },
        { keys: ['pinch'], description: t('shortcuts.pinch') || 'Trackpad pinch on canvas' },
      ],
    },
    {
      title: t('shortcuts.editor') || 'Source editor',
      items: [
        { keys: [CMD, 'Z'], description: t('shortcuts.undo') || 'Undo' },
        { keys: [CMD, '⇧', 'Z'], description: t('shortcuts.redo') || 'Redo' },
      ],
    },
  ];

  return (
    <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="shortcuts-title">
      <div className={styles.scrim} onClick={onClose} />
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>{t('shortcuts.eyebrow') || 'reference'}</div>
            <h2 id="shortcuts-title" className={styles.title}>
              {t('shortcuts.title') || 'Shortcuts'}{' '}
              <em>· {t('shortcuts.subtitle') || 'navigate faster'}</em>
            </h2>
          </div>
          <button className={styles.close} onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className={styles.body}>
          {sections.map((s) => (
            <section key={s.title} className={styles.section}>
              <h3 className={styles.sectionTitle}>{s.title}</h3>
              <ul className={styles.list}>
                {s.items.map((item, i) => (
                  <li key={`${s.title}-${i}`} className={styles.row}>
                    <span className={styles.keys}>
                      {item.keys.map((k, j) => (
                        <span key={j}>
                          {j > 0 && <span className={styles.plus}>+</span>}
                          <kbd className={styles.kbd}>{k}</kbd>
                        </span>
                      ))}
                    </span>
                    <span className={styles.desc}>{item.description}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ShortcutsModal;
