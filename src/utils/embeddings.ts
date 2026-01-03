// src/utils/embeddings.ts
import OpenAI from 'openai';
import type { MindNode } from '../types/types';
import { getImageText } from './imageRefs';
import { openaiLimiter } from './rateLimiter';
import { logTokenEstimate, logUsage } from './tokenLogging';

/**
 * Generate embedding vector for a node's content
 * Uses OpenAI's text-embedding-3-small model (1536 dimensions)
 */
export const generateEmbedding = async (
  content: string,
  apiKey: string
): Promise<number[]> => {
  if (!apiKey) throw new Error('OpenAI API key saknas');
  
  try {
    // Use rate limiter to prevent API overload
    return await openaiLimiter.enqueue(async () => {
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      
      logTokenEstimate('openai embeddings', [{ label: 'input', text: content }]);
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content,
        encoding_format: 'float',
      });
      
      logUsage('openai embeddings', (response as { usage?: unknown }).usage);
      return response.data[0].embedding;
    });
  } catch (error) {
    console.error('Embedding Error:', error);
    throw new Error('Kunde inte generera embedding');
  }
};

/**
 * Generate embeddings for multiple texts in a single request
 */
export const generateEmbeddingsBatch = async (
  contents: string[],
  apiKey: string
): Promise<number[][]> => {
  if (!apiKey) throw new Error('OpenAI API key saknas');
  if (contents.length === 0) return [];

  try {
    return await openaiLimiter.enqueue(async () => {
      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

      logTokenEstimate(
        'openai embeddings batch',
        contents.map((text, index) => ({ label: `item ${index + 1}`, text })),
        { logDetails: false }
      );
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: contents,
        encoding_format: 'float',
      });

      logUsage('openai embeddings batch', (response as { usage?: unknown }).usage);
      return response.data.map(item => item.embedding);
    });
  } catch (error) {
    console.error('Embedding Batch Error:', error);
    throw new Error('Kunde inte generera embeddings');
  }
};

const getEmbeddingText = (node: MindNode): string => {
  let textToEmbed = '';

  switch (node.type) {
    case 'text':
      textToEmbed = node.content;
      break;

    case 'image':
      // Prioritera OCR-text, annars anvand kommentar
      textToEmbed = getImageText(node);
      if (!textToEmbed) {
        throw new Error('Bilden saknar text (kor OCR forst)');
      }
      break;

    case 'zotero': {
      // Extrahera text fran HTML (enkel version)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = node.content;
      textToEmbed = tempDiv.textContent || tempDiv.innerText || '';
      break;
    }
  }

  // Lagg till taggar for battre kontext
  if (node.tags.length > 0) {
    textToEmbed += '\n\nTaggar: ' + node.tags.join(', ');
  }

  if (!textToEmbed.trim()) {
    throw new Error('Inget innehall att skapa embedding fran');
  }

  return textToEmbed;
};

/**
 * Generate embeddings for a node based on its type
 * - text: uses content directly
 * - image: uses ocrText if available, otherwise comment
 * - zotero: extracts text from HTML
 */
export const generateNodeEmbedding = async (
  node: MindNode,
  apiKey: string
): Promise<number[]> => {
  const textToEmbed = getEmbeddingText(node);
  return generateEmbedding(textToEmbed, apiKey);
};

/**
 * Calculate cosine similarity between two embedding vectors
 * Returns a value between 0 (completely different) and 1 (identical)
 */
export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) {
    throw new Error('Vektorer måste ha samma längd');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) return 0;
  
  return dotProduct / (normA * normB);
};

/**
 * Find semantically similar nodes
 * Returns array of [nodeId, similarity] pairs sorted by similarity (highest first)
 */
