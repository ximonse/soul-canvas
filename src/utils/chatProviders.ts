// src/utils/chatProviders.ts
// Simple chat wrapper with manual provider selection

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type ChatProvider = 'claude' | 'openai' | 'gemini';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

const DEFAULT_CHAT_MODELS: Record<ChatProvider, string> = {
  claude: 'claude-3-haiku-20240307',
  openai: 'gpt-4o-mini',
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

      // Extract system message if present
      const systemMessage = messages.find(m => m.role === 'system')?.content;

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
      const resp = await client.chat.completions.create({
        model: modelToUse,
        messages,
        max_tokens: 400,
      });
      return resp.choices[0]?.message?.content || '';
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
