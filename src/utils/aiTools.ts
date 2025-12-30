// src/utils/aiTools.ts
// AI Chat Tool Definitions & Execution Layer
// Allows AI to perform canvas actions: search, select, arrange, tag, etc.

import type { MindNode } from '../types/types';

// ============================================
// TOOL RESULT TYPES
// ============================================

export interface ToolResult {
  success: boolean;
  message: string;
  data?: unknown;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

// ============================================
// PROTECTED FIELDS (AI cannot modify these)
// ============================================

const PROTECTED_FIELDS = new Set([
  'id',
  'createdAt',
  'copyRef',
  'copied',
  'copiedAt',
  'originalCreatedAt',
  'embedding',
  'lastEmbedded',
  'x', 'y', 'z',  // Position handled by arrange tools only
  'width', 'height',
  'type',
  'imageRef',
]);

// ============================================
// TOOL DEFINITIONS (Provider-agnostic schema)
// ============================================

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
    }>;
    required?: string[];
  };
}

export const AI_TOOLS: ToolDefinition[] = [
  {
    name: 'search_cards',
    description: 'Sök kort med naturligt språk. Matchar innehåll, taggar och datum. Returnerar matchande kort-IDs och titlar.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Sökfråga i naturligt språk, t.ex. "kort om reflektioner från igår" eller "alla kort med tagg forskning"',
        },
        limit: {
          type: 'number',
          description: 'Max antal resultat (default 20)',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'select_cards',
    description: 'Markera kort på canvas. Använd "set" för att ersätta nuvarande markering, "add" för att lägga till, "clear" för att avmarkera alla.',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['set', 'add', 'clear'],
          description: 'set=ersätt markering, add=lägg till, clear=avmarkera alla',
        },
        card_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista med kort-IDs att markera (krävs ej för "clear")',
        },
      },
      required: ['action'],
    },
  },
  {
    name: 'arrange_cards',
    description: 'Arrangera markerade kort i olika mönster.',
    parameters: {
      type: 'object',
      properties: {
        mode: {
          type: 'string',
          enum: ['vertical', 'horizontal', 'grid_v', 'grid_h', 'circle', 'kanban', 'centrality'],
          description: 'Arrangeringssätt: vertical/horizontal=rad/kolumn, grid_v/grid_h=rutnät, circle=cirkel, kanban=överlappande rader, centrality=mest kopplade i mitten',
        },
      },
      required: ['mode'],
    },
  },
  {
    name: 'add_tags',
    description: 'Lägg till taggar på markerade kort. Kan inte ta bort taggar.',
    parameters: {
      type: 'object',
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista med taggar att lägga till',
        },
      },
      required: ['tags'],
    },
  },
  {
    name: 'create_card',
    description: 'Skapa ett nytt kort.',
    parameters: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Kortets innehåll/text',
        },
        title: {
          type: 'string',
          description: 'Kortets rubrik (valfritt)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Taggar för kortet (valfritt)',
        },
      },
      required: ['content'],
    },
  },
  {
    name: 'update_cards',
    description: 'Uppdatera metadata på markerade kort. Kan ändra title, caption, comment, value. Kan INTE ta bort innehåll.',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Ny rubrik',
        },
        caption: {
          type: 'string',
          description: 'Ny caption (visas under kortet)',
        },
        comment: {
          type: 'string',
          description: 'Ny kommentar (visas vid hover)',
        },
        value: {
          type: 'number',
          description: 'Prioritet 1-6 (1=högst)',
        },
      },
    },
  },
  {
    name: 'pin_cards',
    description: 'Fäst eller lossa markerade kort på canvas.',
    parameters: {
      type: 'object',
      properties: {
        pin: {
          type: 'boolean',
          description: 'true=fäst, false=lossa',
        },
      },
      required: ['pin'],
    },
  },
  {
    name: 'focus_view',
    description: 'Zooma och panorera till markerade kort så de syns på skärmen.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

// ============================================
// CONVERT TO PROVIDER-SPECIFIC FORMATS
// ============================================

// Claude format
export function getClaudeTools() {
  return AI_TOOLS.map(tool => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

// OpenAI format
export function getOpenAITools() {
  return AI_TOOLS.map(tool => ({
    type: 'function' as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

// Gemini format
export function getGeminiTools() {
  return [{
    functionDeclarations: AI_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  }];
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

interface ParsedCard {
  id: string;
  title: string;
  content: string;
  tags: string[];
  date: string;
  relatedTo: string[];
}

// Parse ai-export file format into searchable cards
export function parseAIExport(exportContent: string): ParsedCard[] {
  const cards: ParsedCard[] = [];
  const sections = exportContent.split('\n---\n');

  for (const section of sections) {
    if (!section.trim() || section.includes('Kunskapssamling:')) continue;

    const lines = section.trim().split('\n');
    if (lines.length === 0) continue;

    // First line is title with date: "Title [YYYY-MM-DD]"
    const titleMatch = lines[0].match(/^(.+?)\s*\[(\d{4}-\d{2}-\d{2})\]/);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const date = titleMatch[2];

    // Extract content (everything before tags/relations)
    let content = '';
    let tags: string[] = [];
    let relatedTo: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('#')) {
        // Tags line
        tags = line.split(/\s+/).filter(t => t.startsWith('#')).map(t => t.slice(1));
      } else if (line.startsWith('Relaterar till:')) {
        relatedTo = line.replace('Relaterar till:', '').split(',').map(s => s.trim()).filter(Boolean);
      } else if (!line.startsWith('Anteckning:')) {
        content += line + '\n';
      }
    }

    // Generate a pseudo-ID from title (we'll need to match with real IDs later)
    const id = title.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 50);

    cards.push({
      id,
      title,
      content: content.trim(),
      tags,
      date,
      relatedTo,
    });
  }

  return cards;
}

// Search cards using natural language query
export function searchCards(
  query: string,
  nodes: Map<string, MindNode>,
  limit: number = 20
): { id: string; title: string; score: number }[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

  // Date patterns
  const yesterdayMatch = queryLower.includes('igår') || queryLower.includes('yesterday');
  const todayMatch = queryLower.includes('idag') || queryLower.includes('today');
  const weekMatch = queryLower.includes('vecka') || queryLower.includes('week');

  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const results: { id: string; title: string; score: number }[] = [];

  nodes.forEach((node, id) => {
    let score = 0;
    const nodeDate = new Date(node.createdAt);

    // Date matching
    if (yesterdayMatch && nodeDate.toDateString() === yesterday.toDateString()) {
      score += 10;
    }
    if (todayMatch && nodeDate.toDateString() === now.toDateString()) {
      score += 10;
    }
    if (weekMatch && nodeDate >= weekAgo) {
      score += 5;
    }

    // Content matching
    const contentLower = (node.content || '').toLowerCase();
    const titleLower = (node.title || '').toLowerCase();
    const tagsLower = (node.tags || []).map(t => t.toLowerCase());

    for (const word of queryWords) {
      if (contentLower.includes(word)) score += 2;
      if (titleLower.includes(word)) score += 5;
      if (tagsLower.some(t => t.includes(word))) score += 8;
    }

    // Tag exact match
    for (const tag of node.tags || []) {
      if (queryLower.includes(tag.toLowerCase())) {
        score += 10;
      }
    }

    if (score > 0) {
      results.push({
        id,
        title: node.title || node.content.slice(0, 50) + '...',
        score,
      });
    }
  });

  // Sort by score descending, take top results
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

// ============================================
// TOOL EXECUTION
// ============================================

export interface ToolExecutionContext {
  nodes: Map<string, MindNode>;
  selectedNodeIds: Set<string>;

  // Selection actions
  selectNodes: (ids: string[]) => void;
  setSelectedNodeIds: (ids: Set<string>) => void;

  // Node actions
  updateNode: (id: string, updates: Partial<MindNode>) => void;
  addNode: (content: string, x: number, y: number, type: 'text' | 'image' | 'zotero') => string;

  // Arrangement
  arrangeVertical: () => void;
  arrangeHorizontal: () => void;
  arrangeGridVertical: () => void;
  arrangeGridHorizontal: () => void;
  arrangeCircle: () => void;
  arrangeKanban: () => void;
  arrangeCentrality: () => void;

  // View
  centerOnNodes: (ids: string[]) => void;
  saveStateForUndo: () => void;
}

export function executeAITool(
  toolCall: ToolCall,
  context: ToolExecutionContext
): ToolResult {
  const { name, input } = toolCall;

  try {
    switch (name) {
      case 'search_cards': {
        const query = input.query as string;
        const limit = (input.limit as number) || 20;
        const results = searchCards(query, context.nodes, limit);

        if (results.length === 0) {
          return {
            success: true,
            message: `Inga kort matchade "${query}"`,
            data: { results: [] },
          };
        }

        return {
          success: true,
          message: `Hittade ${results.length} kort`,
          data: { results },
        };
      }

      case 'select_cards': {
        const action = input.action as 'set' | 'add' | 'clear';
        const cardIds = (input.card_ids as string[]) || [];

        if (action === 'clear') {
          context.setSelectedNodeIds(new Set());
          return { success: true, message: 'Avmarkerade alla kort' };
        }

        if (cardIds.length === 0) {
          return { success: false, message: 'Inga kort-IDs angivna' };
        }

        // Validate IDs exist
        const validIds = cardIds.filter(id => context.nodes.has(id));
        if (validIds.length === 0) {
          return { success: false, message: 'Inga giltiga kort-IDs' };
        }

        if (action === 'set') {
          context.setSelectedNodeIds(new Set(validIds));
          return {
            success: true,
            message: `Markerade ${validIds.length} kort`,
            data: { selectedIds: validIds },
          };
        }
        context.selectNodes(validIds);

        return {
          success: true,
          message: `Markerade ${validIds.length} kort`,
          data: { selectedIds: validIds },
        };
      }

      case 'arrange_cards': {
        const mode = input.mode as string;
        const selectedCount = context.selectedNodeIds.size;

        if (selectedCount === 0) {
          return { success: false, message: 'Inga kort markerade att arrangera' };
        }

        context.saveStateForUndo();

        switch (mode) {
          case 'vertical':
            context.arrangeVertical();
            break;
          case 'horizontal':
            context.arrangeHorizontal();
            break;
          case 'grid_v':
            context.arrangeGridVertical();
            break;
          case 'grid_h':
            context.arrangeGridHorizontal();
            break;
          case 'circle':
            context.arrangeCircle();
            break;
          case 'kanban':
            context.arrangeKanban();
            break;
          case 'centrality':
            context.arrangeCentrality();
            break;
          default:
            return { success: false, message: `Okänt arrangeringssätt: ${mode}` };
        }

        return {
          success: true,
          message: `Arrangerade ${selectedCount} kort (${mode})`,
        };
      }

      case 'add_tags': {
        const tagsToAdd = input.tags as string[];

        if (!tagsToAdd || tagsToAdd.length === 0) {
          return { success: false, message: 'Inga taggar angivna' };
        }

        if (context.selectedNodeIds.size === 0) {
          return { success: false, message: 'Inga kort markerade' };
        }

        // Add tags to each selected node
        for (const nodeId of context.selectedNodeIds) {
          const node = context.nodes.get(nodeId);
          if (node) {
            const existingTags = node.tags || [];
            const newTags = [...new Set([...existingTags, ...tagsToAdd])];
            context.updateNode(nodeId, { tags: newTags });
          }
        }

        return {
          success: true,
          message: `La till ${tagsToAdd.length} tagg(ar) på ${context.selectedNodeIds.size} kort`,
        };
      }

      case 'create_card': {
        const content = input.content as string;
        const title = input.title as string | undefined;
        const inputTags = (input.tags as string[]) || [];

        if (!content) {
          return { success: false, message: 'Innehåll krävs för att skapa kort' };
        }

        // Create at center of viewport
        const newId = context.addNode(content, 0, 0, 'text');

        // Add title and tags to the newly created card
        if (newId && (title || inputTags.length > 0)) {
          const updates: Partial<MindNode> = {};
          if (title) updates.title = title;
          if (inputTags.length > 0) updates.tags = inputTags;
          context.updateNode(newId, updates);
        }

        return {
          success: true,
          message: `Skapade nytt kort${title ? `: "${title}"` : ''}`,
        };
      }

      case 'update_cards': {
        const updates: Partial<MindNode> = {};

        if (input.title !== undefined) updates.title = input.title as string;
        if (input.caption !== undefined) updates.caption = input.caption as string;
        if (input.comment !== undefined) updates.comment = input.comment as string;
        if (input.value !== undefined) {
          const value = input.value as number;
          if (value < 1 || value > 6) {
            return { success: false, message: 'Prioritet måste vara 1-6' };
          }
          // Note: 'value' might need to be mapped to actual field name
        }

        if (Object.keys(updates).length === 0) {
          return { success: false, message: 'Inga fält att uppdatera' };
        }

        if (context.selectedNodeIds.size === 0) {
          return { success: false, message: 'Inga kort markerade' };
        }

        // Check for protected field modifications
        for (const field of Object.keys(updates)) {
          if (PROTECTED_FIELDS.has(field)) {
            return { success: false, message: `Kan inte ändra skyddat fält: ${field}` };
          }
        }

        context.selectedNodeIds.forEach(id => {
          context.updateNode(id, updates);
        });

        return {
          success: true,
          message: `Uppdaterade ${context.selectedNodeIds.size} kort`,
        };
      }

      case 'pin_cards': {
        const pin = input.pin as boolean;

        if (context.selectedNodeIds.size === 0) {
          return { success: false, message: 'Inga kort markerade' };
        }

        // Pin/unpin each selected node
        for (const nodeId of context.selectedNodeIds) {
          context.updateNode(nodeId, { pinned: pin });
        }

        return {
          success: true,
          message: pin
            ? `Fäste ${context.selectedNodeIds.size} kort`
            : `Lossade ${context.selectedNodeIds.size} kort`,
        };
      }

      case 'focus_view': {
        if (context.selectedNodeIds.size === 0) {
          return { success: false, message: 'Inga kort markerade att fokusera på' };
        }

        context.centerOnNodes(Array.from(context.selectedNodeIds));

        return {
          success: true,
          message: 'Fokuserade vyn på markerade kort',
        };
      }

      default:
        return { success: false, message: `Okänt verktyg: ${name}` };
    }
  } catch (error) {
    return {
      success: false,
      message: `Fel vid körning av ${name}: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ============================================
// TOOL SYSTEM PROMPT
// ============================================

export const TOOL_SYSTEM_PROMPT = `Du är en AI-assistent som hjälper användaren att organisera och arbeta med sina kort på en digital canvas.

Du har tillgång till följande verktyg:
- search_cards: Sök kort med naturligt språk
- select_cards: Markera kort (set/add/clear)
- arrange_cards: Arrangera markerade kort (vertical, horizontal, grid, circle, etc.)
- add_tags: Lägg till taggar på markerade kort
- create_card: Skapa nytt kort
- update_cards: Uppdatera metadata (title, caption, comment)
- pin_cards: Fäst/lossa kort
- focus_view: Fokusera vyn på markerade kort

REGLER:
- Du kan INTE ta bort kort
- Du kan INTE ta bort taggar (bara lägga till)
- Du kan INTE ändra: createdAt, copyRef, id, embedding
- Kedja gärna flera verktyg för att utföra komplexa uppgifter
- Var koncis i dina svar

När användaren ber dig göra något, använd verktygen direkt. Förklara kortfattat vad du gör.`;
