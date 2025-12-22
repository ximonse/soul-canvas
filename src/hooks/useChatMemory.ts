// src/hooks/useChatMemory.ts
// Hanterar samtalshistorik, sammanfattningar och AI-minne

import { useCallback, useMemo, useRef } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { generateConversationSummary } from '../utils/claude';
import type { ChatMessage } from '../utils/chatProviders';
import type { Conversation, ConversationMessage } from '../types/types';

export function useChatMemory(currentConversationId: string | null) {
  const store = useBrainStore();
  // Track ongoing summarization to prevent duplicates
  const summarizingRef = useRef<Set<string>>(new Set());

  // Generera och spara sammanfattning för ett samtal
  const summarizeConversation = useCallback(async (convId: string) => {
    if (!store.claudeKey) return;

    // Förhindra dubbla sammanfattningar
    if (summarizingRef.current.has(convId)) return;

    const conv = store.conversations.find((c: Conversation) => c.id === convId);
    if (!conv || conv.summary) return; // Redan sammanfattat

    const visibleMessages = conv.messages.filter((m: ConversationMessage) => m.role !== 'system');
    if (visibleMessages.length < 2) return; // För kort

    summarizingRef.current.add(convId);

    try {
      const { summary, themes } = await generateConversationSummary(conv.messages, store.claudeKey);
      if (summary) {
        store.updateConversation(convId, { summary, themes });
      }
    } catch (err) {
      console.error('Kunde inte generera samtalssammanfattning:', err);
    } finally {
      summarizingRef.current.delete(convId);
    }
  }, [store]);

  // Bygg minnes-kontext från tidigare samtal
  const buildMemoryContext = useCallback(() => {
    const recentConversations = store.conversations
      .filter((c: Conversation) => !c.isArchived && c.summary && c.id !== currentConversationId)
      .sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 5);

    if (recentConversations.length === 0) return '';

    const summaries = recentConversations.map((c: Conversation) => {
      const date = new Date(c.updatedAt).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
      const themes = c.themes?.length ? ` [${c.themes.join(', ')}]` : '';
      return `- ${date}: ${c.summary}${themes}`;
    }).join('\n');

    return `\n\nTIDIGARE SAMTAL (minne):\n${summaries}`;
  }, [store.conversations, currentConversationId]);

  // Ladda ett tidigare samtal - returnerar messages om lyckat
  const loadConversationMessages = useCallback((convId: string): ChatMessage[] | null => {
    const conv = store.conversations.find((c: Conversation) => c.id === convId);
    if (!conv) return null;

    // Konvertera Conversation messages till ChatMessage format
    const loadedMessages: ChatMessage[] = conv.messages.map((m: ConversationMessage) => ({
      role: m.role,
      content: m.content
    }));

    return loadedMessages.length > 0 ? loadedMessages : null;
  }, [store.conversations]);

  // Lista alla samtal (senaste först, exkludera arkiverade)
  const listConversations = useMemo(() => {
    return store.conversations
      .filter((c: Conversation) => !c.isArchived)
      .sort((a: Conversation, b: Conversation) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [store.conversations]);

  // Hämta ett specifikt samtal
  const getConversation = useCallback((convId: string) => {
    return store.conversations.find((c: Conversation) => c.id === convId);
  }, [store.conversations]);

  return {
    summarizeConversation,
    buildMemoryContext,
    loadConversationMessages,
    listConversations,
    getConversation,
  };
}
