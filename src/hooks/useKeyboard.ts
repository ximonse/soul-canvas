// src/hooks/useKeyboard.ts
// Hanterar alla globala kortkommandon

import { useEffect, useCallback, useRef } from 'react';
import { useBrainStore } from '../store/useBrainStore';

interface KeyboardActions {
  onOpenCommandPalette: () => void;
  onOpenSearch: () => void;
  onOpenAIChat?: () => void;
  onDeleteSelected: () => void;
  onSelectAll: () => void;
  onEscape: () => void;
  onSave: () => void;
  onToggleZen: () => void;
  onCenterCamera: () => void;
  onFitAllNodes: () => void;
  onResetZoom: () => void;
  onToggleAIPanel: () => void;
  onPin: () => void;
  onToggleSynapseLines: () => void;
  onAdjustGraphGravity: (delta: number) => void;
  onToggleScopePanel?: () => void;
  // Arrangemang
  onArrangeVertical: () => void;
  onArrangeHorizontal: () => void;
  onArrangeGridVertical: () => void;
  onArrangeGridHorizontal: () => void;
  onArrangeCircle: () => void;
  onArrangeKanban: () => void;
  onDuplicate: () => void;
  // Copy/Paste
  onCopy: () => void;
  onPaste: () => void;
  // Undo/Redo
  onUndo: () => void;
  onRedo: () => void;
  // New card, Import, Search focus
  onNewCard: () => void;
  onImport: () => void;
  onMassImport: () => void;
  onFocusSearch: () => void;
}

function isTyping(): boolean {
  const el = document.activeElement;
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'TEXTAREA' || el.tagName === 'INPUT';
}

// Track g-combo state outside of useEffect to persist across re-renders
// Exported so other components can check if G is pressed (e.g., to disable zoom)
export const gComboState = {
  pressed: false,
  timeout: undefined as number | undefined
};

// Track D key state for sequence chaining (D+click)
export const dKeyState = {
  pressed: false,
};

