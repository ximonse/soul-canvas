// hooks/useKeyboardHandlers.ts
// Samlar all keyboard shortcut-logik och kopplar till useKeyboard hook

import { useKeyboard } from './useKeyboard';
import { useBrainStore } from '../store/useBrainStore';
import { type CanvasAPI } from './useCanvas';
import { type SearchAPI } from './useSearch';
import type { ContextMenuState } from '../components/overlays/ContextMenu';
import { GRAVITY } from '../utils/constants';
import type { MindNode, Sequence } from '../types/types';

interface KeyboardHandlersProps {
  canvas: CanvasAPI;
  search: SearchAPI;
  hasFile: boolean;
  selectedNodesCount: number;
  visibleNodeIds: Set<string>;  // IDs av synliga kort (efter session + taggfilter)

  // Actions
  centerCamera: () => void;
  fitAllNodes: () => void;
  resetZoom: () => void;
  deleteSelected: () => void;
  handleManualSave: () => void;
  handleDrop: (e: React.DragEvent) => void;

  // Arrangements
  arrangeVertical: () => void;
  arrangeHorizontal: () => void;
  arrangeGridVertical: () => void;
  arrangeGridHorizontal: () => void;
  arrangeCircle: () => void;
  arrangeKanban: () => void;
  arrangeCentrality: () => void;

  // UI state setters
  setShowCommandPalette: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowAIPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAIChat: () => void;
  onOpenMassImport: () => void;
  onOpenQuoteExtractor: () => void;
  setZenMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setShowSettings: (show: boolean | ((prev: boolean) => boolean)) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setEditingCardId: (id: string | null) => void;
  onToggleScopePanel?: () => void;
  onToggleSessionPanel?: () => void;
  isSessionPanelOpen?: boolean;
  onCloseSessionPanel?: () => void;
  onToggleViewMode?: () => void;

  // Trail/Wandering
  onToggleWandering?: () => void;
  onBacktrackTrail?: () => void;
  onForwardTrail?: () => void;
}

