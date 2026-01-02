// store/slices/historySlice.ts
// Hanterar undo/redo och clipboard

import type { MindNode, Session, Synapse } from '../../types/types';

const MAX_UNDO_STACK = 50;
const MAX_REDO_STACK = 50;

export interface HistoryState {
  clipboard: MindNode[];
  undoStack: Array<{ nodes: Map<string, MindNode>; synapses: Synapse[]; selectedNodeIds: Set<string> }>;
  redoStack: Array<{ nodes: Map<string, MindNode>; synapses: Synapse[]; selectedNodeIds: Set<string> }>;
  pendingSave: boolean;
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
  selectedNodeIds: Set<string>;
  sessions: Session[];
  activeSessionId: string | null;
}

type SetState = (fn: (state: FullState) => Partial<FullState>) => void;

export const historyInitialState: HistoryState = {
  clipboard: [],
  undoStack: [],
  redoStack: [],
  pendingSave: false,
};

export const createHistorySlice = (set: SetState): HistoryActions => ({
  copySelectedNodes: () => set((state) => {
    const selectedNodes = Array.from(state.selectedNodeIds)
      .map(id => state.nodes.get(id))
      .filter((node): node is MindNode => Boolean(node));
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
    const newSelected = new Set<string>();
    const newIds: string[] = [];

    // Paste nodes with offset
    const pasteTag = 'pasted_' + new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const copiedAt = new Date().toISOString();
    state.clipboard.forEach(node => {
      const offsetX = node.x - clipboardCenterX;
      const offsetY = node.y - clipboardCenterY;

      const newId = crypto.randomUUID();
      const originalCreatedAt = node.originalCreatedAt ?? node.createdAt;
      const originalId = node.copyRef
        ? (node.copyRef.includes('-copy-')
          ? node.copyRef.split('-copy-').pop() || node.id
          : node.copyRef)
        : node.id;
      const newNode: MindNode = {
        ...node,
        id: newId,
        x: centerX + offsetX,
        y: centerY + offsetY,
        selected: false,
        tags: [...node.tags, pasteTag],
        createdAt: copiedAt,
        updatedAt: copiedAt,
        copyRef: originalId,
        copiedAt,
        originalCreatedAt,
      };
      newNodesMap.set(newNode.id, newNode);
      newSelected.add(newNode.id);
      newIds.push(newNode.id);
    });

    let newSessions = state.sessions;
    if (state.activeSessionId) {
      newSessions = state.sessions.map((session) => {
        if (session.id !== state.activeSessionId) return session;
        const cardIds = new Set([...session.cardIds, ...newIds]);
        return { ...session, cardIds: Array.from(cardIds) };
      });
    }

    return { nodes: newNodesMap, selectedNodeIds: newSelected, sessions: newSessions, pendingSave: true };
  }),

  saveStateForUndo: () => set((state) => {
    const snapshot = {
      nodes: new Map(state.nodes),
      synapses: [...state.synapses],
      selectedNodeIds: new Set(state.selectedNodeIds),
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
      synapses: [...state.synapses],
      selectedNodeIds: new Set(state.selectedNodeIds),
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
      selectedNodeIds: new Set(previousState.selectedNodeIds),
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      pendingSave: true
    };
  }),

  redo: () => set((state) => {
    if (state.redoStack.length === 0) return {};

    const currentSnapshot = {
      nodes: new Map(state.nodes),
      synapses: [...state.synapses],
      selectedNodeIds: new Set(state.selectedNodeIds),
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
      selectedNodeIds: new Set(nextState.selectedNodeIds),
      undoStack: newUndoStack,
      redoStack: newRedoStack,
      pendingSave: true
    };
  }),
});
