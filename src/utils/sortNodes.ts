// src/utils/sortNodes.ts
import type { MindNode, Synapse, SortOption } from '../types/types';

/**
 * Räkna antal kopplingar för ett kort
 */
function countConnections(nodeId: string, synapses: Synapse[]): number {
  return synapses.filter(s => s.sourceId === nodeId || s.targetId === nodeId).length;
}

/**
 * Räkna antal taggar för ett kort (praktiska + semantiska)
 */
function countTags(node: MindNode): number {
  return (node.tags?.length || 0) + (node.semanticTags?.length || 0);
}

/**
 * Sortera kort efter valt alternativ
 */
export function sortNodes(
  nodes: MindNode[],
  sortOption: SortOption,
  synapses: Synapse[]
): MindNode[] {
  const sorted = [...nodes];

  switch (sortOption) {
    case 'connections':
      // Mest kopplingar först
      sorted.sort((a, b) => countConnections(b.id, synapses) - countConnections(a.id, synapses));
      break;

    case 'tags':
      // Flest taggar först
      sorted.sort((a, b) => countTags(b) - countTags(a));
      break;

    case 'oldest':
      // Äldst först (createdAt ascending)
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;

    case 'newest':
      // Nyast först (createdAt descending)
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;

    case 'modified':
      // Senast modifierad först (updatedAt descending, fallback till createdAt)
      sorted.sort((a, b) => {
        const aTime = new Date(a.updatedAt || a.createdAt).getTime();
        const bTime = new Date(b.updatedAt || b.createdAt).getTime();
        return bTime - aTime;
      });
      break;

    case 'copied':
      // Senast kopierad först (copiedAt descending, cards without copiedAt last)
      sorted.sort((a, b) => {
        if (!a.copiedAt && !b.copiedAt) return 0;
        if (!a.copiedAt) return 1;
        if (!b.copiedAt) return -1;
        return new Date(b.copiedAt).getTime() - new Date(a.copiedAt).getTime();
      });
      break;

    case 'value-high':
      // Högst värde först (1 = highest, 6 = lowest, undefined last)
      sorted.sort((a, b) => {
        if (a.value === undefined && b.value === undefined) return 0;
        if (a.value === undefined) return 1;
        if (b.value === undefined) return -1;
        return a.value - b.value; // 1 comes before 6
      });
      break;

    case 'value-low':
      // Lägst värde först (6 = lowest, 1 = highest, undefined last)
      sorted.sort((a, b) => {
        if (a.value === undefined && b.value === undefined) return 0;
        if (a.value === undefined) return 1;
        if (b.value === undefined) return -1;
        return b.value - a.value; // 6 comes before 1
      });
      break;
  }

  return sorted;
}

/**
 * Hämta visningstext för sorteringsalternativ
 */
export const SORT_LABELS: Record<SortOption, string> = {
  connections: 'Mest kopplingar',
  tags: 'Flest taggar',
  oldest: 'Äldst först',
  newest: 'Nyast först',
  modified: 'Senast ändrad',
  copied: 'Senast kopierad',
  'value-high': 'Högst värde (1→6)',
  'value-low': 'Lägst värde (6→1)',
};
