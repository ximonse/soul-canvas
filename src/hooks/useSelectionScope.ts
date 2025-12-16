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
  const nodes = useBrainStore((state) => state.nodes);
  const synapses = useBrainStore((state) => state.synapses);
  const selectNodes = useBrainStore((state) => state.selectNodes);
  const setScopeDegreeOnNodes = useBrainStore((state) => state.setScopeDegreeOnNodes);

  // UI state
  const [isVisible, setIsVisible] = useState(false);
  const [currentDegree, setCurrentDegree] = useState(0);
  const [includeInSelection, setIncludeInSelection] = useState(false);
  const [previewDegree, setPreviewDegree] = useState<number | null>(null);

  // Bas-markerade noder (användaren har klickat på dessa)
  const baseSelected = useMemo(() => {
    const selected = new Set<string>();
    nodes.forEach((node, id) => {
      if (node.selected && !node.scopeDegree) {
        selected.add(id);
      }
    });
    return selected;
  }, [nodes]);

  // Har bas-noderna några kopplingar?
  const hasConnections = useMemo(() => {
    if (baseSelected.size === 0) return false;
    return hasAnyConnections(baseSelected, synapses);
  }, [baseSelected, synapses]);

  // Max tillgänglig grad
  const maxAvailableDegree = useMemo(() => {
    if (baseSelected.size === 0) return 0;
    return getMaxAvailableDegree(baseSelected, synapses);
  }, [baseSelected, synapses]);

  // Scope-data för aktuell grad
  const scopeData = useMemo((): ScopeData => {
    if (baseSelected.size === 0 || currentDegree === 0) {
      return { byDegree: new Map(), allScopedIds: new Map(), total: 0 };
    }

    const allScopedIds = getConnectionsByDegree(baseSelected, synapses, currentDegree);
    const byDegree = getConnectionsGroupedByDegree(baseSelected, synapses, currentDegree);

    return {
      byDegree,
      allScopedIds,
      total: allScopedIds.size,
    };
  }, [baseSelected, synapses, currentDegree]);

  // Förhandsgransknings-data
  const previewData = useMemo((): ScopeData | null => {
    if (previewDegree === null || baseSelected.size === 0) return null;

    const allScopedIds = getConnectionsByDegree(baseSelected, synapses, previewDegree);
    const byDegree = getConnectionsGroupedByDegree(baseSelected, synapses, previewDegree);

    return {
      byDegree,
      allScopedIds,
      total: allScopedIds.size,
    };
  }, [baseSelected, synapses, previewDegree]);

  // Antal kort per grad (för UI)
  const degreeCounts = useMemo(() => {
    const counts: { degree: number; count: number; cumulative: number }[] = [];
    const grouped = getConnectionsGroupedByDegree(baseSelected, synapses, 5);

    let cumulative = 0;
    for (let i = 1; i <= Math.max(maxAvailableDegree, 1); i++) {
      const atDegree = grouped.get(i)?.length || 0;
      cumulative += atDegree;
      if (atDegree > 0 || i <= currentDegree) {
        counts.push({ degree: i, count: atDegree, cumulative });
      }
    }

    return counts;
  }, [baseSelected, synapses, maxAvailableDegree, currentDegree]);

  // Expandera till en viss grad
  const expandToScope = useCallback((degree: number) => {
    setCurrentDegree(degree);

    if (degree === 0) {
      // Rensa scope från alla noder
      setScopeDegreeOnNodes(new Map());
      return;
    }

    const allScopedIds = getConnectionsByDegree(baseSelected, synapses, degree);

    // Uppdatera scopeDegree på noderna
    setScopeDegreeOnNodes(allScopedIds);

    // Om "inkludera i urval" är på, markera dem också
    if (includeInSelection) {
      selectNodes(Array.from(allScopedIds.keys()));
    }
  }, [baseSelected, synapses, includeInSelection, selectNodes, setScopeDegreeOnNodes]);

  // Toggle "inkludera i urval"
  const toggleIncludeInSelection = useCallback(() => {
    const newValue = !includeInSelection;
    setIncludeInSelection(newValue);

    // Om vi slår på och har scope, markera dem
    if (newValue && currentDegree > 0) {
      const allScopedIds = getConnectionsByDegree(baseSelected, synapses, currentDegree);
      selectNodes(Array.from(allScopedIds.keys()));
    }
  }, [includeInSelection, currentDegree, baseSelected, synapses, selectNodes]);

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
