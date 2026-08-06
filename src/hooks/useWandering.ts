// src/hooks/useWandering.ts
// Hook för att hantera vandring genom semantiskt utrymme

import { useCallback, useEffect, useMemo } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { findGravitatingNodes, calculateNodeCentrality } from '../utils/trailPathfinding';
import type { Trail, GravitatingNode, NodeCentrality, Synapse, TrailWaypoint } from '../types/types';

export function useWandering() {
  const {
    nodes,
    synapses,
    trails,
    activeTrailId,
    selectedTrailIds,
    showActiveTrailLine,
    wandering,
    synapseVisibilityThreshold,
    // Actions
    startWandering: storeStartWandering,
    stopWandering: storeStopWandering,
    setGravitatingNodes,
    setWanderingThreshold,
    toggleSurfaceDifferenceMode,
    toggleGravitatingColorMode,
    setGravitatingColorMode,
    createTrail,
    addWaypointToTrail,
    branchTrail,
    switchToTrail,
    deleteTrail,
    renameTrail,
    backtrackTrail,
    removeWaypointFromTrail,
    moveWaypointInTrail,
    toggleTrailSelection,
    clearTrailSelection,
    setSelectedTrailIds,
    setShowActiveTrailLine,
    getTrailNodeIds,
    clearSelection,
    selectNodes,
  } = useBrainStore();

  // Aktiv trail
  const activeTrail = useMemo(() =>
    trails.find((t: Trail) => t.id === activeTrailId) || null,
    [trails, activeTrailId]
  );

  // Valda trails (för multi-stig visning)
  const selectedTrails = useMemo((): Trail[] =>
    selectedTrailIds
      .map((id) => trails.find((t: Trail) => t.id === id))
      .filter((trail): trail is Trail => Boolean(trail)),
    [trails, selectedTrailIds]
  );

  // Beräkna visiterade noder i aktiv trail
  const visitedNodeIds = useMemo((): Set<string> => {
    if (!activeTrail) return new Set<string>();
    return new Set(activeTrail.waypoints.map((w: TrailWaypoint) => w.nodeId));
  }, [activeTrail]);

  // Markera alla kort i en stig (rensar först befintlig markering)
  const selectTrailNodes = useCallback((trailId: string) => {
    const nodeIds = getTrailNodeIds(trailId);
    if (nodeIds.length > 0) {
      clearSelection();
      selectNodes(nodeIds);
    }
  }, [getTrailNodeIds, clearSelection, selectNodes]);

  // Uppdatera graviterade noder när wandering state ändras
  useEffect(() => {
    if (!wandering.isActive || !wandering.currentNodeId) {
      return;
    }

    const gravitating = findGravitatingNodes(
      wandering.currentNodeId,
      nodes,
      synapses.filter((s: Synapse) => (s.similarity ?? 1) >= synapseVisibilityThreshold),
      {
        minSimilarity: wandering.minSimilarityThreshold,
        maxResults: 20,
        excludeVisited: visitedNodeIds,
        requireDifferentWords: wandering.showOnlyDifferentWords,
      }
    );

    setGravitatingNodes(gravitating);
  }, [
    wandering.isActive,
    wandering.currentNodeId,
    wandering.minSimilarityThreshold,
    wandering.showOnlyDifferentWords,
    nodes,
    synapses,
    synapseVisibilityThreshold,
    visitedNodeIds,
    setGravitatingNodes,
  ]);

  // Starta vandring från ett kort
  const startWandering = useCallback((nodeId: string) => {
    storeStartWandering(nodeId);
    // Skapa automatiskt en ny trail om ingen finns
    if (!activeTrailId) {
      createTrail('Ny vandring', nodeId);
    }
  }, [storeStartWandering, activeTrailId, createTrail]);

  const startNewTrail = useCallback((nodeId: string, name?: string) => {
    const trailName = name?.trim() || 'Ny stig';
    createTrail(trailName, nodeId);
    storeStartWandering(nodeId);
  }, [createTrail, storeStartWandering]);

  // Stoppa vandring
  const stopWandering = useCallback(() => {
    storeStopWandering();
  }, [storeStopWandering]);

  // Vandra till ett nytt kort
  const stepTo = useCallback((nodeId: string) => {
    if (!wandering.isActive) return;

    // Hitta similarity för detta steg
    const gravitatingNode = wandering.gravitatingNodes.find((g: GravitatingNode) => g.nodeId === nodeId);
    const similarity = gravitatingNode?.similarity;

    // Lägg till i aktiv trail
    if (activeTrailId) {
      addWaypointToTrail(activeTrailId, nodeId, similarity);
    }

    // Flytta vandringspositionen
    storeStartWandering(nodeId);
  }, [wandering.isActive, wandering.gravitatingNodes, activeTrailId, addWaypointToTrail, storeStartWandering]);

  // Backa i stigen
  const backtrack = useCallback((steps: number = 1) => {
    backtrackTrail(steps);
  }, [backtrackTrail]);

  // Spara aktuell trail med nytt namn
  const saveCurrentTrail = useCallback((name: string): string | null => {
    if (!activeTrailId) return null;
    renameTrail(activeTrailId, name);
    return activeTrailId;
  }, [activeTrailId, renameTrail]);

  // Förgrena här (skapa ny trail från nuvarande position)
  const branchHere = useCallback((newName?: string): string | null => {
    if (!activeTrailId || !activeTrail) return null;
    const currentIndex = activeTrail.waypoints.length - 1;
    const name = newName || `Gren från ${activeTrail.name}`;
    return branchTrail(activeTrailId, currentIndex, name);
  }, [activeTrailId, activeTrail, branchTrail]);

  // Återuppta en sparad trail
  const resumeTrail = useCallback((trailId: string) => {
    const trail = trails.find((t: Trail) => t.id === trailId);
    if (!trail || trail.waypoints.length === 0) return;

    switchToTrail(trailId);
    // Flytta vandringspositionen till sista waypoint
    const lastWaypoint = trail.waypoints[trail.waypoints.length - 1];
    storeStartWandering(lastWaypoint.nodeId);
  }, [trails, switchToTrail, storeStartWandering]);

  // Beräkna centralitet
  const centralityData = useMemo<Map<string, NodeCentrality>>(() => {
    return calculateNodeCentrality(nodes, synapses, synapseVisibilityThreshold);
  }, [nodes, synapses, synapseVisibilityThreshold]);

  // Trail-historik (sorterad efter senast uppdaterad)
  const trailHistory = useMemo((): Trail[] => {
    return [...trails].sort((a: Trail, b: Trail) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }, [trails]);

  // Kan vi backa?
  const canBacktrack = useMemo(() => {
    return activeTrail ? activeTrail.waypoints.length > 1 : false;
  }, [activeTrail]);

  // Aktuell position i trail
  const currentTrailIndex = useMemo(() => {
    return activeTrail ? activeTrail.waypoints.length - 1 : -1;
  }, [activeTrail]);

  return {
    // State
    isWandering: wandering.isActive,
    currentNodeId: wandering.currentNodeId,
    gravitatingNodes: wandering.gravitatingNodes,
    activeTrail,
    visitedNodeIds,
    centralityData,
    trailHistory,
    canBacktrack,
    currentTrailIndex,

    // Settings
    minSimilarityThreshold: wandering.minSimilarityThreshold,
    showOnlyDifferentWords: wandering.showOnlyDifferentWords,
    colorMode: wandering.colorMode,

    // Multi-trail selection
    selectedTrails,
    selectedTrailIds,
    showActiveTrailLine,

    // Actions
    startWandering,
    startNewTrail,
    stopWandering,
    stepTo,
    backtrack,
    removeWaypointFromTrail,
    moveWaypointInTrail,
    saveCurrentTrail,
    branchHere,
    resumeTrail,
    deleteTrail,
    selectTrailNodes,
    toggleTrailSelection,
    clearTrailSelection,
    setSelectedTrailIds,
    setShowActiveTrailLine,

    // Settings actions
    setThreshold: setWanderingThreshold,
    toggleSurfaceDifference: toggleSurfaceDifferenceMode,
    toggleColorMode: toggleGravitatingColorMode,
    setColorMode: setGravitatingColorMode,
  };
}
