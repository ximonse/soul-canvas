// src/utils/quoteExtractor.ts
// AI-driven citatextraktion från text

import Anthropic from '@anthropic-ai/sdk';
import { claudeLimiter } from './rateLimiter';
import { logTokenEstimate, logUsage } from './tokenLogging';

export interface ExtractedQuote {
  quote: string;      // Själva citatet
  comment: string;    // AI:ns kommentar/reflektion
  tags: string[];     // Föreslagna taggar
  selected?: boolean; // För UI - om användaren valt detta citat
}

export interface QuoteExtractionResult {
  quotes: ExtractedQuote[];
  sourceTitle?: string; // AI:ns förslag på titel för källan
}

/**
 * Extrahera citat från en text med AI-analys
 * @param text - Texten att analysera
 * @param apiKey - Claude API-nyckel
 * @param maxQuotes - Max antal citat att extrahera (0 = låt AI bestämma, default 5-8)
 */
export const extractQuotesFromText = async (
  text: string,
  apiKey: string,
  maxQuotes: number = 0
): Promise<QuoteExtractionResult> => {
  if (!apiKey) throw new Error('Claude API-nyckel saknas');
  if (!text.trim()) throw new Error('Ingen text att analysera');

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const countInstruction = maxQuotes > 0
    ? `Extrahera exakt ${maxQuotes} citat.`
    : 'Extrahera 5-8 av de mest intressanta citaten.';

  const prompt = `Analysera följande text och extrahera de mest intressanta, tankeväckande eller viktiga citaten.

${countInstruction}

För varje citat:
1. Välj meningar eller stycken som är särskilt insiktsfulla, provocerande, eller fångar en viktig idé
2. Skriv en kort kommentar (1-2 meningar) som reflekterar över varför citatet är intressant eller vad det väcker för tankar
3. Föreslå 2-3 taggar som kategoriserar citatet

Svara ENDAST med JSON i detta format:
{
  "sourceTitle": "Kort titel som beskriver källan (2-5 ord)",
  "quotes": [
    {
      "quote": "Det exakta citatet från texten",
      "comment": "Din reflektion över citatet",
      "tags": ["tagg1", "tagg2"]
    }
  ]
}

TEXT ATT ANALYSERA:
${text.substring(0, 15000)}`;

  logTokenEstimate('claude quote extract', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    })
  );
  logUsage('claude quote extract', (message as { usage?: unknown }).usage);

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Oväntat svar från Claude');
  }

  try {
    // Försök parsa JSON från svaret
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Kunde inte hitta JSON i svaret');
    }

    const result = JSON.parse(jsonMatch[0]) as QuoteExtractionResult;

    // Markera alla som valda initialt
    result.quotes = result.quotes.map(q => ({ ...q, selected: true }));

    return result;
  } catch (parseError) {
    console.error('JSON parse error:', parseError, content.text);
    throw new Error('Kunde inte tolka AI-svaret');
  }
};

/**
 * Generera kommentarer och taggar för ett enskilt citat
 * (används om användaren manuellt markerar text)
 */
export const analyzeQuote = async (
  quote: string,
  apiKey: string,
  context?: string
): Promise<{ comment: string; tags: string[] }> => {
  if (!apiKey) throw new Error('Claude API-nyckel saknas');

  const anthropic = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const contextInfo = context
    ? `\n\nKONTEXT (omgivande text):\n${context.substring(0, 500)}`
    : '';

  const prompt = `Analysera detta citat och ge en kort reflektion samt föreslå taggar.

CITAT:
"${quote}"${contextInfo}

Svara ENDAST med JSON:
{
  "comment": "Din reflektion över citatet (1-2 meningar)",
  "tags": ["tagg1", "tagg2", "tagg3"]
}`;

  logTokenEstimate('claude quote analyze', [{ label: 'prompt', text: prompt }]);
  const message = await claudeLimiter.enqueue(() =>
    anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })
  );
  logUsage('claude quote analyze', (message as { usage?: unknown }).usage);

  const content = message.content[0];
  if (content.type !== 'text') {
    throw new Error('Oväntat svar från Claude');
  }

  try {
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Kunde inte hitta JSON i svaret');
    }
    return JSON.parse(jsonMatch[0]);
  } catch {
    return { comment: '', tags: ['citat'] };
  }
};
