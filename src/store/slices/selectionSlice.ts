// store/slices/selectionSlice.ts
// Hanterar all selection-logik: select, deselect, drag, duplicate

import type { MindNode } from '../../types/types';

export interface SelectionState {
  selectedNodeIds: Set<string>;
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

type SelectionStoreState = {
  nodes: Map<string, MindNode>;
  selectedNodeIds: Set<string>;
};

type SetState = (fn: (state: SelectionStoreState) => Partial<SelectionStoreState>) => void;

export const createSelectionSlice = (set: SetState): SelectionActions => ({
  toggleSelection: (id: string, multi: boolean) => set((state) => {
    const nextSelected = new Set(state.selectedNodeIds);
    if (multi) {
      if (nextSelected.has(id)) {
        nextSelected.delete(id);
      } else {
        nextSelected.add(id);
      }
    } else {
      nextSelected.clear();
      nextSelected.add(id);
    }
    return { selectedNodeIds: nextSelected };
  }),

  selectNodes: (ids: string[]) => set((state) => {
    if (ids.length === 0) return {};
    const nextSelected = new Set(state.selectedNodeIds);
    ids.forEach((id) => nextSelected.add(id));
    return { selectedNodeIds: nextSelected };
  }),

  selectAll: () => set((state) => ({
    selectedNodeIds: new Set(state.nodes.keys()),
  })),

  clearSelection: () => set(() => ({
    selectedNodeIds: new Set(),
  })),

  dragSelectedNodes: (dx, dy) => set((state) => {
    if (state.selectedNodeIds.size === 0) return {};
    const newNodes = new Map(state.nodes);
    state.selectedNodeIds.forEach((id) => {
      const node = newNodes.get(id);
      if (node && !node.pinned) {
        newNodes.set(id, { ...node, x: node.x + dx, y: node.y + dy });
      }
    });
    return { nodes: newNodes };
  }),

  duplicateSelectedNodes: () => set((state) => {
    const selectedNodes = Array.from(state.selectedNodeIds)
      .map(id => state.nodes.get(id))
      .filter((node): node is MindNode => Boolean(node));
    if (selectedNodes.length === 0) return {};

    const dateTag = 'card_copy_' + new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const copiedAt = new Date().toISOString();
    const newNodesMap = new Map(state.nodes);
    const newSelected = new Set<string>();

    selectedNodes.forEach(node => {
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
        tags: [...node.tags, dateTag],
        selected: false,
        createdAt: copiedAt,
        updatedAt: copiedAt,
        copyRef: originalId,
        copiedAt,
        originalCreatedAt,
      };
      newNodesMap.set(newNode.id, newNode);
      newSelected.add(newNode.id);
    });

    return { nodes: newNodesMap, selectedNodeIds: newSelected };
  }),

  addTagToSelected: (tag) => set((state) => {
    const clean = tag.trim();
    if (!clean) return {};
    const newNodes = new Map(state.nodes);
    state.selectedNodeIds.forEach((id) => {
      const node = newNodes.get(id);
      if (node && !node.tags.includes(clean)) {
        newNodes.set(id, { ...node, tags: [...node.tags, clean] });
      }
    });
    return { nodes: newNodes };
  }),

  removeTagFromSelected: (tag) => set((state) => {
    const newNodes = new Map(state.nodes);
    state.selectedNodeIds.forEach((id) => {
      const node = newNodes.get(id);
      if (node) {
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
    state.selectedNodeIds.forEach((id) => {
      const node = newNodes.get(id);
      if (node) {
        newNodes.set(id, { ...node, pinned: true });
      }
    });
    return { nodes: newNodes };
  }),

  unpinSelected: () => set((state) => {
    const newNodes = new Map(state.nodes);
    state.selectedNodeIds.forEach((id) => {
      const node = newNodes.get(id);
      if (node) {
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
