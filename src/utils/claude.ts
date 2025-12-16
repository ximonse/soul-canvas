// src/utils/claude.ts
import Anthropic from '@anthropic-ai/sdk';
import type { MindNode, AIReflection } from '../types/types';
import { claudeLimiter } from './rateLimiter';

/**
 * Analyze patterns in nodes and generate reflective questions
 * Uses Claude to understand context and ask meaningful questions
 */
export const generateReflection = async (
  nodes: MindNode[],
  apiKey: string
): Promise<AIReflection> => {
  if (!apiKey) throw new Error('Claude API key saknas');
  if (nodes.length === 0) throw new Error('Inga noder att analysera');
  
  try {
    const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    
    // Skapa en sammanfattning av noderna för Claude
    const nodesSummary = nodes.map(node => {
      let content = '';
      
      switch (node.type) {
        case 'text':
          content = node.content;
          break;
        case 'image':
          content = node.ocrText || node.comment || '[Bild utan text]';
          break;
        case 'zotero':
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = node.content;
          content = tempDiv.textContent || '[Zotero-anteckning]';
          break;
      }
      
      return {
        id: node.id,
        type: node.type,
        content: content.substring(0, 200), // Begränsa längd
        tags: node.tags,
        createdAt: node.createdAt,
      };
    });
    
    const prompt = `Du är en reflekterande AI-terapeut som hjälper användare att förstå sina tankar och mönster.

Analysera dessa tankar/anteckningar från användarens "Soul Canvas" (en digital hjärna):

${JSON.stringify(nodesSummary, null, 2)}

Baserat på dessa tankar:
1. Identifiera intressanta mönster, teman eller samband
2. Formulera EN djup, reflekterande fråga som kan hjälpa användaren att förstå sig själv bättre
3. Frågan ska vara öppen, nyfiken och icke-dömande
4. Frågan ska vara på svenska

Svara ENDAST med frågan, inget annat.`;

    const message = await claudeLimiter.enqueue(() =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );
    
    const question = message.content[0].type === 'text' 
      ? message.content[0].text 
      : 'Vad betyder dessa tankar för dig?';
    
    return {
      question,
      context: nodes.map(n => n.id),
      timestamp: new Date().toISOString(),
    };
    
  } catch (error) {
    console.error('Claude Error:', error);
    if (error instanceof Error) {
      // Check if it's a model not found error
      if (error.message.includes('not_found_error') || error.message.includes('model:')) {
        throw new Error('Claude-modellen hittades inte. Kontrollera att din API-nyckel är giltig och har tillgång till Claude 3.5 Sonnet.');
      }
      throw new Error(`Claude API-fel: ${error.message}`);
    }
    throw new Error('Kunde inte generera reflektion');
  }
};

/**
 * Result from auto-tagging: both practical and hidden tags
 */
export interface AutoTagResult {
  practicalTags: string[];  // Goes into node.tags
  hiddenTags: string[];     // Goes into node.semanticTags (fördolda)
}

/**
 * Generate both practical and hidden tags for a node using Claude
 * Practical: type of content, todos, dates, names, week numbers
 * Hidden (fördolda): thematic, analytical, contemplative insights
 */