export function useKeyboardHandlers({
  canvas,
  search,
  hasFile,
  selectedNodesCount,
  visibleNodeIds,
  centerCamera,
  fitAllNodes,
  resetZoom,
  deleteSelected,
  handleManualSave,
  handleDrop,
  arrangeVertical,
  arrangeHorizontal,
  arrangeGridVertical,
  arrangeGridHorizontal,
  arrangeCircle,
  arrangeKanban,
  arrangeCentrality,
  setShowCommandPalette,
  setShowAIPanel,
  onOpenAIChat,
  onOpenMassImport,
  onOpenQuoteExtractor,
  setZenMode,
  setShowSettings,
  setContextMenu,
  setEditingCardId,
  onToggleScopePanel,
  onToggleSessionPanel,
  isSessionPanelOpen,
  onCloseSessionPanel,
  onToggleViewMode,
  onToggleWandering,
  onBacktrackTrail,
  onForwardTrail,
}: KeyboardHandlersProps) {
  const store = useBrainStore();

  // Build keyboard handlers
  useKeyboard({
    onOpenCommandPalette: () => setShowCommandPalette(true),
    onOpenSearch: () => search.openSearch(),
    onOpenAIChat: () => onOpenAIChat(),
    onDeleteSelected: deleteSelected,
    // Markera bara kort som är synliga (filtrerade efter session + taggar)
    onSelectAll: () => {
      visibleNodeIds.forEach(id => {
        store.toggleSelection(id, true);
      });
    },

    onEscape: () => {
      if (search.isOpen) {
        search.closeSearch();
        return;
      }

      // Stäng SessionPanel om den är öppen
      if (isSessionPanelOpen) {
        onCloseSessionPanel?.();
        return;
      }

      // Kolla om valda kort är del av en sekvens - ta bort dem från sekvensen
      const selected = (Array.from(store.nodes.values()) as MindNode[]).filter((n: MindNode) => n.selected);
      if (selected.length > 0) {
        let removedFromSequence = false;
        selected.forEach((node: MindNode) => {
          // Kolla om noden är i någon sekvens
          const inSequence = store.sequences.some((seq: Sequence) => seq.nodeIds.includes(node.id));
          if (inSequence) {
            store.removeFromSequence(node.id);
            removedFromSequence = true;
          }
        });

        // Om vi tog bort något från en sekvens, avsluta här (behåll selection)
        if (removedFromSequence) {
          return;
        }
      }

      setZenMode(false);
      setContextMenu(null);
      setShowSettings(false);
      setShowAIPanel(false);
      setShowCommandPalette(false);
      store.clearSelection();
    },

    onSave: handleManualSave,
    onToggleZen: () => setZenMode((prev: boolean) => !prev),
    onCenterCamera: centerCamera,
    onFitAllNodes: fitAllNodes,
    onResetZoom: resetZoom,
    onToggleAIPanel: () => setShowAIPanel((prev: boolean) => !prev),

    onPin: () => {
      const selected = (Array.from(store.nodes.values()) as MindNode[]).filter((n: MindNode) => n.selected);
      if (selected.some((n: MindNode) => n.pinned)) {
        store.unpinSelected();
      } else {
        store.pinSelected();
      }
    },

    onToggleSynapseLines: store.toggleSynapseLines,
    onToggleScopePanel,

    onAdjustGraphGravity: (delta: number) => {
      // Clampa gravity till giltigt range
      const newGravity = Math.max(GRAVITY.MIN, Math.min(GRAVITY.MAX, store.graphGravity + delta));
      store.setGraphGravity(newGravity);

      // Kör om layouten live med färre iterationer för snabbare respons
      const allNodes = Array.from(store.nodes.values()) as MindNode[];
      const selectedNodes = allNodes.filter((n: MindNode) => n.selected);

      // Filtrera synapser baserat på visibility threshold först
      const visibleSynapses = store.synapses.filter((s: { similarity?: number }) =>
        (s.similarity || 1) >= store.synapseVisibilityThreshold
      );

      // Om kort är markerade, använd bara dem och deras kopplingar
      const hasSelection = selectedNodes.length > 0;
      const selectedIds = new Set(selectedNodes.map((n: MindNode) => n.id));

      // Filtrera till bara de som berör relevanta noder
      const relevantSynapses = hasSelection
        ? visibleSynapses.filter((s: { sourceId: string; targetId: string }) => selectedIds.has(s.sourceId) || selectedIds.has(s.targetId))
        : visibleSynapses;

      // Noder att layouta: markerade + deras kopplade grannar, eller alla
      const nodesToLayout: MindNode[] = hasSelection
        ? allNodes.filter((n: MindNode) => {
            if (selectedIds.has(n.id)) return true;
            // Inkludera grannar som är kopplade till markerade
            return relevantSynapses.some((s: { sourceId: string; targetId: string }) =>
              (s.sourceId === n.id && selectedIds.has(s.targetId)) ||
              (s.targetId === n.id && selectedIds.has(s.sourceId))
            );
          })
        : allNodes;

      if (relevantSynapses.length > 0 && nodesToLayout.length > 0) {
        import('../utils/forceLayout').then(({ calculateConnectedNodesLayout }) => {
          // Hitta noder som har kopplingar för bättre center-beräkning
          const connectedIds = new Set<string>();
          relevantSynapses.forEach((s: { sourceId: string; targetId: string }) => {
            connectedIds.add(s.sourceId);
            connectedIds.add(s.targetId);
          });
          const connectedNodes = nodesToLayout.filter((n: MindNode) => connectedIds.has(n.id));

          if (connectedNodes.length === 0) return;

          const cx = connectedNodes.reduce((sum: number, n: MindNode) => sum + n.x, 0) / connectedNodes.length;
          const cy = connectedNodes.reduce((sum: number, n: MindNode) => sum + n.y, 0) / connectedNodes.length;

          const positions = calculateConnectedNodesLayout(
            nodesToLayout as MindNode[],
            relevantSynapses,
            { centerX: cx, centerY: cy, iterations: 50, gravity: newGravity }
          );
          if (positions.size > 0) {
            store.updateNodePositions(positions);
          }
        });
      }
    },

    // Arrangements
    onArrangeVertical: arrangeVertical,
    onArrangeHorizontal: arrangeHorizontal,
    onArrangeGridVertical: arrangeGridVertical,
    onArrangeGridHorizontal: arrangeGridHorizontal,
    onArrangeCircle: arrangeCircle,
    onArrangeKanban: arrangeKanban,
    onArrangeCentrality: arrangeCentrality,

    onDuplicate: store.duplicateSelectedNodes,

    // Copy/Paste
    onCopy: store.copySelectedNodes,
    onPaste: () => {
      store.saveStateForUndo();
      const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      store.pasteNodes(centerPos.x, centerPos.y);
    },

    // Undo/Redo
    onUndo: store.undo,
    onRedo: store.redo,

    // New card
    onNewCard: () => {
      if (!hasFile) return;
      store.saveStateForUndo();
      const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      const newId = crypto.randomUUID();
      store.addNodeWithId(newId, '', centerPos.x, centerPos.y, 'text');
      setEditingCardId(newId);
    },

    // Import
    onImport: async () => {
      if (!hasFile) return;
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*,.json,.html';
      input.multiple = true;
      input.onchange = async (e) => {
        const files = (e.target as HTMLInputElement).files;
        if (!files) return;
        const fakeEvent = {
          preventDefault: () => {},
          stopPropagation: () => {},
          clientX: window.innerWidth / 2,
          clientY: window.innerHeight / 2,
          dataTransfer: { files: Array.from(files) }
        } as unknown as React.DragEvent;
        await handleDrop(fakeEvent);
      };
      input.click();
    },

    // Mass import
    onMassImport: () => {
      if (!hasFile) return;
      onOpenMassImport();
    },

    // Session panel
    onToggleSessionPanel: () => {
      onToggleSessionPanel?.();
    },

    // View mode (canvas/column)
    onToggleViewMode,

    // Trail/Wandering
    onToggleWandering,
    onBacktrackTrail,
    onForwardTrail,

    // Quote extractor (AI-driven)
    onQuoteExtractor: () => {
      if (!hasFile) return;
      onOpenQuoteExtractor();
    },

    // Search focus
    onFocusSearch: () => {
      const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      } else {
        search.openSearch();
      }
    },
  }, selectedNodesCount > 0);
}
