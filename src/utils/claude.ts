import Anthropic from '@anthropic-ai/sdk';
import type { MindNode, AIReflection } from '../types/types';
import { getImageText } from './imageRefs';
import type { ChatMessage } from './chatProviders';
import { claudeLimiter } from './rateLimiter';
import { logTokenEstimate, logUsage } from './tokenLogging';

/**
 * Generate a reflective question based on a set of nodes
 */
export const generateReflection = async (
  nodes: MindNode[],
  apiKey: string
): Promise<AIReflection> => {
  if (!apiKey) throw new Error('Claude API key saknas');
  if (nodes.length === 0) throw new Error('Inga noder att analysera');

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const nodesSummary = nodes.map((node) => {
    let content = '';
    switch (node.type) {
      case 'text':
        content = node.content;
        break;
      case 'image':
        content = getImageText(node) || '[Bild utan text]';
        break;
      case 'zotero': {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = node.content;
        content = tempDiv.textContent || '[Zotero-anteckning]';
        break;
      }
    }
    return {
      id: node.id,
      type: node.type,
      content: content.substring(0, 200),
      tags: node.tags,
      createdAt: node.createdAt,
    };
  });

  const prompt = `Du är en reflekterande AI-terapeut som hjälper användare att förstå sina tankar.

Analysera dessa anteckningar från användarens "Soul Canvas":

${JSON.stringify(nodesSummary, null, 2)}

Baserat på dessa tankar:
1. Identifiera teman eller samband
2. Formulera EN djup, reflekterande fråga på svenska
3. Frågan ska vara öppen och icke-dömande

Svara ENDAST med frågan.`;

  logTokenEstimate('claude reflection', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })
  );
  logUsage('claude reflection', (message as { usage?: unknown }).usage);

  const question =
    message.content[0].type === 'text'
      ? message.content[0].text
      : 'Vad betyder dessa tankar för dig?';

  return {
    question,
    context: nodes.map((n) => n.id),
    timestamp: new Date().toISOString(),
  };
};

export interface AutoTagResult {
  practicalTags: string[];
  hiddenTags: string[];
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

const normalizeTag = (tag: string): string => {
  const normalized = tag
    .toLowerCase()
    .replace(/[/_-]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  const parts = normalized.split(' ').filter(Boolean);
  return parts.length > 3 ? parts.slice(0, 3).join(' ') : normalized;
};

const normalizeTagList = (tags: string[]): string[] => {
  const cleaned = tags.map(normalizeTag).filter(Boolean);
  return Array.from(new Set(cleaned));
};

/**
 * Generate practical + hidden tags for a node
 */
export const generateSemanticTags = async (
  node: MindNode,
  apiKey: string
): Promise<AutoTagResult> => {
  if (!apiKey) throw new Error('Claude API key saknas');

  const emptyResult: AutoTagResult = { practicalTags: [], hiddenTags: [] };
  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  let content = '';
  switch (node.type) {
    case 'text':
      content = node.content;
      break;
    case 'image':
      content = getImageText(node);
      break;
    case 'zotero': {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = node.content;
      content = tempDiv.textContent || '';
      break;
    }
  }

  if (!content.trim()) return emptyResult;

  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const weekNum = getWeekNumber(now);
  const currentWeek = `${year}v${weekNum.toString().padStart(2, '0')}`;

  const prompt = `Analyze the text and categorize it. Respond in exactly this JSON format:
{
  "praktiska": ["tag1", "tag2"],
  "fordolda": ["tag1", "tag2", "tag3"]
}

TEXT TO ANALYZE:
"${content.substring(0, 800)}"

CARD TYPE: ${node.type}
CURRENT WEEK: ${currentWeek}

Instructions:
- All tags must be English, lowercase.
- No hyphens or underscores; use spaces instead.
- Prefer single-word tags; allow 2-3 words only for established terms (e.g. "theory of mind", "predictive coding", "social cognition").
- Practical tags (2-4): type (note, reflection, meeting, todo, research, quote, idea, journal, planning), week tag (${currentWeek}), person names in lowercase, and optional reminder.
- Hidden tags (2-4): thematic insights, emotions, abstract patterns.
Respond ONLY with JSON.`;

  logTokenEstimate('claude tags', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })
  );
  logUsage('claude tags', (message as { usage?: unknown }).usage);

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return emptyResult;
    const parsed = JSON.parse(jsonMatch[0]);

    const practicalTags = normalizeTagList(
      Array.isArray(parsed.praktiska) ? parsed.praktiska : []
    );

