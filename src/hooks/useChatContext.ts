// src/hooks/useChatContext.ts
// Hanterar pinnade noder och kontext-beräkning för AI-chatt

import { useState, useMemo, useCallback } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import type { MindNode } from '../types/types';

interface ChatContext {
  contextSnippet: string;
  contextCount: number;
  isSelectedContext: boolean;
  hasPinnedContext: boolean;
}

export function useChatContext() {
  const store = useBrainStore();
  const [pinnedNodeIds, setPinnedNodeIds] = useState<string[]>([]);

  // Hämta pinnade noder som objekt
  const pinnedNodes = useMemo(() => {
    return pinnedNodeIds
      .map(id => store.nodes.get(id))
      .filter((n): n is MindNode => n !== undefined);
  }, [pinnedNodeIds, store.nodes]);

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
    const selected = Array.from(store.nodes.values())
      .filter(n => n.selected)
      .map(n => n.id);
    if (selected.length === 0) return;
    setPinnedNodeIds(prev => [...new Set([...prev, ...selected])]);
  }, [store.nodes]);

  // Rensa alla pinnade kort
  const clearPinnedNodes = useCallback(() => {
    setPinnedNodeIds([]);
  }, []);

  // Hämta nuvarande kontext-nod-IDs
  const getContextNodeIds = useCallback(() => {
    if (pinnedNodeIds.length > 0) return pinnedNodeIds;
    const allNodes = Array.from(store.nodes.values());
    const selected = allNodes.filter(n => n.selected);
    return selected.length > 0 ? selected.map(n => n.id) : [];
  }, [store.nodes, pinnedNodeIds]);

  // Bygg kontext-snippet - LAZY: anropas bara när det behövs
  const buildContextSnippet = useCallback((): ChatContext => {
    const allNodes = Array.from(store.nodes.values());
    const selected = allNodes.filter(n => n.selected);

    // Om vi har pinnade noder, använd dem
    if (pinnedNodes.length > 0) {
      const snippet = pinnedNodes.map((n, i) => {
        const base = (n.ocrText || n.content || '').replace(/\s+/g, ' ').slice(0, 180);
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
    const baseNodes = selected.length > 0
      ? selected
      : allNodes
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 30);

    const snippet = baseNodes.map((n, i) => {
      const base = (n.ocrText || n.content || '').replace(/\s+/g, ' ').slice(0, 180);
      const tags = n.tags?.length ? ` [tags: ${n.tags.join(', ')}]` : '';
      return `[${i + 1}] (${n.type}) ${base}${tags}`;
    }).join('\n');

    return {
      contextSnippet: snippet,
      contextCount: baseNodes.length,
      isSelectedContext: selected.length > 0,
      hasPinnedContext: false
    };
  }, [store.nodes, pinnedNodes]);

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
