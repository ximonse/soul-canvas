// src/utils/trailPathfinding.ts
// Funktioner för att hitta graviterade kort och beräkna centralitet

import type { MindNode, Synapse, GravitatingNode, NodeCentrality } from '../types/types';

const isCopyNode = (node?: MindNode | null) => Boolean(node?.copyRef);

/**
 * Hitta kort som graviterar mot ett givet kort
 * Sorterade efter semantisk likhet (högst först)
 */
export function findGravitatingNodes(
  currentNodeId: string,
  nodes: Map<string, MindNode>,
  synapses: Synapse[],
  options: {
    minSimilarity?: number;
    maxResults?: number;
    excludeVisited?: Set<string>;
    requireDifferentWords?: boolean;
  } = {}
): GravitatingNode[] {
  const {
    minSimilarity = 0.3,
    maxResults = 20,
    excludeVisited = new Set(),
    requireDifferentWords = false,
  } = options;

  const currentNode = nodes.get(currentNodeId);
  if (!currentNode || isCopyNode(currentNode)) return [];

  // Hitta alla synapser som involverar currentNodeId
  const relevantSynapses = synapses.filter(
    s => s.sourceId === currentNodeId || s.targetId === currentNodeId
  );

  const gravitatingNodes: GravitatingNode[] = [];

  for (const synapse of relevantSynapses) {
    const otherId = synapse.sourceId === currentNodeId ? synapse.targetId : synapse.sourceId;

    // Hoppa över om redan besökt eller är samma nod
    if (excludeVisited.has(otherId) || otherId === currentNodeId) continue;

    const otherNode = nodes.get(otherId);
    if (!otherNode || isCopyNode(otherNode)) continue;

    // Använd synapsens similarity, eller default till 0.5
    const similarity = synapse.similarity ?? 0.5;
    if (similarity < minSimilarity) continue;

    // Om vi vill ha "surface difference" (semantiskt lika men olika ord)
    if (requireDifferentWords) {
      const surfaceDiff = hasSurfaceDifference(currentNode, otherNode, similarity);
      if (!surfaceDiff) continue;
    }

    gravitatingNodes.push({
      nodeId: otherId,
      similarity,
      semanticTheme: undefined, // Kan fyllas i av AI senare
      themeColor: undefined,
    });
  }

  // Sortera efter similarity (högst först)
  gravitatingNodes.sort((a, b) => b.similarity - a.similarity);

  // Begränsa antal
  return gravitatingNodes.slice(0, maxResults);
}

/**
 * Kontrollera om två noder har "surface difference"
 * d.v.s. semantiskt lika (hög similarity) men lexikalt olika
 */
export function hasSurfaceDifference(
  node1: MindNode,
  node2: MindNode,
  semanticSimilarity: number
): boolean {
  // Kräv hög semantisk likhet
  if (semanticSimilarity < 0.6) return false;

  // Beräkna lexikal likhet (ordöverlapp)
  const words1 = extractWords(node1.content);
  const words2 = extractWords(node2.content);
  const lexicalSimilarity = calculateJaccardSimilarity(words1, words2);

  // Tagg-överlapp
  const tags1 = new Set(node1.tags.map(t => t.toLowerCase()));
  const tags2 = new Set(node2.tags.map(t => t.toLowerCase()));
  const tagOverlap = calculateJaccardSimilarity(tags1, tags2);

  // Surface difference = hög semantisk likhet, låg lexikal likhet
  // Om lexikal likhet < 0.3 OCH tagg-overlap < 0.5, betraktas det som surface difference
  return lexicalSimilarity < 0.3 && tagOverlap < 0.5;
}

/**
 * Extrahera ord från text (normaliserad)
 */
function extractWords(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/<[^>]*>/g, ' ')  // Ta bort HTML
    .replace(/[^\wåäöÅÄÖ]/g, ' ')  // Behåll svenska tecken
    .split(/\s+/)
    .filter(w => w.length > 2);  // Ignorera korta ord
  return new Set(words);
}

/**
 * Jaccard similarity mellan två set
 */
function calculateJaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 0;

  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

/**
 * Beräkna centralitet för alla noder
 * Returnerar Map<nodeId, NodeCentrality>
 */
export function calculateNodeCentrality(
  nodes: Map<string, MindNode>,
  synapses: Synapse[],
  minSimilarity: number = 0
): Map<string, NodeCentrality> {
  const result = new Map<string, NodeCentrality>();

  // Filtrera synapser baserat på similarity threshold
  const filteredSynapses = synapses.filter((s) => {
    if ((s.similarity ?? 1) < minSimilarity) return false;
    const sourceNode = nodes.get(s.sourceId);
    const targetNode = nodes.get(s.targetId);
    return !isCopyNode(sourceNode) && !isCopyNode(targetNode);
  });

  // Räkna kopplingar per nod
  const connectionCounts = new Map<string, number>();

  for (const synapse of filteredSynapses) {
    connectionCounts.set(
      synapse.sourceId,
      (connectionCounts.get(synapse.sourceId) || 0) + 1
    );
    connectionCounts.set(
      synapse.targetId,
      (connectionCounts.get(synapse.targetId) || 0) + 1
    );
  }

  // Hitta max för normalisering
  let maxConnections = 0;
  connectionCounts.forEach(count => {
    if (count > maxConnections) maxConnections = count;
  });

  // Skapa centrality-objekt för alla noder
  nodes.forEach((node, nodeId) => {
    if (isCopyNode(node)) return;
    const count = connectionCounts.get(nodeId) || 0;
    result.set(nodeId, {
      nodeId,
      connectionCount: count,
      normalizedCentrality: maxConnections > 0 ? count / maxConnections : 0,
    });
  });

  return result;
}

/**
 * Filtrera noder baserat på minimum antal kopplingar (procent av max)
 */
export function filterByConnectionCount(
  centralityData: Map<string, NodeCentrality>,
  minPercentage: number
): string[] {
  const threshold = minPercentage / 100;
  const result: string[] = [];

  centralityData.forEach((centrality, nodeId) => {
    if (centrality.normalizedCentrality >= threshold) {
      result.push(nodeId);
    }
  });

  return result;
}

/**
 * Hitta de mest centrala noderna ("hub-kort")
 */
export function getTopHubs(
  centralityData: Map<string, NodeCentrality>,
  count: number = 10
): NodeCentrality[] {
  const sorted = Array.from(centralityData.values())
    .sort((a, b) => b.connectionCount - a.connectionCount);
  return sorted.slice(0, count);
}

/**
 * Beräkna genomsnittlig similarity för en stig
 */
export function calculateTrailStrength(
  waypointIds: string[],
  synapses: Synapse[]
): number {
  if (waypointIds.length < 2) return 0;

  let totalSimilarity = 0;
  let count = 0;

  for (let i = 0; i < waypointIds.length - 1; i++) {
    const from = waypointIds[i];
    const to = waypointIds[i + 1];

    // Hitta synapsen mellan dessa noder
    const synapse = synapses.find(
      s => (s.sourceId === from && s.targetId === to) ||
           (s.sourceId === to && s.targetId === from)
    );

    if (synapse) {
      totalSimilarity += synapse.similarity ?? 0.5;
      count++;
    }
  }

  return count > 0 ? totalSimilarity / count : 0;
}