export const generateSemanticTags = async (
  node: MindNode,
  apiKey: string
): Promise<AutoTagResult> => {
  if (!apiKey) throw new Error('Claude API key saknas');

  const emptyResult: AutoTagResult = { practicalTags: [], hiddenTags: [] };

  try {
    const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

    let content = '';
    switch (node.type) {
      case 'text':
        content = node.content;
        break;
      case 'image':
        content = node.ocrText || node.comment || '';
        break;
      case 'zotero':
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = node.content;
        content = tempDiv.textContent || '';
        break;
    }

    if (!content.trim()) {
      return emptyResult;
    }

    // Get current week in YYvWW format
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const weekNum = getWeekNumber(now);
    const currentWeek = `${year}v${weekNum.toString().padStart(2, '0')}`;

    const prompt = `Analysera denna text och kategorisera den. Svara i exakt detta JSON-format:

{
  "praktiska": ["tagg1", "tagg2"],
  "fördolda": ["tagg1", "tagg2", "tagg3"]
}

TEXT ATT ANALYSERA:
"${content.substring(0, 800)}"

KORTTYP: ${node.type}
DAGENS VECKA: ${currentWeek}

INSTRUKTIONER:

**Praktiska taggar** (2-4 st) - uppenbara, konkreta:
- Typ av innehåll: lista, reflektion, möte, todo, forskning, citat, idé, dagbok, planering
- "note-to-self" ENDAST om texten är en personlig påminnelse till sig själv (t.ex. "kom ihåg att...", "nts:", "glöm inte...") - INTE för fakta eller allmänna anteckningar
- "todo" om det finns en konkret uppgift att göra
- Om det nämns datum eller vecka: använd formatet YYvWW (t.ex. "${currentWeek}")
- Om personnamn nämns: fullständigt namn i lowercase (t.ex. "anna andersson")
- Om det är från akademisk källa: "forskning" eller "zotero"

**Fördolda taggar** (2-4 st) - djupare, kontemplerande:
- Tematiska insikter
- Känslomässiga undertoner
- Abstrakta mönster
- Existentiella teman

Svara ENDAST med JSON, inget annat.`;

    const message = await claudeLimiter.enqueue(() =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );

    const responseText = message.content[0].type === 'text'
      ? message.content[0].text
      : '';

    // Parse JSON response
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return emptyResult;

      const parsed = JSON.parse(jsonMatch[0]);

      const practicalTags = (parsed.praktiska || [])
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0);

      const hiddenTags = (parsed.fördolda || parsed.fordolda || [])
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0);

      return { practicalTags, hiddenTags };
    } catch {
      console.error('Failed to parse Claude response as JSON:', responseText);
      return emptyResult;
    }

  } catch (error) {
    console.error('Claude Error:', error);
    if (error instanceof Error && (error.message.includes('not_found_error') || error.message.includes('model:'))) {
      console.error('Claude-modellen hittades inte. Kontrollera API-nyckel.');
    }
    return emptyResult;
  }
};

/**
 * Get ISO week number
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Analyze a cluster of related nodes and provide insights
 */
export const analyzeCluster = async (
  nodes: MindNode[],
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error('Claude API key saknas');
  if (nodes.length < 2) return 'Behöver minst 2 noder för att analysera ett kluster';
  
  try {
    const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    
    const nodesSummary = nodes.map(node => {
      let content = '';
      switch (node.type) {
        case 'text':
          content = node.content;
          break;
        case 'image':
          content = node.ocrText || node.comment || '[Bild]';
          break;
        case 'zotero':
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = node.content;
          content = tempDiv.textContent || '[Zotero]';
          break;
      }
      return {
        content: content.substring(0, 200),
        tags: node.tags,
      };
    });
    
    const prompt = `Analysera detta kluster av relaterade tankar:

${JSON.stringify(nodesSummary, null, 2)}

Ge en kort (2-3 meningar) insikt om:
- Vad förenar dessa tankar?
- Vilket övergripande tema eller mönster ser du?

Svara på svenska, var poetisk och insiktsfull.`;

    const message = await claudeLimiter.enqueue(() =>
      anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })
    );
    
    return message.content[0].type === 'text' 
      ? message.content[0].text 
      : 'Kunde inte analysera klustret';
    
  } catch (error) {
    console.error('Claude Error:', error);
    if (error instanceof Error && (error.message.includes('not_found_error') || error.message.includes('model:'))) {
      return 'Claude-modellen hittades inte. Kontrollera att din API-nyckel är giltig.';
    }
    return 'Fel vid analys av kluster';
  }
};