// hooks/useAIPanelActions.ts
// Hanterar alla AI-panel actions och state

import { useState, useCallback, useMemo } from 'react';
import { useIntelligence } from './useIntelligence';
import { useBrainStore } from '../store/useBrainStore';
import type { MindNode } from '../types/types';
import { getAIPanelScope } from '../utils/aiPanelScope';

export function useAIPanelActions() {
  const nodes = useBrainStore((state) => state.nodes);
  const sessions = useBrainStore((state) => state.sessions);
  const activeSessionId = useBrainStore((state) => state.activeSessionId);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const synapses = useBrainStore((state) => state.synapses);
  const openaiKey = useBrainStore((state) => state.openaiKey);
  const claudeKey = useBrainStore((state) => state.claudeKey);
  const enableAutoLink = useBrainStore((state) => state.enableAutoLink);
  const toggleAutoLink = useBrainStore((state) => state.toggleAutoLink);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const intelligence = useIntelligence();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MindNode[]>([]);
  const [clusterInsight, setClusterInsight] = useState<string | null>(null);
  const [showReflection, setShowReflection] = useState(false);
  const [status, setStatus] = useState<{ text: string; tone: 'info' | 'success' | 'warn' | 'error' } | null>(null);

  const notify = (text: string, tone: 'info' | 'success' | 'warn' | 'error' = 'info') => {
    setStatus({ text, tone });
  };

  const scope = useMemo(() => getAIPanelScope({
    nodes,
    sessions,
    activeSessionId,
    selectedNodeIds,
    synapses,
  }), [nodes, sessions, activeSessionId, selectedNodeIds, synapses]);

  const selectedCount = scope.selectedCount;
  const embeddedCount = scope.embeddedCount;
  const totalCount = scope.totalCount;

  const handleEmbedAll = useCallback(async () => {
    if (!openaiKey) {
      notify('OpenAI API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    try {
      const count = await intelligence.embedAllNodes(scope.nodeIds);
      if (count > 0) {
        notify(`Skapade embeddings för ${count} noder!`, 'success');

        // Aktivera auto-länkning och länka alla efter vektorisering
        if (!enableAutoLink) {
          toggleAutoLink(); // Aktivera för nya kort
        }
        const links = await intelligence.autoLinkSimilarNodes(undefined, scope.nodeIds);
        if (links > 0) {
          notify(`Skapade ${links} kopplingar!`, 'success');
        }
      }
    } catch (error) {
      console.error('Fel vid skapande av embeddings', error);
      notify(`Fel vid skapande av embeddings: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [openaiKey, enableAutoLink, toggleAutoLink, intelligence, scope.nodeIds]);

  const handleAutoLink = useCallback(async () => {
    if (embeddedCount < 2) {
      notify('Behöver minst 2 noder med embeddings för att länka!', 'warn');
      return;
    }

    try {
      const links = await intelligence.autoLinkSimilarNodes(undefined, scope.nodeIds);
      if (links > 0) {
        notify(`Skapade ${links} nya länkar mellan liknande noder!`, 'success');
      } else {
        notify('Inga nya länkar hittades. Prova att sänka tröskelvärdet i inställningarna.', 'info');
      }
    } catch (error) {
      console.error('Fel vid automatisk länkning', error);
      notify(`Fel vid automatisk länkning: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [embeddedCount, intelligence, scope.nodeIds]);

  const handleReflect = useCallback(async () => {
    if (!claudeKey) {
      notify('Claude API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    if (totalCount === 0) {
      notify('Inga noder att reflektera över!', 'info');
      return;
    }

    try {
      const reflection = await intelligence.reflect(scope.nodeIds);
      if (reflection) {
        setShowReflection(true);
      }
    } catch (error) {
      console.error('Fel vid reflektion', error);
      notify(`Fel vid reflektion: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [claudeKey, totalCount, intelligence, scope.nodeIds]);

  const handleAnalyzeCluster = useCallback(async () => {
    if (!claudeKey) {
      notify('Claude API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    if (selectedCount < 2) {
      notify('Välj minst 2 noder för att analysera ett kluster!', 'info');
      return;
    }

    try {
      const insight = await intelligence.analyzeSelectedCluster(scope.nodeIds);
      if (insight) {
        setClusterInsight(insight);
      }
    } catch (error) {
      console.error('Fel vid klusteranalys', error);
      notify(`Fel vid klusteranalys: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [claudeKey, selectedCount, intelligence, scope.nodeIds]);

  const handleSearch = useCallback(async () => {
    if (!openaiKey) {
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
      const results = await intelligence.semanticSearch(searchQuery, scope.nodeIds);
      setSearchResults(results);

      if (results.length > 0) {
        clearSelection();
        results.forEach(node => {
          toggleSelection(node.id, true);
        });
      } else {
        notify('Inga resultat hittades. Prova en annan sökfråga.', 'info');
      }
    } catch (error) {
      console.error('Fel vid sökning', error);
      notify(`Fel vid sökning: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [openaiKey, searchQuery, embeddedCount, intelligence, clearSelection, toggleSelection, scope.nodeIds]);

  const handleGenerateTags = useCallback(async () => {
    if (!claudeKey) {
      notify('Claude API-nyckel saknas! Lägg till den i menyn först.', 'warn');
      return;
    }

    const selectedNodes = scope.selectedNodes as MindNode[];
    if (selectedNodes.length === 0) {
      notify('Välj minst en nod först!', 'info');
      return;
    }

    try {
      const { totalTags } = await intelligence.generateTagsForSelection(undefined, scope.nodeIds);
      if (totalTags > 0) {
        notify(`Genererade ${totalTags} semantiska taggar!`, 'success');
      } else {
        notify('Inga taggar kunde genereras. Kontrollera att noderna har innehåll.', 'info');
      }
    } catch (error) {
      console.error('Fel vid generering av taggar', error);
      notify(`Fel vid generering av taggar: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error');
    }
  }, [claudeKey, scope.selectedNodes, scope.nodeIds, intelligence]);

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
    scopedSynapses: scope.synapses,
    scopeNodeIds: scope.nodeIds,

    // Handlers
    handleEmbedAll,
    handleAutoLink,
    handleReflect,
    handleAnalyzeCluster,
    handleSearch,
    handleGenerateTags,

    // Intelligence state
    intelligence,
  };
}


