// src/utils/graphTraversal.ts
// Funktioner för att traversera graf-kopplingar mellan noder

import type { Synapse } from '../types/types';

/**
 * Hitta alla noder som är direkt kopplade till en given nod
 */
export function getDirectConnections(
  nodeId: string,
  synapses: Synapse[]
): Set<string> {
  const connected = new Set<string>();

  for (const synapse of synapses) {
    if (synapse.sourceId === nodeId) {
      connected.add(synapse.targetId);
    } else if (synapse.targetId === nodeId) {
      connected.add(synapse.sourceId);
    }
  }

  return connected;
}

/**
 * Hitta alla kopplade noder per grad från en bas-uppsättning
 * Returnerar Map<nodeId, grad> där grad är 1, 2, 3... (avstånd från bas)
 */
export function getConnectionsByDegree(
  baseIds: Set<string>,
  synapses: Synapse[],
  maxDegree: number = 6
): Map<string, number> {
  const result = new Map<string, number>();
  let currentFrontier = new Set(baseIds);

  for (let degree = 1; degree <= maxDegree; degree++) {
    const nextFrontier = new Set<string>();

    for (const nodeId of currentFrontier) {
      const connected = getDirectConnections(nodeId, synapses);

      for (const connectedId of connected) {
        // Hoppa över bas-noder och redan besökta
        if (baseIds.has(connectedId) || result.has(connectedId)) {
          continue;
        }

        result.set(connectedId, degree);
        nextFrontier.add(connectedId);
      }
    }

    // Inget mer att traversera
    if (nextFrontier.size === 0) break;

    currentFrontier = nextFrontier;
  }

  return result;
}

/**
 * Returnerar noder grupperade efter grad för visning i UI
 */
export function getConnectionsGroupedByDegree(
  baseIds: Set<string>,
  synapses: Synapse[],
  maxDegree: number = 6
): Map<number, string[]> {
  const allConnections = getConnectionsByDegree(baseIds, synapses, maxDegree);
  const grouped = new Map<number, string[]>();

  allConnections.forEach((degree, nodeId) => {
    const existing = grouped.get(degree) || [];
    existing.push(nodeId);
    grouped.set(degree, existing);
  });

  return grouped;
}

/**
 * Räkna totalt antal kopplingar för bas-noderna
 * Används för att avgöra om scope-panelen ska visas
 */
export function hasAnyConnections(
  baseIds: Set<string>,
  synapses: Synapse[]
): boolean {
  for (const synapse of synapses) {
    if (baseIds.has(synapse.sourceId) || baseIds.has(synapse.targetId)) {
      return true;
    }
  }
  return false;
}

/**
 * Hitta max tillgänglig grad för en bas-uppsättning
 */
export function getMaxAvailableDegree(
  baseIds: Set<string>,
  synapses: Synapse[],
  maxSearch: number = 6
): number {
  const connections = getConnectionsByDegree(baseIds, synapses, maxSearch);

  let maxDegree = 0;
  connections.forEach((degree) => {
    if (degree > maxDegree) maxDegree = degree;
  });

  return maxDegree;
}
