// hooks/useAIPanelActions.ts
// Hanterar alla AI-panel actions och state

import { useState, useCallback } from 'react';
import { useIntelligence } from './useIntelligence';
import { useBrainStore } from '../store/useBrainStore';
import type { MindNode } from '../types/types';

export function useAIPanelActions() {
  const store = useBrainStore();
  const intelligence = useIntelligence();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MindNode[]>([]);
  const [clusterInsight, setClusterInsight] = useState<string | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: 'info' | 'success' | 'warn' | 'error' } | null>(null);

  const notify = (text: string, tone: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setStatus({ text, tone });
  };

  // Counts
  const selectedCount = (Array.from(store.nodes.values()) as MindNode[]).filter((n: MindNode) => n.selected).length;
  const embeddedCount = (Array.from(store.nodes.values()) as MindNode[]).filter((n: MindNode) => n.embedding).length;
  const totalCount = store.nodes.size;

  const handleEmbedAll = useCallback(async () => {
    if (!store.openaiKey) {
      notify('OpenAI API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    try {
      const count = await intelligence.embedAllNodes();
      if (count > 0) {
        notify(`Skapade embeddings för ${count} noder!`, 'success');

        if (store.enableAutoLink) {
          const links = await intelligence.autoLinkSimilarNodes();
          if (links > 0) {
            notify(`Skapade ${links} automatiska länkar!`, 'success');
          }
        }
      }
    } catch (error) {
      console.error('Fel vid skapande av embeddings', error);
      notify(`Fel vid skapande av embeddings: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [store.openaiKey, store.enableAutoLink, intelligence]);

  const handleAutoLink = useCallback(async () => {
    if (embeddedCount < 2) {
      notify('Behöver minst 2 noder med embeddings för att länka!', 'warn');
      return;
    }

    try {
      const links = await intelligence.autoLinkSimilarNodes();
      if (links > 0) {
        notify(`Skapade ${links} nya länkar mellan liknande noder!`, 'success');
      } else {
        notify('Inga nya länkar hittades. Prova att sänka tröskelvärdet i inställningarna.', 'info');
      }
    } catch (error) {
      console.error('Fel vid automatisk länkning', error);
      notify(`Fel vid automatisk länkning: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [embeddedCount, intelligence]);

  const handleReflect = useCallback(async () => {
    if (!store.claudeKey) {
      notify('Claude API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    if (totalCount === 0) {
      notify('Inga noder att reflektera över!', 'info');
      return;
    }

    try {
      const reflection = await intelligence.reflect();
      if (reflection) {
        setShowReflection(true);
      }
    } catch (error) {
      console.error('Fel vid reflektion', error);
      notify(`Fel vid reflektion: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [store.claudeKey, totalCount, intelligence]);

  const handleAnalyzeCluster = useCallback(async () => {
    if (!store.claudeKey) {
      notify('Claude API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    if (selectedCount < 2) {
      notify('Välj minst 2 noder för att analysera ett kluster!', 'info');
      return;
    }

    try {
      const insight = await intelligence.analyzeSelectedCluster();
      if (insight) {
        setClusterInsight(insight);
      }
    } catch (error) {
      console.error('Fel vid klusteranalys', error);
      notify(`Fel vid klusteranalys: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [store.claudeKey, selectedCount, intelligence]);

  const handleSearch = useCallback(async () => {
    if (!store.openaiKey) {
      notify('OpenAI API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    if (!searchQuery.trim()) {
      notify('Skriv in en sökfråga först!', 'info');
      return;
    }

    if (embeddedCount === 0) {
      notify('Inga noder har embeddings än! Skapa embeddings först.', 'info');
      return;
    }

    try {
      const results = await intelligence.semanticSearch(searchQuery);
      setSearchResults(results);

      if (results.length > 0) {
        store.clearSelection();
        results.forEach(node => {
          store.toggleSelection(node.id, true);
        });
      } else {
        notify('Inga resultat hittades. Prova en annan sökfråga.', 'info');
      }
    } catch (error) {
      console.error('Fel vid sökning', error);
      notify(`Fel vid sökning: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [store, searchQuery, embeddedCount, intelligence]);

  const handleGenerateTags = useCallback(async () => {
    if (!store.claudeKey) {
      notify('Claude API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    const selectedNodes = (Array.from(store.nodes.values()) as MindNode[]).filter((n: MindNode) => n.selected);
    if (selectedNodes.length === 0) {
      notify('Välj minst en nod först!', 'info');
      return;
    }

    try {
      let totalTags = 0;
      for (const node of selectedNodes as MindNode[]) {
        const tags = await intelligence.generateTags(node.id);
        totalTags += tags.practical.length + tags.hidden.length;
      }

      if (totalTags > 0) {
        notify(`Genererade ${totalTags} semantiska taggar!`, 'success');
      } else {
        notify('Inga taggar kunde genereras. Kontrollera att noderna har innehåll.', 'info');
      }
    } catch (error) {
      console.error('Fel vid generering av taggar', error);
      notify(`Fel vid generering av taggar: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [store, intelligence]);

  return {
    // State
    searchQuery,
    setSearchQuery,
    searchResults,
    clusterInsight,
    showReflection,
    setShowReflection,
    status,

    // Counts
    selectedCount,
    embeddedCount,
    totalCount,

    // Handlers
    handleEmbedAll,
    handleAutoLink,
    handleReflect,
    handleAnalyzeCluster,
    handleSearch,
    handleGenerateTags,

    // Intelligence state
    intelligence,
    store,
  };
}
