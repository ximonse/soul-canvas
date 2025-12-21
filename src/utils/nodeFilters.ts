import type { MindNode, Session } from '../types/types';

// Filtrera kort baserat på session
export const filterNodesBySession = (
  nodes: MindNode[],
  session: Session | null
): MindNode[] => {
  if (!session) return nodes;  // null = all-inclusive, visa alla
  const cardIdSet = new Set(session.cardIds);
  return nodes.filter(n => cardIdSet.has(n.id));
};

// Filtrera kort som INTE är i sessionen (för "lägg till"-sökning)
export const filterNodesOutsideSession = (
  nodes: MindNode[],
  session: Session | null
): MindNode[] => {
  if (!session) return [];  // all-inclusive har inga "utanför"
  const cardIdSet = new Set(session.cardIds);
  return nodes.filter(n => !cardIdSet.has(n.id));
};

export const filterNodesByTags = (
  nodes: MindNode[],
  includeTags: string[],
  excludeTags: string[]
): MindNode[] => {
  const includeSet = new Set(includeTags.map(t => t.trim()).filter(Boolean));
  const excludeSet = new Set(excludeTags.map(t => t.trim()).filter(Boolean));

  // Om inga filter, visa alla
  if (includeSet.size === 0 && excludeSet.size === 0) return nodes;

  return nodes.filter(node => {
    const nodeTags = node.tags || [];

    // Om exkludera-taggar finns och kortet har någon av dem → filtrera bort
    if (excludeSet.size > 0 && nodeTags.some(t => excludeSet.has(t))) {
      return false;
    }

    // Om inkludera-taggar finns, kortet måste ha minst en av dem
    if (includeSet.size > 0 && !nodeTags.some(t => includeSet.has(t))) {
      return false;
    }

    return true;
  });
};
