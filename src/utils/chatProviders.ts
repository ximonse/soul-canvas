// src/utils/chatProviders.ts
// Simple chat wrapper with manual provider selection

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { AIProvider } from '../types/types';

export type ChatProvider = AIProvider;

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export const CHAT_PROVIDER_LABELS: Record<ChatProvider, string> = {
  claude: 'Claude',
  openai: 'ChatGPT',
  gemini: 'Gemini',
};

export const OPENAI_CHAT_MODELS = [
  { id: 'gpt-5-mini', label: 'Billig/snabb' },
  { id: 'gpt-5', label: 'Medel' },
  { id: 'gpt-5.2', label: 'Top' },
] as const;

export const DEFAULT_CHAT_MODELS: Record<ChatProvider, string> = {
  claude: 'claude-3-haiku-20240307',
  openai: 'gpt-5-mini',
  gemini: 'gemini-2.0-flash',
};

export async function chatWithProvider(
  provider: ChatProvider,
  apiKey: string,
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const modelToUse = model || DEFAULT_CHAT_MODELS[provider];

  switch (provider) {
    case 'claude': {
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const claudeMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: (m.role === 'assistant' ? 'assistant' : 'user') as 'user' | 'assistant',
          content: m.content,
        }));

      // Combine ALL system messages (there may be multiple: base + context)
      const systemMessages = messages.filter(m => m.role === 'system');
      const systemMessage = systemMessages.length > 0
        ? systemMessages.map(m => m.content).join('\n\n')
        : undefined;

      const resp = await client.messages.create({
        model: modelToUse,
        max_tokens: 400,
        ...(systemMessage && { system: systemMessage }),
        messages: claudeMessages,
      });

      const textPart = resp.content[0];
      return textPart && textPart.type === 'text' ? textPart.text : '';
    }

    case 'openai': {
      const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const systemMessages = messages.filter(m => m.role === 'system');
      const instructions = systemMessages.length > 0
        ? systemMessages.map(m => m.content).join('\n\n')
        : undefined;
      const inputMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }));

      const resp = await client.responses.create({
        model: modelToUse,
        input: inputMessages,
        ...(instructions && { instructions }),
      });
      return resp.output_text || '';
    }

    case 'gemini': {
      const client = new GoogleGenerativeAI(apiKey);
      const genModel = client.getGenerativeModel({ model: modelToUse });
      const promptParts = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');
      const result = await genModel.generateContent(promptParts);
      return result.response.text() || '';
    }

    default:
      throw new Error('Unsupported provider');
  }
}