    const rawHiddenTags = Array.isArray(parsed.fordolda)
      ? parsed.fordolda
      : (Array.isArray(parsed['f?rdolda']) ? parsed['f?rdolda'] : []);
    const hiddenTags = normalizeTagList(rawHiddenTags);

    return { practicalTags, hiddenTags };
  } catch {
    console.error('Failed to parse Claude response as JSON:', responseText);
    return emptyResult;
  }
};

/**
 * Generate a short Swedish summary suitable for node.comment
 */
export const generateNodeSummaryComment = async (
  node: MindNode,
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error('Claude API key saknas');

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const baseText = (() => {
    if (node.type === 'image') return getImageText(node);
    if (node.type === 'zotero') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = node.content;
      return tempDiv.textContent || '';
    }
    return node.content;
  })();

  const prompt = `Sammanfatta kort texten nedan på svenska för att passa i ett anteckningsfälts kommentar.
- Håll dig till 1-3 meningar, max ~60 ord.
- Använd ett neutralt, koncist tonläge.
- Behåll viktiga namn, datum och slutsatser.

TEXT:
${baseText.substring(0, 1200)}
`;

  logTokenEstimate('claude summary comment', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    })
  );
  logUsage('claude summary comment', (message as { usage?: unknown }).usage);

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return text.trim();
};

/**
 * Generate a concise Swedish title (2-6 words) for a node
 */