export function useKeyboard(
  actions: KeyboardActions,
  hasSelection: boolean
) {
  // Use ref to access actions in event handler without stale closures
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const typing = isTyping();

    // Space öppnar command palette (om inte typing)
    if (e.key === ' ' && !typing) {
      e.preventDefault();
      actions.onOpenCommandPalette();
      return;
    }

    // / öppnar sökning
    if (e.key === '/' && !typing) {
      e.preventDefault();
      actions.onOpenSearch();
      return;
    }

    // Delete/Backspace raderar markerade
    if ((e.key === 'Delete' || e.key === 'Backspace') && !typing && hasSelection) {
      e.preventDefault();
      actions.onDeleteSelected();
      return;
    }

    // Escape stänger allt
    if (e.key === 'Escape') {
      if (typing) {
        (document.activeElement as HTMLElement).blur();
        return;
      }
      actions.onEscape();
      return;
    }

    // Ctrl+Enter sparar
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      actions.onSave();
      return;
    }

    // Ctrl+C = copy selected nodes
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !typing && hasSelection) {
      e.preventDefault();
      actions.onCopy();
      return;
    }

    // Ctrl+V = paste nodes
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !typing) {
      e.preventDefault();
      actions.onPaste();
      return;
    }

    // Ctrl+Z = undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !typing) {
      e.preventDefault();
      actions.onUndo();
      return;
    }

    // Ctrl+Y = redo
    if ((e.ctrlKey || e.metaKey) && e.key === 'y' && !typing) {
      e.preventDefault();
      actions.onRedo();
      return;
    }

    // Ctrl+§ = toggle scope panel (§ is key code for Swedish keyboard, also check for ` and IntlBackslash)
    if ((e.ctrlKey || e.metaKey) && (e.key === '§' || e.key === '`' || e.code === 'IntlBackslash' || e.code === 'Backquote') && !typing) {
      e.preventDefault();
      actions.onToggleScopePanel?.();
      return;
    }

    // Endast om inte typing
    if (!typing) {
      const key = e.key.toLowerCase();

      // Z = zen mode
      if (key === 'z' && !e.ctrlKey) {
        actions.onToggleZen();
        return;
      }

      // - = fit all (visa alla kort)
      if (e.key === '-') {
        e.preventDefault();
        actions.onFitAllNodes();
        return;
      }

      // 0 = reset zoom till 100%
      if (e.key === '0' && !e.ctrlKey) {
        e.preventDefault();
        actions.onResetZoom();
        return;
      }

      // B = AI panel
      if (key === 'b' && !e.ctrlKey) {
        e.preventDefault();
        actions.onToggleAIPanel();
        return;
      }

      // A = open AI chat (manual provider)
      if (key === 'a' && !e.ctrlKey) {
        e.preventDefault();
        actions.onOpenAIChat?.();
        return;
      }

      // N = nytt kort
      if (key === 'n' && !e.ctrlKey) {
        e.preventDefault();
        actions.onNewCard();
        return;
      }

      // I = importera (bilder, JSON, Zotero, etc.)
      if (key === 'i' && !e.ctrlKey) {
        e.preventDefault();
        actions.onImport();
        return;
      }

      // M = mass-import (text med dubbla radbrytningar)
      if (key === 'm' && !e.ctrlKey) {
        e.preventDefault();
        actions.onMassImport();
        return;
      }

      // F = fokusera sök
      if (key === 'f' && !e.ctrlKey) {
        e.preventDefault();
        actions.onFocusSearch();
        return;
      }

      // P = pinna/avpinna
      if (key === 'p' && !e.ctrlKey) {
        e.preventDefault();
        actions.onPin();
        return;
      }

      // L = toggle synapse-linjer
      if (key === 'l' && !e.ctrlKey) {
        e.preventDefault();
        actions.onToggleSynapseLines();
        return;
      }

      // C = kopiera/duplicera
      if (key === 'c' && !e.ctrlKey && hasSelection) {
        e.preventDefault();
        actions.onDuplicate();
        return;
      }

      // Q = stack/circle
      if (key === 'q' && hasSelection) {
        e.preventDefault();
        actions.onArrangeCircle();
        return;
      }

      // Ctrl+A = select all
      if (key === 'a' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        actions.onSelectAll();
        return;
      }
    }
  }, [actions, hasSelection]);

  // Single consolidated keyboard listener for both regular keys and g+combo
  useEffect(() => {
    const handleAllKeyDown = (e: KeyboardEvent) => {
      const typing = isTyping();
      const key = e.key.toLowerCase();

      // Handle g+combo first (only when not typing)
      if (!typing) {
        // Start g-combo tracking
        if (key === 'g' && !e.ctrlKey) {
          gComboState.pressed = true;
          if (gComboState.timeout) clearTimeout(gComboState.timeout);
          gComboState.timeout = window.setTimeout(() => {
            gComboState.pressed = false;
          }, 500);
          return;
        }

        // Check for g+v, g+h, g+t combos OR standalone v/h
        if (['v', 'h', 't'].includes(key)) {
          const currentHasSelection = Array.from(useBrainStore.getState().nodes.values()).some(n => n.selected);

          if (gComboState.pressed && currentHasSelection) {
            // g+key combos: grid arrangements
            e.preventDefault();
            if (key === 'v') {
              actionsRef.current.onArrangeGridVertical();
            } else if (key === 'h') {
              actionsRef.current.onArrangeGridHorizontal();
            } else if (key === 't') {
              actionsRef.current.onArrangeKanban();
            }
            gComboState.pressed = false;
          } else if (!gComboState.pressed && currentHasSelection && (key === 'v' || key === 'h')) {
            // Standalone v/h: single row/column arrangements
            e.preventDefault();
            if (key === 'v') {
              actionsRef.current.onArrangeVertical();
            } else if (key === 'h') {
              actionsRef.current.onArrangeHorizontal();
            }
          } else {
            gComboState.pressed = false;
          }
          // Don't pass v/h/t to handleKeyDown
          return;
        }
      }

      // Reset g-combo if another key is pressed
      if (gComboState.pressed) {
        gComboState.pressed = false;
      }

      // Call the main keydown handler
      handleKeyDown(e);
    };

    window.addEventListener('keydown', handleAllKeyDown);

    // G + scroll för att justera graph gravity
    const handleWheel = (e: WheelEvent) => {
      if (gComboState.pressed && !isTyping()) {
        e.preventDefault();
        // Scroll up = öka gravity (tätare), scroll down = minska (glesare)
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        actionsRef.current.onAdjustGraphGravity(delta);

        // Förnya timeouten så man kan fortsätta scrolla
        if (gComboState.timeout) clearTimeout(gComboState.timeout);
        gComboState.timeout = window.setTimeout(() => {
          gComboState.pressed = false;
        }, 1000); // Längre timeout när man scrollar
      }
    };

    // Håll G nedtryckt = förhindra timeout
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'g') {
        // Ge lite extra tid efter att G släpps
        if (gComboState.timeout) clearTimeout(gComboState.timeout);
        gComboState.timeout = window.setTimeout(() => {
          gComboState.pressed = false;
        }, 300);
      }

      // D släpps = avsluta sekvens
      if (key === 'd' && dKeyState.pressed) {
        dKeyState.pressed = false;
        // Finish sequence via store (hanteras i App/KonvaCanvas)
        useBrainStore.getState().finishSequence();
      }
    };

    // D keydown = starta sekvens-mode
    const handleDKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'd' && !e.ctrlKey && !isTyping()) {
        if (!dKeyState.pressed) {
          dKeyState.pressed = true;
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleDKeyDown);

    return () => {
      window.removeEventListener('keydown', handleAllKeyDown);
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleDKeyDown);
    };
  }, [handleKeyDown]);
}
