// src/hooks/useSelectionScope.ts
// Hook för att hantera selection scope - expandera urval till kopplade noder

import { useState, useMemo, useCallback } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import {
  getConnectionsByDegree,
  getConnectionsGroupedByDegree,
  hasAnyConnections,
  getMaxAvailableDegree,
} from '../utils/graphTraversal';

export interface ScopeData {
  byDegree: Map<number, string[]>;  // grad -> nodeIds
  allScopedIds: Map<string, number>; // nodeId -> grad
  total: number;
}

export function useSelectionScope() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nodes = useBrainStore((state: any) => state.nodes);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synapses = useBrainStore((state: any) => state.synapses);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const synapseVisibilityThreshold = useBrainStore((state: any) => state.synapseVisibilityThreshold);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectNodes = useBrainStore((state: any) => state.selectNodes);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const setScopeDegreeOnNodes = useBrainStore((state: any) => state.setScopeDegreeOnNodes);

  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [currentDegree, setCurrentDegree] = useState(0);
  const [includeInSelection, setIncludeInSelection] = useState(false);
  const [previewDegree, setPreviewDegree] = useState<number | null>(null);

  // Bas-markerade noder (användaren har klickat på dessa)
  const baseSelected = useMemo(() => {
    const selected = new Set<string>();
    selectedNodeIds.forEach((id) => {
      const node = nodes.get(id);
      if (node && !node.scopeDegree) {
        selected.add(id);
      }
    });
    return selected;
  }, [nodes, selectedNodeIds]);

  const visibleSynapses = useMemo(() => (
    synapses.filter((s: { similarity?: number }) => (s.similarity || 1) >= synapseVisibilityThreshold)
  ), [synapses, synapseVisibilityThreshold]);

  // Har bas-noderna några kopplingar?
  const hasConnections = useMemo(() => {
    if (baseSelected.size === 0) return false;
    return hasAnyConnections(baseSelected, visibleSynapses);
  }, [baseSelected, visibleSynapses]);

  // Max tillgänglig grad
  const maxAvailableDegree = useMemo(() => {
    if (baseSelected.size === 0) return 0;
    return getMaxAvailableDegree(baseSelected, visibleSynapses);
  }, [baseSelected, visibleSynapses]);

  // Scope-data för aktuell grad
  const scopeData = useMemo((): ScopeData => {
    if (baseSelected.size === 0 || currentDegree === 0) {
      return { byDegree: new Map(), allScopedIds: new Map(), total: 0 };
    }

    const allScopedIds = getConnectionsByDegree(baseSelected, visibleSynapses, currentDegree);
    const byDegree = getConnectionsGroupedByDegree(baseSelected, visibleSynapses, currentDegree);

    return {
      byDegree,
      allScopedIds,
      total: allScopedIds.size,
    };
  }, [baseSelected, visibleSynapses, currentDegree]);

  // Förhandsgransknings-data
  const previewData = useMemo((): ScopeData | null => {
    if (previewDegree === null || baseSelected.size === 0) return null;

    const allScopedIds = getConnectionsByDegree(baseSelected, visibleSynapses, previewDegree);
    const byDegree = getConnectionsGroupedByDegree(baseSelected, visibleSynapses, previewDegree);

    return {
      byDegree,
      allScopedIds,
      total: allScopedIds.size,
    };
  }, [baseSelected, visibleSynapses, previewDegree]);

  // Antal kort per grad (för UI)
  const degreeCounts = useMemo(() => {
    const counts: { degree: number; count: number; cumulative: number }[] = [];
    const grouped = getConnectionsGroupedByDegree(baseSelected, visibleSynapses, 6);

    let cumulative = 0;
    for (let i = 1; i <= Math.max(maxAvailableDegree, 1); i++) {
      const atDegree = grouped.get(i)?.length || 0;
      cumulative += atDegree;
      if (atDegree > 0 || i <= currentDegree) {
        counts.push({ degree: i, count: atDegree, cumulative });
      }
    }

    return counts;
  }, [baseSelected, visibleSynapses, maxAvailableDegree, currentDegree]);

  // Expandera till en viss grad
  const expandToScope = useCallback((degree: number) => {
    setCurrentDegree(degree);

    if (degree === 0) {
      // Rensa scope från alla noder
      setScopeDegreeOnNodes(new Map());
      return;
    }

    const allScopedIds = getConnectionsByDegree(baseSelected, visibleSynapses, degree);

    // Uppdatera scopeDegree på noderna
    setScopeDegreeOnNodes(allScopedIds);

    // Om "inkludera i urval" är på, markera dem också
    if (includeInSelection) {
      selectNodes(Array.from(allScopedIds.keys()));
    }
  }, [baseSelected, visibleSynapses, includeInSelection, selectNodes, setScopeDegreeOnNodes]);

  // Toggle "inkludera i urval"
  const toggleIncludeInSelection = useCallback(() => {
    const newValue = !includeInSelection;
    setIncludeInSelection(newValue);

    // Om vi slår på och har scope, markera dem
    if (newValue && currentDegree > 0) {
      const allScopedIds = getConnectionsByDegree(baseSelected, visibleSynapses, currentDegree);
      selectNodes(Array.from(allScopedIds.keys()));
    }
  }, [includeInSelection, currentDegree, baseSelected, visibleSynapses, selectNodes]);

  // Toggle panelens synlighet
  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  // Stäng och rensa
  const close = useCallback(() => {
    setIsVisible(false);
    setCurrentDegree(0);
    setPreviewDegree(null);
    setScopeDegreeOnNodes(new Map());
  }, [setScopeDegreeOnNodes]);

  return {
    // State
    isVisible,
    currentDegree,
    includeInSelection,
    previewDegree,

    // Computed
    baseSelected,
    baseCount: baseSelected.size,
    hasConnections,
    maxAvailableDegree,
    scopeData,
    previewData,
    degreeCounts,
    totalWithScope: baseSelected.size + scopeData.total,

    // Actions
    setIsVisible,
    toggleVisibility,
    expandToScope,
    setPreviewDegree,
    toggleIncludeInSelection,
    close,
  };
}
