// src/hooks/useChatContext.ts
// Hanterar pinnade noder och kontext-beräkning för AI-chatt

import { useState, useMemo, useCallback } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import type { MindNode } from '../types/types';
import { getImageText } from '../utils/imageRefs';

interface ChatContext {
  contextSnippet: string;
  contextCount: number;
  isSelectedContext: boolean;
  hasPinnedContext: boolean;
}

export function useChatContext() {
  const nodes = useBrainStore((state) => state.nodes);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const [pinnedNodeIds, setPinnedNodeIds] = useState<string[]>([]);

  // Hämta pinnade noder som objekt
  const pinnedNodes = useMemo(() => {
    return pinnedNodeIds
      .map(id => nodes.get(id))
      .filter((n): n is MindNode => n !== undefined);
  }, [pinnedNodeIds, nodes]);

  // Lägg till ett kort i chatten
  const addNodeToContext = useCallback((nodeId: string) => {
    setPinnedNodeIds(prev => {
      if (prev.includes(nodeId)) return prev;
      return [...prev, nodeId];
    });
  }, []);

  // Ta bort ett kort från chatten
  const removeNodeFromContext = useCallback((nodeId: string) => {
    setPinnedNodeIds(prev => prev.filter(id => id !== nodeId));
  }, []);

  // Lägg till alla markerade kort i chatten
  const addSelectedNodesToContext = useCallback(() => {
    const selected = Array.from(selectedNodeIds);
    if (selected.length === 0) return;
    setPinnedNodeIds(prev => [...new Set([...prev, ...selected])]);
  }, [selectedNodeIds]);

  // Rensa alla pinnade kort
  const clearPinnedNodes = useCallback(() => {
    setPinnedNodeIds([]);
  }, []);

  // Hämta nuvarande kontext-nod-IDs
  const getContextNodeIds = useCallback(() => {
    if (pinnedNodeIds.length > 0) return pinnedNodeIds;
    if (selectedNodeIds.size > 0) return Array.from(selectedNodeIds);
    return [];
  }, [selectedNodeIds, pinnedNodeIds]);

  // Bygg kontext-snippet - LAZY: anropas bara när det behövs
  const buildContextSnippet = useCallback((): ChatContext => {
    const allNodes = Array.from(nodes.values()) as MindNode[];
    const selected = Array.from(selectedNodeIds)
      .map(id => nodes.get(id))
      .filter(Boolean) as MindNode[];

    // Om vi har pinnade noder, använd dem
    if (pinnedNodes.length > 0) {
      const snippet = pinnedNodes.map((n, i) => {
        const baseText = n.type === 'image' ? getImageText(n) : (n.ocrText || n.content || '');
        const base = baseText.replace(/\s+/g, ' ').slice(0, 180);
        const tags = n.tags?.length ? ` [tags: ${n.tags.join(', ')}]` : '';
        return `[${i + 1}] (${n.type}) ${base}${tags}`;
      }).join('\n');

      return {
        contextSnippet: snippet,
        contextCount: pinnedNodes.length,
        isSelectedContext: false,
        hasPinnedContext: true
      };
    }

    // Använd markerade om det finns, annars 30 senaste
    const baseNodes: MindNode[] = selected.length > 0
      ? selected
      : allNodes
          .sort((a: MindNode, b: MindNode) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 30);

    const snippet = baseNodes.map((n: MindNode, i: number) => {
      const baseText = n.type === 'image' ? getImageText(n) : (n.ocrText || n.content || '');
      const base = baseText.replace(/\s+/g, ' ').slice(0, 180);
      const tags = n.tags?.length ? ` [tags: ${n.tags.join(', ')}]` : '';
      return `[${i + 1}] (${n.type}) ${base}${tags}`;
    }).join('\n');

    return {
      contextSnippet: snippet,
      contextCount: baseNodes.length,
      isSelectedContext: selected.length > 0,
      hasPinnedContext: false
    };
  }, [nodes, selectedNodeIds, pinnedNodes]);

  return {
    pinnedNodes,
    pinnedNodeIds,
    addNodeToContext,
    removeNodeFromContext,
    addSelectedNodesToContext,
    clearPinnedNodes,
    getContextNodeIds,
    buildContextSnippet,
    hasPinnedContext: pinnedNodes.length > 0,
  };
}
