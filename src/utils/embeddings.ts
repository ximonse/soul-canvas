// src/utils/embeddings.ts
import OpenAI from 'openai';
import type { MindNode } from '../types/types';
import { getImageText } from './imageRefs';
import { openaiLimiter } from './rateLimiter';

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
      
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: content,
        encoding_format: 'float',
      });
      
      return response.data[0].embedding;
    });
  } catch (error) {
    console.error('Embedding Error:', error);
    throw new Error('Kunde inte generera embedding');
  }
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
  let textToEmbed = '';
  
  switch (node.type) {
    case 'text':
      textToEmbed = node.content;
      break;
      
    case 'image':
      // Prioritera OCR-text, annars använd kommentar
      textToEmbed = getImageText(node);
      if (!textToEmbed) {
        throw new Error('Bilden saknar text (kör OCR först)');
      }
      break;
      
    case 'zotero':
      // Extrahera text från HTML (enkel version)
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = node.content;
      textToEmbed = tempDiv.textContent || tempDiv.innerText || '';
      break;
  }
  
  // Lägg till taggar för bättre kontext
  if (node.tags.length > 0) {
    textToEmbed += '\n\nTaggar: ' + node.tags.join(', ');
  }
  
  if (!textToEmbed.trim()) {
    throw new Error('Inget innehåll att skapa embedding från');
  }
  
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
  
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    
    try {
      const embedding = await generateNodeEmbedding(node, apiKey);
      embeddings.set(node.id, embedding);
      
      if (onProgress) {
        onProgress(i + 1, nodes.length);
      }
      
      // Rate limiter handles delays automatically
    } catch (error) {
      console.warn(`Kunde inte skapa embedding för nod ${node.id}:`, error);
      // Fortsätt med nästa nod
    }
  }
  
  return embeddings;
};
