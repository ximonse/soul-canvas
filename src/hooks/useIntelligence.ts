// src/hooks/useIntelligence.ts
import { useState, useCallback } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import {
  generateNodeEmbedding,
  findSimilarNodes,
  batchGenerateEmbeddings,
  generateEmbedding,
  findNodesSimilarToGroup,
} from '../utils/embeddings';
import { calculateConnectedNodesLayout } from '../utils/forceLayout';
import { 
  generateReflection, 
  generateSemanticTags, 
  analyzeCluster, 
  generateNodeSummaryComment, 
  generateNodeTitle 
} from '../utils/claude';
import { GRAVITY } from '../utils/constants';
import type { MindNode, AIReflection, Synapse } from '../types/types';

const isCopyNode = (node?: MindNode | null) => Boolean(node?.copyRef);

export const useIntelligence = () => {
  const nodes = useBrainStore((state) => state.nodes);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const openaiKey = useBrainStore((state) => state.openaiKey);
  const claudeKey = useBrainStore((state) => state.claudeKey);
  const updateNode = useBrainStore((state) => state.updateNode);
  const updateNodesBulk = useBrainStore((state) => state.updateNodesBulk);
  const setNodeTagging = useBrainStore((state) => state.setNodeTagging);
  const setNodeAIProcessing = useBrainStore((state) => state.setNodeAIProcessing);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastReflection, setLastReflection] = useState<AIReflection | null>(null);

  const resolveTargets = useCallback((nodeId?: string): MindNode[] => {
    const currentState = useBrainStore.getState();
    const selected = Array.from(currentState.selectedNodeIds)
      .map(id => currentState.nodes.get(id))
      .filter(Boolean) as MindNode[];
    if (selected.length > 0) return selected;
    if (nodeId) {
      const node = currentState.nodes.get(nodeId);
      return node ? [node] : [];
    }
    return [];
  }, []);

  const tagSingleNode = useCallback(async (node: MindNode, key: string): Promise<{ practical: string[]; hidden: string[] }> => {
    try {
      setNodeAIProcessing(node.id, 'claude');
      setNodeTagging(node.id, true);
      const result = await generateSemanticTags(node, key);

      const existingTags = node.tags || [];
      const newPracticalTags = result.practicalTags.filter(
        (tag: string) => !existingTags.some((existing: string) => existing.toLowerCase() === tag.toLowerCase())
      );
      const mergedTags = [...existingTags, ...newPracticalTags];

      updateNode(node.id, {
        tags: mergedTags,
        semanticTags: result.hiddenTags,
      });

      return { practical: result.practicalTags, hidden: result.hiddenTags };
    } catch (error) {
      console.error('Tag generation error:', error);
      return { practical: [], hidden: [] };
    } finally {
      setNodeTagging(node.id, false);
      setNodeAIProcessing(node.id, null);
    }
  }, [setNodeAIProcessing, setNodeTagging, updateNode]);

  /**
   * Generate embedding for a single node
   */
  const embedNode = useCallback(async (nodeId: string): Promise<boolean> => {
    const node = nodes.get(nodeId);
    if (!node || !openaiKey || isCopyNode(node)) return false;

    try {
      setIsProcessing(true);
      const embedding = await generateNodeEmbedding(node, openaiKey);
      
      updateNode(nodeId, {
        embedding,
        lastEmbedded: new Date().toISOString(),
      });
      
      return true;
    } catch (error) {
      console.error('Embedding error:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [nodes, openaiKey, updateNode]);

  /**
   * Generate embeddings for all nodes that don't have them
   */
  const embedAllNodes = useCallback(async (): Promise<number> => {
    if (!openaiKey) return 0;

    const nodesToEmbed = (Array.from(nodes.values()) as MindNode[]).filter(
      (n: MindNode) => !n.embedding && !isCopyNode(n),
    );
    if (nodesToEmbed.length === 0) return 0;

    try {
      setIsProcessing(true);
      setProgress({ current: 0, total: nodesToEmbed.length });

      const embeddings = await batchGenerateEmbeddings(
        nodesToEmbed as MindNode[],
        openaiKey,
        (current, total) => setProgress({ current, total })
      );

      const now = new Date().toISOString();
      const updates = Array.from(embeddings.entries()).map(([nodeId, embedding]) => ({
        id: nodeId,
        updates: {
          embedding,
          lastEmbedded: now,
          updatedAt: now,
        },
      }));
      updateNodesBulk(updates);

      return embeddings.size;
    } catch (error) {
      console.error('Batch embedding error:', error);
      return 0;
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
    }
  }, [nodes, openaiKey, updateNodesBulk]);

  /**
   * Find and create links between semantically similar nodes
   */
  const autoLinkSimilarNodes = useCallback(async (nodeId?: string): Promise<number> => {
    // Use fresh state to avoid stale closures
    const currentState = useBrainStore.getState();
    if (!currentState.enableAutoLink) return 0;

    // Prevent concurrent execution
    if (isProcessing) return 0;

    const threshold = currentState.autoLinkThreshold || 0.75;
    const allNodes = (Array.from(currentState.nodes.values()) as MindNode[])
      .filter((n: MindNode) => !isCopyNode(n));
    const nodesToCheck: MindNode[] = nodeId
      ? [currentState.nodes.get(nodeId)].filter(Boolean).filter((n) => !isCopyNode(n)) as MindNode[]
      : allNodes.filter((n: MindNode) => n.embedding);

    let linksCreated = 0;

    setIsProcessing(true);
    try {
      for (const node of nodesToCheck) {
        if (!node.embedding) continue;

        const similarNodes = findSimilarNodes(node as MindNode, allNodes as MindNode[], threshold);

        for (const { nodeId: targetId, similarity } of similarNodes) {
          // Get fresh synapses state to check for existing links
          const freshState = useBrainStore.getState();
          const linkExists = freshState.synapses.some(
            (s: Synapse) => (s.sourceId === node.id && s.targetId === targetId) ||
                 (s.sourceId === targetId && s.targetId === node.id)
          );

          if (!linkExists) {
            // Pass metadata directly to addSynapse - no race condition
            freshState.addSynapse(node.id, targetId, {
              autoGenerated: true,
              similarity
            });
            linksCreated++;
          }
        }
      }
    } finally {
      setIsProcessing(false);
    }

    return linksCreated;
  }, [isProcessing]);

  /**
   * Generate both practical and hidden tags for a node using Claude
   * Practical tags merge with existing tags, hidden tags replace semanticTags
   */
  const generateTags = useCallback(async (nodeId: string): Promise<{ practical: string[]; hidden: string[] }> => {
    const node = nodes.get(nodeId);
    if (!node || !claudeKey) return { practical: [], hidden: [] };

    try {
      setIsProcessing(true);
      return await tagSingleNode(node, claudeKey);
    } finally {
      setIsProcessing(false);
    }
  }, [nodes, claudeKey, tagSingleNode]);

  const generateTagsForSelection = useCallback(async (nodeId?: string): Promise<{ processed: number; totalTags: number }> => {
    const currentState = useBrainStore.getState();
    const key = currentState.claudeKey;
    if (!key) return { processed: 0, totalTags: 0 };

    const targets = resolveTargets(nodeId);
    if (targets.length === 0) return { processed: 0, totalTags: 0 };

    let processed = 0;
    let totalTags = 0;
    setIsProcessing(true);
    try {
      for (const node of targets) {
        const result = await tagSingleNode(node, key);
        totalTags += result.practical.length + result.hidden.length;
        processed += 1;
      }
    } finally {
      setIsProcessing(false);
    }

    return { processed, totalTags };
  }, [resolveTargets, tagSingleNode]);

  /**
   * Generate a short summary and write to node.comment
   */
  const summarizeToComment = useCallback(async (nodeId?: string): Promise<number> => {
    const currentState = useBrainStore.getState();
    const key = currentState.claudeKey;
    if (!key) return 0;

    const targets = resolveTargets(nodeId);
    if (targets.length === 0) return 0;

    currentState.saveStateForUndo?.();
    let updated = 0;
    setIsProcessing(true);
    try {
      for (const node of targets as MindNode[]) {
        currentState.setNodeAIProcessing(node.id, 'claude');
        try {
          const summary = await generateNodeSummaryComment(node as MindNode, key);
          if (summary) {
            currentState.updateNode(node.id, { comment: summary });
            updated++;
          }
        } finally {
          currentState.setNodeAIProcessing(node.id, null);
        }
      }
      return updated;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Generate a concise title for nodes
   */
  const suggestTitle = useCallback(async (nodeId?: string): Promise<number> => {
    const currentState = useBrainStore.getState();
    const key = currentState.claudeKey;
    if (!key) return 0;

    const targets = resolveTargets(nodeId);
    if (targets.length === 0) return 0;

    currentState.saveStateForUndo?.();
    let updated = 0;
    setIsProcessing(true);
    try {
      for (const node of targets as MindNode[]) {
        currentState.setNodeAIProcessing(node.id, 'claude');
        try {
          const title = await generateNodeTitle(node as MindNode, key);
          if (title) {
            currentState.updateNode(node.id, { title });
            updated++;
          }
        } finally {
          currentState.setNodeAIProcessing(node.id, null);
        }
      }
      return updated;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Generate a reflective question based on selected or all nodes
   */
  const reflect = useCallback(async (): Promise<AIReflection | null> => {
    if (!claudeKey) return null;

    const selectedNodes = Array.from(selectedNodeIds)
      .map(id => nodes.get(id))
      .filter(Boolean) as MindNode[];
    const nodesToAnalyze: MindNode[] = selectedNodes.length > 0 ? selectedNodes : Array.from(nodes.values()) as MindNode[];

    if (nodesToAnalyze.length === 0) return null;

    try {
      setIsProcessing(true);
      const reflection = await generateReflection(nodesToAnalyze as MindNode[], claudeKey);
      setLastReflection(reflection);
      return reflection;
    } catch (error) {
      console.error('Reflection error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [claudeKey, selectedNodeIds, nodes]);

  /**
   * Analyze a cluster of connected nodes
   */
  const analyzeSelectedCluster = useCallback(async (): Promise<string | null> => {
    if (!claudeKey) return null;

    const selectedNodes = Array.from(selectedNodeIds)
      .map(id => nodes.get(id))
      .filter(Boolean) as MindNode[];
    if (selectedNodes.length < 2) return null;

    try {
      setIsProcessing(true);
      const insight = await analyzeCluster(selectedNodes as MindNode[], claudeKey);
      return insight;
    } catch (error) {
      console.error('Cluster analysis error:', error);
      return null;
    } finally {
      setIsProcessing(false);
    }
  }, [claudeKey, selectedNodeIds, nodes]);

  /**
   * Search nodes by semantic similarity to a query
   */
  const semanticSearch = useCallback(async (query: string): Promise<MindNode[]> => {
    if (!openaiKey) return [];

    if (!query.trim()) return [];

    try {
      setIsProcessing(true);
      
      // Generate embedding for the search query
      const queryEmbedding = await generateEmbedding(query, openaiKey);

      // Create a dummy MindNode for the query
      const queryMindNode: MindNode = {
        id: 'search-query',
        content: query,
        x: 0, y: 0, z: 0,
        tags: [],
        createdAt: new Date().toISOString(),
        type: 'text',
        embedding: queryEmbedding,
      };

      // Find similar nodes
      const nodesWithEmbeddings = (Array.from(nodes.values()) as MindNode[])
        .filter((n: MindNode) => n.embedding && !isCopyNode(n));

      const results = findSimilarNodes(queryMindNode, nodesWithEmbeddings as MindNode[], 0); // Find similar nodes

      return results
        .filter(r => r.similarity > 0.5) // Threshold for search
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 10) // Top 10 results
        .map(r => nodes.get(r.nodeId)!); // Map back to MindNode objects

    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    } finally {
      setIsProcessing(false);
    }
  }, [openaiKey, nodes]);

  /**
   * Attract similar nodes to the selected nodes
   * Moves similar nodes closer to form a cluster
   */
  const attractSimilarNodes = useCallback((): number => {
    const currentState = useBrainStore.getState();
    const allNodes = (Array.from(currentState.nodes.values()) as MindNode[])
      .filter((n: MindNode) => !isCopyNode(n));
    const selectedNodes = Array.from(currentState.selectedNodeIds)
      .map(id => currentState.nodes.get(id))
      .filter(Boolean) as MindNode[];

    if (selectedNodes.length === 0) return 0;

    // Hitta liknande noder
    const threshold = currentState.autoLinkThreshold || 0.6;
    const similarResults = findNodesSimilarToGroup(selectedNodes as MindNode[], allNodes as MindNode[], threshold);

    if (similarResults.length === 0) return 0;

    // Beräkna centroid av markerade kort
    const centerX = selectedNodes.reduce((sum: number, n: MindNode) => sum + n.x, 0) / selectedNodes.length;
    const centerY = selectedNodes.reduce((sum: number, n: MindNode) => sum + n.y, 0) / selectedNodes.length;

    // Flytta liknande kort i en cirkel runt centroiden
    const positions = new Map<string, { x: number; y: number }>();
    const radius = 250; // Bas-radie
    const angleStep = (2 * Math.PI) / Math.max(similarResults.length, 1);

    similarResults.forEach((result, index) => {
      const node = currentState.nodes.get(result.nodeId);
      if (!node || node.pinned) return; // Hoppa över pinnade kort

      const angle = angleStep * index - Math.PI / 2; // Starta från toppen
      const distance = radius + (1 - result.similarity) * 200; // Mer lika = närmare

      positions.set(result.nodeId, {
        x: centerX + Math.cos(angle) * distance,
        y: centerY + Math.sin(angle) * distance,
      });
    });

    // Uppdatera positioner
    if (positions.size > 0) {
      currentState.updateNodePositions(positions);
    }

    return positions.size;
  }, []);

  /**
   * Arrange nodes as a force-directed graph based on their connections
   */
  const arrangeAsGraph = useCallback((centerX?: number, centerY?: number, gravity?: number): number => {
    const currentState = useBrainStore.getState();
    const allNodes = (Array.from(currentState.nodes.values()) as MindNode[])
      .filter((n: MindNode) => !isCopyNode(n));

    if (currentState.synapses.length === 0) return 0;
    if (allNodes.length === 0) return 0;

    // Beräkna center om inte angivet
    const cx = centerX ?? allNodes.reduce((sum: number, n: MindNode) => sum + n.x, 0) / allNodes.length;
    const cy = centerY ?? allNodes.reduce((sum: number, n: MindNode) => sum + n.y, 0) / allNodes.length;

    // Använd angiven gravity eller från store
    const g = Math.max(GRAVITY.MIN, Math.min(GRAVITY.MAX, gravity ?? currentState.graphGravity));

    const visibleSynapses = currentState.synapses.filter((s: Synapse) => {
      if ((s.similarity || 1) < currentState.synapseVisibilityThreshold) return false;
      const sourceNode = currentState.nodes.get(s.sourceId);
      const targetNode = currentState.nodes.get(s.targetId);
      return !isCopyNode(sourceNode) && !isCopyNode(targetNode);
    });
    if (visibleSynapses.length === 0) return 0;

    const positions = calculateConnectedNodesLayout(
      allNodes as MindNode[],
      visibleSynapses,
      { centerX: cx, centerY: cy, iterations: 300, gravity: g }
    );

    if (positions.size > 0) {
      currentState.updateNodePositions(positions);
    }

    return positions.size;
  }, []);

  return {
    // State
    isProcessing,
    progress,
    lastReflection,

    // Actions
    embedNode,
    embedAllNodes,
    autoLinkSimilarNodes,
    generateTags,
    generateTagsForSelection,
    summarizeToComment,
    suggestTitle,
    reflect,
    analyzeSelectedCluster,
    semanticSearch,
    attractSimilarNodes,
    arrangeAsGraph,
  };
};
