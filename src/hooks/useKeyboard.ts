// src/hooks/useKeyboard.ts
// Hanterar alla globala kortkommandon

import { useEffect, useCallback, useRef } from 'react';
import { useBrainStore } from '../store/useBrainStore';

interface KeyboardActions {
  onOpenCommandPalette: () => void;
  onOpenSearch: () => void;
  onOpenAIChat?: () => void;
  onDeleteSelected: (permanent?: boolean) => void;
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
  onExpandScopeDegree?: (degree: number) => void;
  onToggleSessionPanel?: () => void;
  onToggleViewMode?: () => void;
  // Trail/Wandering
  onToggleWandering?: () => void;
  onBacktrackTrail?: () => void;
  onForwardTrail?: () => void;
  // Arrangemang
  onArrangeVertical: () => void;
  onArrangeHorizontal: () => void;
  onArrangeGridVertical: () => void;
  onArrangeGridHorizontal: () => void;
  onArrangeCircle: () => void;
  onArrangeKanban: () => void;
  onArrangeCentrality: () => void;
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
  onQuoteExtractor: () => void;
  onFocusSearch: () => void;
  // Flip image cards
  onFlipAllToText: () => void;
  onFlipAllToImage: () => void;
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
  held: false,
  used: false,
  timeout: undefined as number | undefined
};

// Track D key state for sequence chaining (D+click)
export const dKeyState = {
  pressed: false,
};

// Track O key state for flip combos (O = show images, O+O = show text)
export const oComboState = {
  pressed: false,
  doublePressed: false,
  timeout: undefined as number | undefined
};

export function useKeyboard(
  actions: KeyboardActions,
  hasSelection: boolean
) {
  // Use ref to access actions in event handler without stale closures
  const actionsRef = useRef(actions);
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const typing = isTyping();

    // Alt+1..6 = column view with N columns (works even when typing)
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
      const degree = e.key >= '1' && e.key <= '6'
        ? parseInt(e.key, 10)
        : (e.code.startsWith('Digit') ? parseInt(e.code.replace('Digit', ''), 10) : NaN);
      if (!Number.isNaN(degree) && degree >= 1 && degree <= 6) {
        e.preventDefault();
        const state = useBrainStore.getState();
        state.setViewMode('column');
        state.setColumnCount(degree);
        state.setColumnShowOnlySelected(state.selectedNodeIds.size > 0);
        return;
      }
    }

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

    // Delete/Backspace: Delete selected nodes
    // Ctrl+Delete: Permanent deletion from all sessions
    // Delete (in session): Remove from session only
    // Delete (in "Alla kort"): Permanent deletion
    if ((e.key === 'Delete' || e.key === 'Backspace') && !typing) {
      e.preventDefault();
      const permanent = e.ctrlKey || e.metaKey;
      actions.onDeleteSelected(permanent);
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
      if ((key === 'z' || e.code === 'KeyZ') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
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

      // S = toggla SessionPanel
      if (key === 's' && !e.ctrlKey) {
        e.preventDefault();
        actions.onToggleSessionPanel?.();
        return;
      }

      // E = citatextraktor (AI-driven)
      if (key === 'e' && !e.ctrlKey) {
        e.preventDefault();
        actions.onQuoteExtractor();
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

      // K = toggle view mode (canvas/column)
      if (key === 'k' && !e.ctrlKey) {
        e.preventDefault();
        actions.onToggleViewMode?.();
        return;
      }

      // W = toggle wandering mode + trail panel
      if (key === 'w' && !e.ctrlKey) {
        e.preventDefault();
        actions.onToggleWandering?.();
        return;
      }

      // [ = backtrack trail
      if (e.key === '[' && !e.ctrlKey) {
        e.preventDefault();
        actions.onBacktrackTrail?.();
        return;
      }

      // ] = forward trail
      if (e.key === ']' && !e.ctrlKey) {
        e.preventDefault();
        actions.onForwardTrail?.();
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

      // Handle O+O combo for flipping image cards (only when not typing)
      if (!typing && key === 'o' && !e.ctrlKey) {
        if (oComboState.pressed && !oComboState.doublePressed) {
          // Second O press = O+O (show text on all image cards)
          e.preventDefault();
          oComboState.doublePressed = true;
          if (oComboState.timeout) clearTimeout(oComboState.timeout);
          actionsRef.current.onFlipAllToText();
          oComboState.pressed = false;
          oComboState.doublePressed = false;
          return;
        } else if (!oComboState.pressed) {
          // First O press
          e.preventDefault();
          oComboState.pressed = true;
          oComboState.timeout = window.setTimeout(() => {
            if (oComboState.pressed && !oComboState.doublePressed) {
              // Single O (show images on all image cards)
              actionsRef.current.onFlipAllToImage();
            }
            oComboState.pressed = false;
            oComboState.doublePressed = false;
          }, 300); // 300ms window for double-press
          return;
        }
      }

      // Handle g+combo first (only when not typing)
      if (!typing) {
        // Start g-combo tracking
        if (key === 'g' && !e.ctrlKey) {
          gComboState.pressed = true;
          gComboState.held = true;
          gComboState.used = false;
          if (gComboState.timeout) clearTimeout(gComboState.timeout);
          gComboState.timeout = window.setTimeout(() => {
            gComboState.pressed = false;
          }, 500);
          return;
        }

        if (gComboState.held && key !== 'g') {
          gComboState.used = true;
        }

        // Check for g+v, g+h, g+t, g+c combos OR standalone v/h
        if (['v', 'h', 't', 'c'].includes(key)) {
          const currentHasSelection = useBrainStore.getState().selectedNodeIds.size > 0;
          let handled = false;

          if (gComboState.held && currentHasSelection && (key !== 'c' || gComboState.held)) {
            // g+key combos: grid arrangements (g+c only when g is held)
            e.preventDefault();
            gComboState.used = true;
            if (key === 'v') {
              actionsRef.current.onArrangeGridVertical();
            } else if (key === 'h') {
              actionsRef.current.onArrangeGridHorizontal();
            } else if (key === 't') {
              actionsRef.current.onArrangeKanban();
            } else if (key === 'c') {
              actionsRef.current.onArrangeCentrality();
            }
            gComboState.pressed = false;
            handled = true;
          } else if (!gComboState.pressed && currentHasSelection && (key === 'v' || key === 'h')) {
            // Standalone v/h: single row/column arrangements
            e.preventDefault();
            if (key === 'v') {
              actionsRef.current.onArrangeVertical();
            } else if (key === 'h') {
              actionsRef.current.onArrangeHorizontal();
            }
            handled = true;
          }

          if (handled) {
            return;
          }

          if (key !== 'c' || !gComboState.held) {
            gComboState.pressed = false;
          }
          // Let other handlers run (e.g., "c" duplicate)
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

    // Håll G nedtryckt = förhindra timeout
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'g') {
        if (!isTyping() && !gComboState.used) {
          const state = useBrainStore.getState();
          const hasSelection = Array.from(state.selectedNodeIds).some((id) => {
            const node = state.nodes.get(id);
            return node && !node.pinned;
          });
          if (hasSelection) {
            actionsRef.current.onArrangeGridVertical();
          }
        }
        gComboState.held = false;
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

    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('keydown', handleDKeyDown);

    return () => {
      window.removeEventListener('keydown', handleAllKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('keydown', handleDKeyDown);
      // Cleanup timers
      if (gComboState.timeout) clearTimeout(gComboState.timeout);
      if (oComboState.timeout) clearTimeout(oComboState.timeout);
    };
  }, [handleKeyDown]);
}