export const findSimilarNodes = (
  targetNode: MindNode,
  allNodes: MindNode[],
  threshold: number = 0.75
): Array<{ nodeId: string; similarity: number }> => {
  if (!targetNode.embedding) {
    return [];
  }
  
  const similarities: Array<{ nodeId: string; similarity: number }> = [];
  
  for (const node of allNodes) {
    // Skip själva noden och noder utan embeddings
    if (node.id === targetNode.id || !node.embedding) {
      continue;
    }
    
    const similarity = cosineSimilarity(targetNode.embedding, node.embedding);
    
    if (similarity >= threshold) {
      similarities.push({ nodeId: node.id, similarity });
    }
  }
  
  // Sortera efter likhet (högst först)
  return similarities.sort((a, b) => b.similarity - a.similarity);
};

/**
 * Calculate average embedding from multiple nodes
 * Used for finding nodes similar to a group of nodes
 */
export const averageEmbedding = (nodes: MindNode[]): number[] | null => {
  const nodesWithEmbeddings = nodes.filter(n => n.embedding);
  if (nodesWithEmbeddings.length === 0) return null;

  const dims = nodesWithEmbeddings[0].embedding!.length;
  const avg = new Array(dims).fill(0);

  for (const node of nodesWithEmbeddings) {
    for (let i = 0; i < dims; i++) {
      avg[i] += node.embedding![i];
    }
  }

  for (let i = 0; i < dims; i++) {
    avg[i] /= nodesWithEmbeddings.length;
  }

  return avg;
};

/**
 * Find nodes similar to a group of nodes (using average embedding)
 */
export const findNodesSimilarToGroup = (
  selectedNodes: MindNode[],
  allNodes: MindNode[],
  threshold: number = 0.6
): Array<{ nodeId: string; similarity: number }> => {
  const avgEmb = averageEmbedding(selectedNodes);
  if (!avgEmb) return [];

  const selectedIds = new Set(selectedNodes.map(n => n.id));
  const similarities: Array<{ nodeId: string; similarity: number }> = [];

  for (const node of allNodes) {
    // Skip markerade noder och noder utan embeddings
    if (selectedIds.has(node.id) || !node.embedding) {
      continue;
    }

    const similarity = cosineSimilarity(avgEmb, node.embedding);

    if (similarity >= threshold) {
      similarities.push({ nodeId: node.id, similarity });
    }
  }

  return similarities.sort((a, b) => b.similarity - a.similarity);
};

/**
 * Batch generate embeddings for multiple nodes
 * Returns a map of nodeId -> embedding
 */
export const batchGenerateEmbeddings = async (
  nodes: MindNode[],
  apiKey: string,
  onProgress?: (current: number, total: number) => void
): Promise<Map<string, number[]>> => {
  const embeddings = new Map<string, number[]>();
  const total = nodes.length;
  let processedCount = 0;
  const batchSize = 20;
  const batchInputs: Array<{ nodeId: string; text: string }> = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    try {
      const textToEmbed = getEmbeddingText(node);
      batchInputs.push({ nodeId: node.id, text: textToEmbed });
    } catch (error) {
      console.warn(`Kunde inte skapa embedding for nod ${node.id}:`, error);
      processedCount += 1;
      if (onProgress) {
        onProgress(processedCount, total);
      }
    }
  }

  for (let i = 0; i < batchInputs.length; i += batchSize) {
    const batch = batchInputs.slice(i, i + batchSize);

    try {
      const batchEmbeddings = await generateEmbeddingsBatch(
        batch.map(item => item.text),
        apiKey
      );

      batchEmbeddings.forEach((embedding, idx) => {
        const nodeId = batch[idx]?.nodeId;
        if (nodeId) {
          embeddings.set(nodeId, embedding);
        }
      });
    } catch (error) {
      console.warn('Batch-embedding misslyckades, forsoker individuellt:', error);
      for (const item of batch) {
        try {
          const embedding = await generateEmbedding(item.text, apiKey);
          embeddings.set(item.nodeId, embedding);
        } catch (innerError) {
          console.warn(`Kunde inte skapa embedding for nod ${item.nodeId}:`, innerError);
        }
      }
    }

    processedCount += batch.length;
    if (onProgress) {
      onProgress(processedCount, total);
    }
  }

  return embeddings;
};


