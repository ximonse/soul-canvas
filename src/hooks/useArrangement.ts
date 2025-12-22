import { useCallback } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import type { MindNode, Sequence } from '../types/types';
import {
  arrangeVertical,
  arrangeHorizontal,
  arrangeGridHorizontal,
  arrangeGridVertical,
  arrangeCircle,
  arrangeKanban,
  arrangeCentrality
} from '../utils/arrangement';
import { SPACING } from '../utils/constants';

// Hitta sekvens som innehåller alla valda noder (eller flest)
const findSequenceForNodes = (selectedIds: Set<string>, sequences: Sequence[]): Sequence | null => {
  // Hitta sekvens där alla valda noder finns
  for (const seq of sequences) {
    const seqIdSet = new Set(seq.nodeIds);
    const allIncluded = [...selectedIds].every(id => seqIdSet.has(id));
    if (allIncluded) return seq;
  }

  // Om ingen perfekt match, hitta sekvens med flest av de valda
  let bestSeq: Sequence | null = null;
  let bestCount = 0;
  for (const seq of sequences) {
    const seqIdSet = new Set(seq.nodeIds);
    const count = [...selectedIds].filter(id => seqIdSet.has(id)).length;
    if (count > bestCount && count >= 2) {
      bestCount = count;
      bestSeq = seq;
    }
  }

  return bestSeq;
};

// Sortera noder efter sekvensordning
const sortBySequence = (nodes: MindNode[], sequence: Sequence): MindNode[] => {
  const orderMap = new Map<string, number>();
  sequence.nodeIds.forEach((id, idx) => orderMap.set(id, idx));

  return [...nodes].sort((a, b) => {
    const orderA = orderMap.get(a.id) ?? Infinity;
    const orderB = orderMap.get(b.id) ?? Infinity;
    return orderA - orderB;
  });
};

export const useArrangement = (defaultCenter?: {x: number, y: number}) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateNodePositions = useBrainStore((state: any) => state.updateNodePositions);

  const applyArrangement = useCallback((arranger: (nodes: MindNode[], center?: {x: number, y: number}) => Map<string, { x: number; y: number }>, center?: {x: number, y: number}, useSequenceOrder: boolean = false) => {
    // Always get fresh nodes from store to avoid stale closures
    const store = useBrainStore.getState();
    const currentNodes = store.nodes;
    let selected = (Array.from(currentNodes.values()) as MindNode[]).filter((n: MindNode) => n.selected);
    if (selected.length < 2) return; // Need at least 2 nodes to arrange

    // Om sekvensordning ska användas, sortera efter sekvens
    if (useSequenceOrder) {
      const selectedIds = new Set(selected.map((n: MindNode) => n.id));
      const sequence = findSequenceForNodes(selectedIds, store.sequences);
      if (sequence) {
        selected = sortBySequence(selected, sequence);
      }
    }

    // Use provided center, or defaultCenter (cursor), or undefined
    const targetCenter = center || defaultCenter;

    const newPositions = arranger(selected, targetCenter);
    updateNodePositions(newPositions);
  }, [updateNodePositions, defaultCenter]);

  // Special handler for centrality arrangement (needs synapses)
  const applyCentralityArrangement = useCallback((center?: {x: number, y: number}) => {
    const store = useBrainStore.getState();
    const currentNodes = store.nodes;
    const synapses = store.synapses;
    const selected = (Array.from(currentNodes.values()) as MindNode[]).filter((n: MindNode) => n.selected);
    if (selected.length < 2) return;

    const targetCenter = center || defaultCenter;
    const newPositions = arrangeCentrality(selected, synapses, targetCenter);
    updateNodePositions(newPositions);
  }, [updateNodePositions, defaultCenter]);

  return {
    // V och H använder sekvensordning om noderna är del av en sekvens
    arrangeVertical: useCallback((center?: {x: number, y: number}) => applyArrangement(arrangeVertical, center, true), [applyArrangement]),
    arrangeHorizontal: useCallback((center?: {x: number, y: number}) => applyArrangement(arrangeHorizontal, center, true), [applyArrangement]),
    // Grid/Kanban behåller sin läsordning
    arrangeGridHorizontal: useCallback((center?: {x: number, y: number}) => applyArrangement((nodes, c) => arrangeGridHorizontal(nodes, SPACING.GRID_COLUMNS, c), center, false), [applyArrangement]),
    arrangeGridVertical: useCallback((center?: {x: number, y: number}) => applyArrangement((nodes, c) => arrangeGridVertical(nodes, SPACING.GRID_COLUMNS, c), center, false), [applyArrangement]),
    arrangeCircle: useCallback((center?: {x: number, y: number}) => applyArrangement(arrangeCircle, center, false), [applyArrangement]),
    arrangeKanban: useCallback((center?: {x: number, y: number}) => applyArrangement((nodes, c) => arrangeKanban(nodes, SPACING.GRID_COLUMNS, c), center, false), [applyArrangement]),
    arrangeCentrality: applyCentralityArrangement,
  };
};
