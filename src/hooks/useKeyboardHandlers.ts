// hooks/useKeyboardHandlers.ts
// Samlar all keyboard shortcut-logik och kopplar till useKeyboard hook

import { useRef } from 'react';
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
  contextMenu: ContextMenuState | null;
  editingCardId: string | null;
  showCommandPalette: boolean;
  showSettings: boolean;
  showAIPanel: boolean;
  showAIChat: boolean;
  showMassImport: boolean;
  showQuoteExtractor: boolean;
  showTrailPanel: boolean;
  showGuidance: boolean;
  isScopePanelOpen: boolean;

  // Actions
  centerCamera: () => void;
  fitAllNodes: () => void;
  resetZoom: () => void;
  deleteSelected: (permanent?: boolean) => void;
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
  setShowAIChat: (show: boolean | ((prev: boolean) => boolean)) => void;
  setIsChatMinimized: (show: boolean | ((prev: boolean) => boolean)) => void;
  onOpenAIChat: () => void;
  onOpenMassImport: () => void;
  onOpenQuoteExtractor: () => void;
  setZenMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  setShowSettings: (show: boolean | ((prev: boolean) => boolean)) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setEditingCardId: (id: string | null) => void;
  setShowMassImport: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowQuoteExtractor: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowTrailPanel: (show: boolean | ((prev: boolean) => boolean)) => void;
  setShowGuidance: (show: boolean | ((prev: boolean) => boolean)) => void;
  onToggleScopePanel?: () => void;
  onCloseScopePanel?: () => void;
  onExpandScopeDegree?: (degree: number) => void;
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
  contextMenu,
  editingCardId,
  showCommandPalette,
  showSettings,
  showAIPanel,
  showAIChat,
  showMassImport,
  showQuoteExtractor,
  showTrailPanel,
  showGuidance,
  isScopePanelOpen,
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
  setShowAIChat,
  setIsChatMinimized,
  onOpenAIChat,
  onOpenMassImport,
  onOpenQuoteExtractor,
  setZenMode,
  setShowSettings,
  setContextMenu,
  setEditingCardId,
  setShowMassImport,
  setShowQuoteExtractor,
  setShowTrailPanel,
  setShowGuidance,
  onToggleScopePanel,
  onCloseScopePanel,
  onExpandScopeDegree,
  onToggleSessionPanel,
  isSessionPanelOpen,
  onCloseSessionPanel,
  onToggleViewMode,
  onToggleWandering,
  onBacktrackTrail,
  onForwardTrail,
}: KeyboardHandlersProps) {
  const lastEscapeAtRef = useRef(0);
  const nodes = useBrainStore((state) => state.nodes);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const sequences = useBrainStore((state) => state.sequences);
  const removeFromSequence = useBrainStore((state) => state.removeFromSequence);
  const selectNodes = useBrainStore((state) => state.selectNodes);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const unpinSelected = useBrainStore((state) => state.unpinSelected);
  const pinSelected = useBrainStore((state) => state.pinSelected);
  const toggleSynapseLines = useBrainStore((state) => state.toggleSynapseLines);
  const graphGravity = useBrainStore((state) => state.graphGravity);
  const setGraphGravity = useBrainStore((state) => state.setGraphGravity);
  const synapses = useBrainStore((state) => state.synapses);
  const synapseVisibilityThreshold = useBrainStore((state) => state.synapseVisibilityThreshold);
  const updateNodePositions = useBrainStore((state) => state.updateNodePositions);
  const duplicateSelectedNodes = useBrainStore((state) => state.duplicateSelectedNodes);
  const copySelectedNodes = useBrainStore((state) => state.copySelectedNodes);
  const saveStateForUndo = useBrainStore((state) => state.saveStateForUndo);
  const pasteNodes = useBrainStore((state) => state.pasteNodes);
  const undo = useBrainStore((state) => state.undo);
  const redo = useBrainStore((state) => state.redo);
  const addNodeWithId = useBrainStore((state) => state.addNodeWithId);
  const flipAllImageCardsToText = useBrainStore((state) => state.flipAllImageCardsToText);
  const flipAllImageCardsToImage = useBrainStore((state) => state.flipAllImageCardsToImage);

  // Build keyboard handlers
  useKeyboard({
    onOpenCommandPalette: () => setShowCommandPalette(true),
    onOpenSearch: () => search.openSearch(),
    onOpenAIChat: () => onOpenAIChat(),
    onDeleteSelected: deleteSelected,
    // Markera bara kort som är synliga (filtrerade efter session + taggar)
    onSelectAll: () => {
      if (visibleNodeIds.size === 0) return;
      clearSelection();
      selectNodes(Array.from(visibleNodeIds));
    },

    onEscape: () => {
      const now = Date.now();
      const last = lastEscapeAtRef.current;
      const isDoubleEscape = now - last < 400;
      lastEscapeAtRef.current = now;

      if (contextMenu) {
        setContextMenu(null);
        return;
      }

      if (showCommandPalette) {
        setShowCommandPalette(false);
        return;
      }

      if (editingCardId) {
        setEditingCardId(null);
        return;
      }

      if (showAIChat) {
        setShowAIChat(false);
        setIsChatMinimized(false);
        return;
      }

      if (showSettings) {
        setShowSettings(false);
        return;
      }

      if (showAIPanel) {
        setShowAIPanel(false);
        return;
      }

      if (search.isOpen) {
        search.closeSearch();
        return;
      }

      if (showQuoteExtractor) {
        setShowQuoteExtractor(false);
        return;
      }

      if (showMassImport) {
        setShowMassImport(false);
        return;
      }

      if (showGuidance) {
        setShowGuidance(false);
        return;
      }

      if (showTrailPanel) {
        setShowTrailPanel(false);
        return;
      }

      if (isScopePanelOpen) {
        onCloseScopePanel?.();
        return;
      }

      if (isSessionPanelOpen) {
        onCloseSessionPanel?.();
        return;
      }

      // Kolla om valda kort är del av en sekvens - ta bort dem från sekvensen
      const selected = Array.from(selectedNodeIds)
        .map(id => nodes.get(id))
        .filter(Boolean) as MindNode[];
      if (selected.length > 0) {
        let removedFromSequence = false;
        selected.forEach((node: MindNode) => {
          // Kolla om noden är i någon sekvens
          const inSequence = sequences.some((seq: Sequence) => seq.nodeIds.includes(node.id));
          if (inSequence) {
            removeFromSequence(node.id);
            removedFromSequence = true;
          }
        });

        // Om vi tog bort något från en sekvens, avsluta här (behåll selection)
        if (removedFromSequence) {
          return;
        }
      }

      if (isDoubleEscape) {
        const state = useBrainStore.getState();
        if (state.viewMode !== 'canvas' || state.canvasWeekView || state.canvasEternalView) {
          state.setViewMode('canvas');
          state.setCanvasWeekView(false);
          state.setCanvasEternalView(false);
        }
        setContextMenu(null);
        setShowCommandPalette(false);
        setShowSettings(false);
        setShowAIPanel(false);
        setShowAIChat(false);
        setIsChatMinimized(false);
        setEditingCardId(null);
        setShowMassImport(false);
        setShowQuoteExtractor(false);
        setShowTrailPanel(false);
        setShowGuidance(false);
        onCloseSessionPanel?.();
        onCloseScopePanel?.();
        if (search.isOpen) {
          search.closeSearch();
        }
        return;
      }

      setZenMode(false);
      clearSelection();
    },

    onSave: handleManualSave,
    onToggleZen: () => setZenMode((prev: boolean) => !prev),
    onCenterCamera: centerCamera,
    onFitAllNodes: fitAllNodes,
    onResetZoom: resetZoom,
    onToggleAIPanel: () => setShowAIPanel((prev: boolean) => !prev),

    onPin: () => {
      const selected = Array.from(selectedNodeIds)
        .map(id => nodes.get(id))
        .filter(Boolean) as MindNode[];
      if (selected.some((n: MindNode) => n.pinned)) {
        unpinSelected();
      } else {
        pinSelected();
      }
    },

    onToggleSynapseLines: toggleSynapseLines,
    onToggleScopePanel,
    onExpandScopeDegree,

    onAdjustGraphGravity: (delta: number) => {
      // Clampa gravity till giltigt range
      const newGravity = Math.max(GRAVITY.MIN, Math.min(GRAVITY.MAX, graphGravity + delta));
      setGraphGravity(newGravity);

      // Kör om layouten live med färre iterationer för snabbare respons
      const allNodes = Array.from(nodes.values()) as MindNode[];
      const selectedNodes = Array.from(selectedNodeIds)
        .map(id => nodes.get(id))
        .filter(Boolean) as MindNode[];

      // Filtrera synapser baserat på visibility threshold först
      const visibleSynapses = synapses.filter((s: { similarity?: number }) =>
        (s.similarity || 1) >= synapseVisibilityThreshold
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
            updateNodePositions(positions);
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

    onDuplicate: duplicateSelectedNodes,

    // Copy/Paste
    onCopy: copySelectedNodes,
    onPaste: () => {
      saveStateForUndo();
      const cursorPos = canvas.cursorPos;
      pasteNodes(cursorPos.x, cursorPos.y);
    },

    // Undo/Redo
    onUndo: undo,
    onRedo: redo,

    // New card
    onNewCard: () => {
      if (!hasFile) return;
      saveStateForUndo();
      const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      const newId = crypto.randomUUID();
      addNodeWithId(newId, '', centerPos.x, centerPos.y, 'text');
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
          preventDefault: () => { },
          stopPropagation: () => { },
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

    // Flip image cards
    onFlipAllToText: () => {
      saveStateForUndo();
      flipAllImageCardsToText();
    },
    onFlipAllToImage: () => {
      saveStateForUndo();
      flipAllImageCardsToImage();
    },
  }, selectedNodesCount > 0);
}
