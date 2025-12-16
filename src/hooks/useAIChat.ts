// src/hooks/useAIChat.ts
import { useState, useMemo } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import type { ChatProvider, ChatMessage } from '../utils/chatProviders';
import { chatWithProvider } from '../utils/chatProviders';

interface UseAIChatOptions {
  initialProvider?: ChatProvider;
}

export function useAIChat({ initialProvider = 'claude' }: UseAIChatOptions = {}) {
  const store = useBrainStore();
  const [provider, setProvider] = useState<ChatProvider>(() => {
    const saved = localStorage.getItem('ai_chat_provider') as ChatProvider | null;
    return saved || initialProvider;
  });
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'system', content: 'Du är en koncis assistent som hjälper till med kontext från användarens kort.' }
  ]);

  const contextSnippet = useMemo(() => {
    const allNodes = Array.from(store.nodes.values());
    const selected = allNodes.filter(n => n.selected);
    // Token-smart: använd markerade om det finns, annars 30 senaste
    const baseNodes = (selected.length > 0
      ? selected
      : allNodes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 30));

    return baseNodes.map(n => {
      const base = (n.ocrText || n.content || '').replace(/\s+/g, ' ').slice(0, 180);
      const tags = n.tags?.length ? ` [tags: ${n.tags.join(', ')}]` : '';
      return `(${n.type}) ${base}${tags}`;
    }).join('\n');
  }, [store.nodes]);

  const sendMessage = async (text: string, overrideProvider?: ChatProvider) => {
    if (!text.trim()) return;
    const selectedProvider = overrideProvider || provider;

    const apiKey =
      selectedProvider === 'claude' ? store.claudeKey :
      selectedProvider === 'openai' ? store.openaiKey :
      store.geminiKey;
    if (!apiKey) {
      throw new Error(`API-nyckel saknas för ${selectedProvider}`);
    }

    // Uppdatera lokalt provider-val
    if (selectedProvider !== provider) {
      setProvider(selectedProvider);
      localStorage.setItem('ai_chat_provider', selectedProvider);
    }

    const userMessage: ChatMessage = { role: 'user', content: text };
    const contextMessage: ChatMessage = { role: 'system', content: `Kort-kontekst (begränsad):\n${contextSnippet}` };
    const history = messages.slice(-8); // håll historiken kort

    setMessages(prev => [...prev, userMessage]);

    try {
      setIsSending(true);
      const reply = await chatWithProvider(selectedProvider, apiKey, [...history, contextMessage, userMessage]);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setIsSending(false);
    }
  };

  return {
    provider,
    setProvider: (p: ChatProvider) => { setProvider(p); localStorage.setItem('ai_chat_provider', p); },
    messages,
    isSending,
    sendMessage,
  };
}
