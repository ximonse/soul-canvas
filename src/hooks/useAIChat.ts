// src/hooks/useAIChat.ts
// Huvudhook för AI-chatt - orchestrerar kontext och minne

import { useState, useCallback, useRef } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { useChatContext } from './useChatContext';
import { useChatMemory } from './useChatMemory';
import type { ChatProvider, ChatMessage } from '../utils/chatProviders';
import { chatWithProvider, DEFAULT_CHAT_MODELS, OPENAI_CHAT_MODELS, GEMINI_CHAT_MODELS } from '../utils/chatProviders';
import { generateConversationTitle } from '../utils/claude';
import { executeAITool, type ToolExecutionContext, type ToolCall } from '../utils/aiTools';

interface UseAIChatOptions {
  initialProvider?: ChatProvider;
  toolContext?: ToolExecutionContext;
}

const DEFAULT_SYSTEM_MESSAGE = 'Du är en koncis assistent som hjälper till med kontext från användarens kort.';

const resolveArrangeMode = (text: string): string | null => {
  const normalized = text.toLowerCase();
  if (!/(arrang|ordna|placera|layout)/.test(normalized)) return null;

  if (/(vertikal|lodrät|lodratt)/.test(normalized)) return 'vertical';
  if (/(horisont|vågrät|vagrat)/.test(normalized)) return 'horizontal';
  if (/(rutnät|rutnat|grid|tabell)/.test(normalized)) return 'grid_h';
  if (/(cirkel|rund)/.test(normalized)) return 'circle';
  if (/kanban/.test(normalized)) return 'kanban';
  if (/(central|mitt|centrum)/.test(normalized)) return 'centrality';

  return null;
};

export function useAIChat({ initialProvider = 'claude', toolContext }: UseAIChatOptions = {}) {
  const createConversation = useBrainStore((state) => state.createConversation);
  const addMessageToConversation = useBrainStore((state) => state.addMessageToConversation);
  const updateConversation = useBrainStore((state) => state.updateConversation);
  const claudeKey = useBrainStore((state) => state.claudeKey);
  const openaiKey = useBrainStore((state) => state.openaiKey);
  const geminiKey = useBrainStore((state) => state.geminiKey);
  const context = useChatContext();

  const [provider, setProvider] = useState<ChatProvider>(() => {
    const saved = localStorage.getItem('ai_chat_provider') as ChatProvider | null;
    return saved || initialProvider;
  });
  const [openaiModel, setOpenaiModel] = useState<string>(() => {
    const saved = localStorage.getItem('openai_chat_model');
    if (saved && OPENAI_CHAT_MODELS.some(model => model.id === saved)) {
      return saved;
    }
    return DEFAULT_CHAT_MODELS.openai;
  });
  const [geminiModel, setGeminiModel] = useState<string>(() => {
    const saved = localStorage.getItem('gemini_chat_model');
    if (saved && GEMINI_CHAT_MODELS.some(model => model.id === saved)) {
      return saved;
    }
    return DEFAULT_CHAT_MODELS.gemini;
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
    const newId = createConversation(selectedProvider, contextNodeIds);
    setConversationId(newId);
    return newId;
  }, [conversationId, createConversation, context]);

  const sendMessage = useCallback(async (text: string, overrideProvider?: ChatProvider) => {
    if (!text.trim()) return;
    setError(null);

    const selectedProvider = overrideProvider || provider;
    const apiKey =
      selectedProvider === 'claude' ? claudeKey :
      selectedProvider === 'openai' ? openaiKey :
      geminiKey;
    const modelOverride = selectedProvider === 'openai'
      ? openaiModel
      : selectedProvider === 'gemini'
        ? geminiModel
        : undefined;

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
    addMessageToConversation(convId, { role: 'user', content: text });

    // Local tool execution (fast path) for common commands like arrange
    if (toolContext) {
      const mode = resolveArrangeMode(text);
      if (mode) {
        const toolCall: ToolCall = {
          id: `local-${Date.now()}`,
          name: 'arrange_cards',
          input: { mode },
        };
        const result = executeAITool(toolCall, toolContext);
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: result.message,
        };
        setMessages(prev => [...prev, assistantMessage]);
        addMessageToConversation(convId, { role: 'assistant', content: result.message });
        return;
      }
    }

    try {
      setIsSending(true);
      const reply = await chatWithProvider(
        selectedProvider,
        apiKey,
        [...history, contextMessage, userMessage],
        modelOverride
      );

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      addMessageToConversation(convId, { role: 'assistant', content: reply });

      // Auto-generera titel (med race condition-skydd)
      if (!titleGeneratedRef.current && !titleGeneratingRef.current && claudeKey) {
        titleGeneratingRef.current = true;
        generateConversationTitle(
          [...messages, userMessage, { role: 'assistant', content: reply }],
          claudeKey
        ).then(title => {
          titleGeneratedRef.current = true;
          updateConversation(convId, { title });
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
  }, [provider, claudeKey, openaiKey, geminiKey, messages, context, memory, ensureConversation, openaiModel, geminiModel, addMessageToConversation, updateConversation]);

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
    const newId = createConversation(provider, contextNodeIds);
    setConversationId(newId);

    // Spara initiala meddelanden
    addMessageToConversation(newId, { role: 'system', content: contextIntro });
    addMessageToConversation(newId, {
      role: 'assistant',
      content: `**Reflektion:**\n\n${reflection}\n\n---\n\nVill du utforska denna tanke vidare? Jag kan hjälpa dig gräva djupare i vad det betyder för dig.`
    });
  }, [conversationId, provider, context, memory, createConversation, addMessageToConversation]);

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
    openaiModel,
    setOpenaiModel: (model: string) => {
      setOpenaiModel(model);
      localStorage.setItem('openai_chat_model', model);
    },
    geminiModel,
    setGeminiModel: (model: string) => {
      setGeminiModel(model);
      localStorage.setItem('gemini_chat_model', model);
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
