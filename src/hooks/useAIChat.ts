// src/hooks/useAIChat.ts
// Huvudhook för AI-chatt - orchestrerar kontext och minne

import { useState, useCallback, useRef } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { useChatContext } from './useChatContext';
import { useChatMemory } from './useChatMemory';
import type { ChatProvider, ChatMessage } from '../utils/chatProviders';
import { chatWithProvider } from '../utils/chatProviders';
import { generateConversationTitle } from '../utils/claude';

interface UseAIChatOptions {
  initialProvider?: ChatProvider;
}

const DEFAULT_SYSTEM_MESSAGE = 'Du är en koncis assistent som hjälper till med kontext från användarens kort.';

export function useAIChat({ initialProvider = 'claude' }: UseAIChatOptions = {}) {
  const store = useBrainStore();
  const context = useChatContext();

  const [provider, setProvider] = useState<ChatProvider>(() => {
    const saved = localStorage.getItem('ai_chat_provider') as ChatProvider | null;
    return saved || initialProvider;
  });
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: DEFAULT_SYSTEM_MESSAGE }
  ]);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Refs för att förhindra race conditions
  const titleGeneratedRef = useRef(false);
  const titleGeneratingRef = useRef(false);

  const memory = useChatMemory(conversationId);

  // Skapa nytt samtal och spara till store
  const ensureConversation = useCallback((selectedProvider: ChatProvider) => {
    if (conversationId) return conversationId;
    const contextNodeIds = context.getContextNodeIds();
    const newId = store.createConversation(selectedProvider, contextNodeIds);
    setConversationId(newId);
    return newId;
  }, [conversationId, store, context]);

  const sendMessage = useCallback(async (text: string, overrideProvider?: ChatProvider) => {
    if (!text.trim()) return;
    setError(null);

    const selectedProvider = overrideProvider || provider;
    const apiKey =
      selectedProvider === 'claude' ? store.claudeKey :
      selectedProvider === 'openai' ? store.openaiKey :
      store.geminiKey;

    if (!apiKey) {
      setError(`API-nyckel saknas för ${selectedProvider}`);
      return;
    }

    // Uppdatera provider-val
    if (selectedProvider !== provider) {
      setProvider(selectedProvider);
      localStorage.setItem('ai_chat_provider', selectedProvider);
    }

    const convId = ensureConversation(selectedProvider);
    const userMessage: ChatMessage = { role: 'user', content: text };

    // Bygg kontext lazy - bara nu när vi behöver den
    const ctx = context.buildContextSnippet();
    const contextLabel = ctx.hasPinnedContext
      ? `${ctx.contextCount} indragna kort`
      : ctx.isSelectedContext
        ? `${ctx.contextCount} markerade kort`
        : `${ctx.contextCount} senaste kort`;
    const memoryContext = memory.buildMemoryContext();

    const contextMessage: ChatMessage = {
      role: 'system',
      content: `Kort-kontext (${contextLabel}):\n${ctx.contextSnippet}${memoryContext}`
    };

    const history = messages.slice(-8);
    setMessages(prev => [...prev, userMessage]);
    store.addMessageToConversation(convId, { role: 'user', content: text });

    try {
      setIsSending(true);
      const reply = await chatWithProvider(selectedProvider, apiKey, [...history, contextMessage, userMessage]);

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      store.addMessageToConversation(convId, { role: 'assistant', content: reply });

      // Auto-generera titel (med race condition-skydd)
      if (!titleGeneratedRef.current && !titleGeneratingRef.current && store.claudeKey) {
        titleGeneratingRef.current = true;
        generateConversationTitle(
          [...messages, userMessage, { role: 'assistant', content: reply }],
          store.claudeKey
        ).then(title => {
          titleGeneratedRef.current = true;
          store.updateConversation(convId, { title });
        }).catch(err => {
          console.error('Kunde inte generera samtalstitel:', err);
        }).finally(() => {
          titleGeneratingRef.current = false;
        });
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Okänt fel vid AI-anrop';
      setError(errorMsg);
      console.error('AI chat error:', err);
    } finally {
      setIsSending(false);
    }
  }, [provider, store, messages, context, memory, ensureConversation]);

  // Starta chatten med en reflektion
  const startWithReflection = useCallback((reflection: string) => {
    // Sammanfatta det tidigare samtalet i bakgrunden
    if (conversationId) {
      memory.summarizeConversation(conversationId);
    }

    const ctx = context.buildContextSnippet();
    const contextLabel = ctx.isSelectedContext
      ? `${ctx.contextCount} markerade kort`
      : `${ctx.contextCount} senaste kort`;
    const memoryContext = memory.buildMemoryContext();

    const contextIntro = `Du är en reflekterande samtalspartner. Användaren har en digital canvas med kort som innehåller tankar, anteckningar och idéer.

En AI-analys har precis genererat följande reflektion baserat på ${contextLabel}:

"${reflection}"

Hjälp användaren utforska denna reflektion djupare. Ställ följdfrågor, utmana antaganden, och hjälp dem se nya perspektiv.

Kort-kontext (${contextLabel}):
${ctx.contextSnippet || '(Inga kort tillgängliga)'}${memoryContext}`;

    const initialMessages: ChatMessage[] = [
      { role: 'system', content: contextIntro },
      { role: 'assistant', content: `**Reflektion:**\n\n${reflection}\n\n---\n\nVill du utforska denna tanke vidare? Jag kan hjälpa dig gräva djupare i vad det betyder för dig.` }
    ];

    setMessages(initialMessages);
    titleGeneratedRef.current = false;

    // Skapa nytt samtal
    const contextNodeIds = context.getContextNodeIds();
    const newId = store.createConversation(provider, contextNodeIds);
    setConversationId(newId);

    // Spara initiala meddelanden
    store.addMessageToConversation(newId, { role: 'system', content: contextIntro });
    store.addMessageToConversation(newId, {
      role: 'assistant',
      content: `**Reflektion:**\n\n${reflection}\n\n---\n\nVill du utforska denna tanke vidare? Jag kan hjälpa dig gräva djupare i vad det betyder för dig.`
    });
  }, [conversationId, provider, store, context, memory]);

  // Rensa chatten och starta nytt samtal
  const clearMessages = useCallback(() => {
    if (conversationId) {
      memory.summarizeConversation(conversationId);
    }

    setConversationId(null);
    titleGeneratedRef.current = false;
    context.clearPinnedNodes();
    setError(null);
    setMessages([{ role: 'system', content: DEFAULT_SYSTEM_MESSAGE }]);
  }, [conversationId, memory, context]);

  // Ladda ett tidigare samtal
  const loadConversation = useCallback((convId: string) => {
    const conv = memory.getConversation(convId);
    if (!conv) return false;

    // Sammanfatta tidigare samtal i bakgrunden
    if (conversationId && conversationId !== convId) {
      memory.summarizeConversation(conversationId);
    }

    const loadedMessages = memory.loadConversationMessages(convId);
    if (!loadedMessages) return false;

    setConversationId(convId);
    setProvider(conv.provider);
    titleGeneratedRef.current = conv.title !== 'Nytt samtal';
    setError(null);
    setMessages(loadedMessages.length > 0 ? loadedMessages : [
      { role: 'system', content: DEFAULT_SYSTEM_MESSAGE }
    ]);

    return true;
  }, [conversationId, memory]);

  return {
    // Provider
    provider,
    setProvider: (p: ChatProvider) => {
      setProvider(p);
      localStorage.setItem('ai_chat_provider', p);
    },
    // Messages
    messages,
    isSending,
    error,
    sendMessage,
    startWithReflection,
    clearMessages,
    // Conversation
    conversationId,
    loadConversation,
    listConversations: memory.listConversations,
    // Context (pinned nodes)
    pinnedNodes: context.pinnedNodes,
    pinnedNodeIds: context.pinnedNodeIds,
    addNodeToContext: context.addNodeToContext,
    removeNodeFromContext: context.removeNodeFromContext,
    addSelectedNodesToContext: context.addSelectedNodesToContext,
    clearPinnedNodes: context.clearPinnedNodes,
    hasPinnedContext: context.hasPinnedContext,
  };
}