export const generateNodeTitle = async (
  node: MindNode,
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error('Claude API key saknas');

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const baseText = (() => {
    if (node.type === 'image') return getImageText(node);
    if (node.type === 'zotero') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = node.content;
      return tempDiv.textContent || '';
    }
    return node.content;
  })();

  const prompt = `Föreslå en mycket kort rubrik (2-6 ord) på svenska för anteckningen nedan.
- Så kort som möjligt, 2-6 ord.
- Inga citattecken, inga prefix.
- Fånga kärnan, inga punkter i slutet.

TEXT:
${baseText.substring(0, 800)}
`;

  logTokenEstimate('claude node title', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 40,
      messages: [{ role: 'user', content: prompt }],
    })
  );
  logUsage('claude node title', (message as { usage?: unknown }).usage);

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return text.trim().replace(/^["'\s-]+|["'\s]+$/g, '');
};

/**
 * Analyze a cluster of related nodes
 */
export const analyzeCluster = async (
  nodes: MindNode[],
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error('Claude API key saknas');
  if (nodes.length < 2) return 'Behöver minst 2 noder för att analysera ett kluster';

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  const nodesSummary = nodes.map((node) => {
    let content = '';
    switch (node.type) {
      case 'text':
        content = node.content;
        break;
      case 'image':
        content = getImageText(node) || '[Bild]';
        break;
      case 'zotero': {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = node.content;
        content = tempDiv.textContent || '[Zotero]';
        break;
      }
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

Svara på svenska.`;

  logTokenEstimate('claude cluster', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 150,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })
  );
  logUsage('claude cluster', (message as { usage?: unknown }).usage);

  return message.content[0].type === 'text'
    ? message.content[0].text
    : 'Kunde inte analysera klustret';
};

/**
 * Generate a summary of a conversation for memory/context
 */
export const generateConversationSummary = async (
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<{ summary: string; themes: string[] }> => {
  if (!apiKey) throw new Error('Claude API key saknas');

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // Ta bara relevanta meddelanden (exkludera system)
  const relevantMessages = messages
    .filter(m => m.role !== 'system')
    .map(m => `${m.role === 'user' ? 'Användare' : 'AI'}: ${m.content.substring(0, 300)}`)
    .join('\n\n');

  if (!relevantMessages.trim()) {
    return { summary: '', themes: [] };
  }

  const prompt = `Analysera detta samtal och skapa en kort sammanfattning för framtida referens.

SAMTAL:
${relevantMessages.substring(0, 2500)}

Svara i exakt detta JSON-format:
{
  "sammanfattning": "2-3 meningar som fångar kärnan i samtalet, vad som diskuterades och eventuella insikter",
  "teman": ["tema1", "tema2", "tema3"]
}

Instruktioner:
- Sammanfattningen ska vara koncis men informativ
- Fånga de viktigaste punkterna och insikterna
- Teman (2-4 st): abstrakta koncept som diskuterades
- Skriv på svenska
- Svara ENDAST med JSON`;

  logTokenEstimate('claude conversation summary', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })
  );
  logUsage('claude conversation summary', (message as { usage?: unknown }).usage);

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { summary: '', themes: [] };
    const parsed = JSON.parse(jsonMatch[0]);

    return {
      summary: (parsed.sammanfattning || '').trim(),
      themes: (parsed.teman || []).map((t: string) => t.trim().toLowerCase()).filter((t: string) => t.length > 0),
    };
  } catch {
    console.error('Failed to parse conversation summary:', responseText);
    return { summary: '', themes: [] };
  }
};

/**
 * Generate a short, descriptive title for a conversation
 */
export const generateConversationTitle = async (
  messages: { role: string; content: string }[],
  apiKey: string
): Promise<string> => {
  if (!apiKey) throw new Error('Claude API key saknas');

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  // Ta bara de första relevanta meddelandena (exkludera system)
  const relevantMessages = messages
    .filter(m => m.role !== 'system')
    .slice(0, 4)
    .map(m => `${m.role === 'user' ? 'Användare' : 'AI'}: ${m.content.substring(0, 200)}`)
    .join('\n');

  const prompt = `Ge en mycket kort titel (2-5 ord) på svenska för detta samtal.
- Fånga kärnan i vad samtalet handlar om
- Inga citattecken, inga prefix
- Max 5 ord

SAMTAL:
${relevantMessages}`;

  logTokenEstimate('claude conversation title', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 30,
      messages: [{ role: 'user', content: prompt }],
    })
  );
  logUsage('claude conversation title', (message as { usage?: unknown }).usage);

  const text = message.content[0].type === 'text' ? message.content[0].text : '';
  return text.trim().replace(/^["'\-\s]+|["'\s]+$/g, '') || 'Nytt samtal';
};

export interface ChatCardResult {
  summary: string;
  tags: string[];
}

export interface ChatSummaryResult {
  cards: ChatCardResult[];
}

/**
 * Summarize a chat conversation into one or more cards
 * AI decides how many cards based on content length and topics
 */
export const summarizeChatToCard = async (
  messages: ChatMessage[],
  apiKey: string
): Promise<ChatSummaryResult> => {
  if (!apiKey) throw new Error('Claude API key saknas');

  const emptyResult: ChatSummaryResult = { cards: [] };

  // Filtrera bort system-meddelanden och formatera chatten
  const visibleMessages = messages.filter(m => m.role !== 'system');
  if (visibleMessages.length === 0) return emptyResult;

  const chatText = visibleMessages
    .map(m => `${m.role === 'user' ? 'Användare' : 'AI'}: ${m.content}`)
    .join('\n\n');

  // Uppskatta samtalets längd för att ge AI:n en hint
  const wordCount = chatText.split(/\s+/).length;
  const suggestedCards = wordCount < 200 ? 1 : wordCount < 500 ? '1-2' : wordCount < 1000 ? '2-3' : '3-5';

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const prompt = `Analyze this AI conversation and split it into separate insights/topics. Respond in exactly this JSON format:
{
  "kort": [
    {
      "sammanfattning": "1-4 concise sentences about this part",
      "taggar": ["tag1", "tag2"]
    }
  ]
}

CONVERSATION:
${chatText.substring(0, 3000)}

Instructions:
- Conversation length is about ${wordCount} words, suggested number of cards: ${suggestedCards}
- Create 1-5 cards depending on how many distinct topics/insights appear
- Short conversations = 1 card, longer with multiple topics = multiple cards
- Each summary: 1-4 sentences, max 100 words
- Each card should be self-contained and capture one distinct insight
- Tags per card (2-4): topic, type (reflection, question, analysis, insight), key concepts
- All tags must be English, lowercase, no hyphens (use spaces).
- Write the summary in Swedish
Respond ONLY with JSON`;

  logTokenEstimate('claude chat summary', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    })
  );
  logUsage('claude chat summary', (message as { usage?: unknown }).usage);

  const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return emptyResult;
    const parsed = JSON.parse(jsonMatch[0]);

    const cards: ChatCardResult[] = (parsed.kort || []).map((card: { sammanfattning?: string; taggar?: string[] }) => ({
      summary: (card.sammanfattning || '').trim(),
      tags: normalizeTagList(Array.isArray(card.taggar) ? card.taggar : []),
    })).filter((card: ChatCardResult) => card.summary.length > 0);

    return { cards };
  } catch {
    console.error('Failed to parse chat summary response:', responseText);
    return emptyResult;
  }
};
