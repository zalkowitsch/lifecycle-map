// useKeyboard — single-effect wiring for the global app shortcuts.
//
// Listing handlers as props rather than registering each one separately keeps
// the call-site declarative (e.g. <App> passes `{ onCmdK, onEscape, ... }`)
// and means we only attach one `keydown` listener regardless of how many
// shortcuts are active.
//
// Mod = Cmd on macOS, Ctrl elsewhere. We treat them interchangeably.

import { useEffect, useRef } from 'react';

export interface KeyboardHandlers {
  onCmdK?: () => void;
  onCmdZ?: () => void;
  onCmdShiftZ?: () => void;
  onCmd0?: () => void;
  onCmdMinus?: () => void;
  onCmdPlus?: () => void;
  onEscape?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
}

export function useKeyboard(handlers: KeyboardHandlers): void {
  // Stash handlers in a ref so the effect can stay subscribed across renders
  // even when callers pass fresh inline closures every render.
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const h = handlersRef.current;
      const mod = e.metaKey || e.ctrlKey;

      // Escape and arrow keys are unmodified — handle first.
      if (e.key === 'Escape') {
        if (h.onEscape) {
          h.onEscape();
        }
        return;
      }
      if (!mod) {
        if (e.key === 'ArrowLeft' && h.onArrowLeft) {
          h.onArrowLeft();
          return;
        }
        if (e.key === 'ArrowRight' && h.onArrowRight) {
          h.onArrowRight();
          return;
        }
        return;
      }

      // From here on, Cmd/Ctrl is pressed.
      const key = e.key.toLowerCase();

      if (key === 'k' && !e.shiftKey) {
        if (h.onCmdK) {
          e.preventDefault();
          h.onCmdK();
        }
        return;
      }

      if (key === 'z') {
        if (e.shiftKey) {
          if (h.onCmdShiftZ) {
            e.preventDefault();
            h.onCmdShiftZ();
          }
        } else if (h.onCmdZ) {
          e.preventDefault();
          h.onCmdZ();
        }
        return;
      }

      if (e.key === '0') {
        if (h.onCmd0) {
          e.preventDefault();
          h.onCmd0();
        }
        return;
      }

      if (e.key === '-' || e.key === '_') {
        if (h.onCmdMinus) {
          e.preventDefault();
          h.onCmdMinus();
        }
        return;
      }

      if (e.key === '=' || e.key === '+') {
        if (h.onCmdPlus) {
          e.preventDefault();
          h.onCmdPlus();
        }
        return;
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);
}
