// store/slices/selectionSlice.ts
// Hanterar all selection-logik: select, deselect, drag, duplicate

import type { MindNode } from '../../types/types';

export interface SelectionState {
  // Selection state is part of nodes (node.selected)
}

export interface SelectionActions {
  toggleSelection: (id: string, multi: boolean) => void;
  selectNodes: (ids: string[]) => void;
  selectAll: () => void;
  clearSelection: () => void;
  dragSelectedNodes: (dx: number, dy: number) => void;
  duplicateSelectedNodes: () => void;
  addTagToSelected: (tag: string) => void;
  removeTagFromSelected: (tag: string) => void;
  togglePin: (id: string) => void;
  pinSelected: () => void;
  unpinSelected: () => void;
  setScopeDegreeOnNodes: (scopeMap: Map<string, number>) => void;
}

type SetState = (fn: (state: { nodes: Map<string, MindNode> }) => Partial<{ nodes: Map<string, MindNode> }>) => void;

export const createSelectionSlice = (set: SetState): SelectionActions => ({
  toggleSelection: (id: string, multi: boolean) => set((state) => {
    const newNodes = new Map(state.nodes);
    if (multi) {
      const node = newNodes.get(id);
      if (node) {
        newNodes.set(id, { ...node, selected: !node.selected });
      }
    } else {
      newNodes.forEach((node, nodeId) => {
        newNodes.set(nodeId, { ...node, selected: nodeId === id });
      });
    }
    return { nodes: newNodes };
  }),

  selectNodes: (ids: string[]) => set((state) => {
    const newNodes = new Map(state.nodes);
    const idSet = new Set(ids);
    newNodes.forEach((node, nodeId) => {
      if (idSet.has(nodeId) && !node.selected) {
        newNodes.set(nodeId, { ...node, selected: true });
      }
    });
    return { nodes: newNodes };
  }),

  selectAll: () => set((state) => {
    const newNodes = new Map(state.nodes);
    newNodes.forEach((node, id) => {
      newNodes.set(id, { ...node, selected: true });
    });
    return { nodes: newNodes };
  }),

  clearSelection: () => set((state) => {
    const newNodes = new Map(state.nodes);
    newNodes.forEach((node, id) => {
      if (node.selected) {
        newNodes.set(id, { ...node, selected: false });
      }
    });
    return { nodes: newNodes };
  }),

  dragSelectedNodes: (dx, dy) => set((state) => {
    const newNodes = new Map(state.nodes);
    newNodes.forEach((node, id) => {
      if (node.selected && !node.pinned) {
        newNodes.set(id, { ...node, x: node.x + dx, y: node.y + dy });
      }
    });
    return { nodes: newNodes };
  }),

  duplicateSelectedNodes: () => set((state) => {
    const selectedNodes = Array.from(state.nodes.values()).filter(n => n.selected);
    if (selectedNodes.length === 0) return {};

    const dateTag = 'card_copy_' + new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const newNodesMap = new Map(state.nodes);

    // Unselect original nodes
    selectedNodes.forEach(node => {
      newNodesMap.set(node.id, { ...node, selected: false });
    });

    // Add duplicated nodes
    selectedNodes.forEach(node => {
      const newNode = {
        ...node,
        id: crypto.randomUUID(),
        tags: [...node.tags, dateTag],
        selected: true,
      };
      newNodesMap.set(newNode.id, newNode);
    });

    return { nodes: newNodesMap };
  }),

  addTagToSelected: (tag) => set((state) => {
    const newNodes = new Map(state.nodes);
    newNodes.forEach((node, id) => {
      if (node.selected && !node.tags.includes(tag)) {
        newNodes.set(id, { ...node, tags: [...node.tags, tag] });
      }
    });
    return { nodes: newNodes };
  }),

  removeTagFromSelected: (tag) => set((state) => {
    const newNodes = new Map(state.nodes);
    newNodes.forEach((node, id) => {
      if (node.selected) {
        newNodes.set(id, { ...node, tags: node.tags.filter(t => t !== tag) });
      }
    });
    return { nodes: newNodes };
  }),

  togglePin: (id) => set((state) => {
    const existingNode = state.nodes.get(id);
    if (!existingNode) return {};
    const updatedNode = { ...existingNode, pinned: !existingNode.pinned };
    const newNodes = new Map(state.nodes);
    newNodes.set(id, updatedNode);
    return { nodes: newNodes };
  }),

  pinSelected: () => set((state) => {
    const newNodes = new Map(state.nodes);
    newNodes.forEach((node, id) => {
      if (node.selected) {
        newNodes.set(id, { ...node, pinned: true });
      }
    });
    return { nodes: newNodes };
  }),

  unpinSelected: () => set((state) => {
    const newNodes = new Map(state.nodes);
    newNodes.forEach((node, id) => {
      if (node.selected) {
        newNodes.set(id, { ...node, pinned: false });
      }
    });
    return { nodes: newNodes };
  }),

  setScopeDegreeOnNodes: (scopeMap: Map<string, number>) => set((state) => {
    const newNodes = new Map(state.nodes);

    // Rensa alla scope-grader först
    newNodes.forEach((node, id) => {
      if (node.scopeDegree) {
        newNodes.set(id, { ...node, scopeDegree: undefined });
      }
    });

    // Sätt nya scope-grader
    scopeMap.forEach((degree, nodeId) => {
      const node = newNodes.get(nodeId);
      if (node) {
        newNodes.set(nodeId, { ...node, scopeDegree: degree });
      }
    });

    return { nodes: newNodes };
  }),
});
