// store/slices/historySlice.ts
// Hanterar undo/redo och clipboard

import type { MindNode, Synapse } from '../../types/types';

const MAX_UNDO_STACK = 50;
const MAX_REDO_STACK = 50;

export interface HistoryState {
  clipboard: MindNode[];
  undoStack: Array<{ nodes: Map<string, MindNode>; synapses: Synapse[] }>;
  redoStack: Array<{ nodes: Map<string, MindNode>; synapses: Synapse[] }>;
}

export interface HistoryActions {
  copySelectedNodes: () => void;
  pasteNodes: (centerX: number, centerY: number) => void;
  saveStateForUndo: () => void;
  undo: () => void;
  redo: () => void;
}

interface FullState extends HistoryState {
  nodes: Map<string, MindNode>;
  synapses: Synapse[];
}

type SetState = (fn: (state: FullState) => Partial<FullState>) => void;

export const historyInitialState: HistoryState = {
  clipboard: [],
  undoStack: [],
  redoStack: [],
};

export const createHistorySlice = (set: SetState): HistoryActions => ({
  copySelectedNodes: () => set((state) => {
    const selectedNodes = Array.from(state.nodes.values()).filter(n => n.selected);
    if (selectedNodes.length === 0) return {};
    return { clipboard: selectedNodes };
  }),

  pasteNodes: (centerX: number, centerY: number) => set((state) => {
    if (state.clipboard.length === 0) return {};

    // Calculate the center of the copied nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.clipboard.forEach(node => {
      minX = Math.min(minX, node.x);
      minY = Math.min(minY, node.y);
      maxX = Math.max(maxX, node.x);
      maxY = Math.max(maxY, node.y);
    });
    const clipboardCenterX = (minX + maxX) / 2;
    const clipboardCenterY = (minY + maxY) / 2;

    const newNodesMap = new Map(state.nodes);

    // Clear selection on existing nodes
    newNodesMap.forEach((node, id) => {
      if (node.selected) {
        newNodesMap.set(id, { ...node, selected: false });
      }
    });

    // Paste nodes with offset
    const pasteTag = 'pasted_' + new Date().toISOString().slice(2, 10).replace(/-/g, '');
    state.clipboard.forEach(node => {
      const offsetX = node.x - clipboardCenterX;
      const offsetY = node.y - clipboardCenterY;

      const newNode: MindNode = {
        ...node,
        id: crypto.randomUUID(),
        x: centerX + offsetX,
        y: centerY + offsetY,
        selected: true,
        tags: [...node.tags, pasteTag],
        createdAt: new Date().toISOString(),
      };
      newNodesMap.set(newNode.id, newNode);
    });

    return { nodes: newNodesMap };
  }),

  saveStateForUndo: () => set((state) => {
    const snapshot = {
      nodes: new Map(state.nodes),
      synapses: [...state.synapses]
    };

    const newUndoStack = [...state.undoStack, snapshot];
    if (newUndoStack.length > MAX_UNDO_STACK) {
      newUndoStack.shift();
    }

    return {
      undoStack: newUndoStack,
      redoStack: []
    };
  }),

  undo: () => set((state) => {
    if (state.undoStack.length === 0) return {};

    const currentSnapshot = {
      nodes: new Map(state.nodes),
      synapses: [...state.synapses]
    };

    const previousState = state.undoStack[state.undoStack.length - 1];
    const newUndoStack = state.undoStack.slice(0, -1);
    const newRedoStack = [...state.redoStack, currentSnapshot];
    if (newRedoStack.length > MAX_REDO_STACK) {
      newRedoStack.shift();
    }

    return {
      nodes: new Map(previousState.nodes),
      synapses: [...previousState.synapses],
      undoStack: newUndoStack,
      redoStack: newRedoStack
    };
  }),

  redo: () => set((state) => {
    if (state.redoStack.length === 0) return {};

    const currentSnapshot = {
      nodes: new Map(state.nodes),
      synapses: [...state.synapses]
    };

    const nextState = state.redoStack[state.redoStack.length - 1];
    const newRedoStack = state.redoStack.slice(0, -1);
    const newUndoStack = [...state.undoStack, currentSnapshot];
    if (newUndoStack.length > MAX_UNDO_STACK) {
      newUndoStack.shift();
    }

    return {
      nodes: new Map(nextState.nodes),
      synapses: [...nextState.synapses],
      undoStack: newUndoStack,
      redoStack: newRedoStack
    };
  }),
});
