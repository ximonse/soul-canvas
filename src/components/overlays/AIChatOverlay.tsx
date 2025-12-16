// src/components/overlays/AIChatOverlay.tsx
import { useState, useEffect } from 'react';
import type { ChatProvider, ChatMessage } from '../../utils/chatProviders';
import type { Theme } from '../../themes';

interface AIChatOverlayProps {
  messages: ChatMessage[];
  provider: ChatProvider;
  setProvider: (p: ChatProvider) => void;
  onSend: (text: string, provider?: ChatProvider) => Promise<void>;
  onClose: () => void;
  onMinimize: () => void;
  isSending: boolean;
  theme: Theme;
}

const PROVIDER_LABELS: Record<ChatProvider, string> = {
  claude: 'Claude (chat)',
  openai: 'OpenAI (chat)',
  gemini: 'Gemini (chat)',
};

export function AIChatOverlay({
  messages,
  provider,
  setProvider,
  onSend,
  onClose,
  onMinimize,
  isSending,
  theme,
}: AIChatOverlayProps) {
  const [input, setInput] = useState('');

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      await onSend(input, provider);
      setInput('');
    } catch (err) {
      console.error('AI chat error', err);
    }
  };

  // Escape minimizes instead of closing
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onMinimize();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onMinimize]);

  return (
    <div className="fixed inset-0 z-[180] bg-black/60 backdrop-blur-sm flex items-center justify-center font-serif text-base" onClick={onMinimize}>
      <div
        className="w-[720px] max-h-[80vh] rounded-2xl shadow-2xl flex flex-col"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        <header
          className="flex items-center justify-between p-4"
          style={{ borderBottom: `1px solid ${theme.node.border}` }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold">AI Chat</h2>
            <select
              className="border rounded px-2 py-1 text-sm"
              style={{ backgroundColor: `${theme.node.bg}EE`, borderColor: theme.node.border, color: theme.node.text }}
              value={provider}
              onChange={e => setProvider(e.target.value as ChatProvider)}
            >
              {(['claude', 'openai', 'gemini'] as ChatProvider[]).map(p => (
                <option key={p} value={p}>{PROVIDER_LABELS[p]}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button className="opacity-70 hover:opacity-100 text-lg" onClick={onMinimize} aria-label="Minimize chat">–</button>
            <button className="opacity-70 hover:opacity-100" onClick={onClose} aria-label="Close chat">✕</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg"
              style={{
                backgroundColor: m.role === 'assistant'
                  ? `${theme.node.border}33`
                  : m.role === 'user'
                    ? `${theme.node.selectedBorder}33`
                    : `${theme.node.bg}33`,
              }}
            >
              <div className="text-xs uppercase opacity-60 mb-1">{m.role}</div>
              <div className="whitespace-pre-wrap text-lg leading-relaxed">{m.content}</div>
            </div>
          ))}
        </div>

        <div
          className="p-4 flex items-center gap-3"
          style={{ borderTop: `1px solid ${theme.node.border}` }}
        >
          <textarea
            className="flex-1 rounded-lg p-3 border outline-none resize-none h-16"
            style={{
              backgroundColor: `${theme.node.bg}EE`,
              color: theme.node.text,
              borderColor: theme.node.border,
            }}
            placeholder="Ställ en fråga..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={isSending}
            className="px-4 py-2 rounded-lg"
            style={{
              backgroundColor: isSending ? `${theme.node.border}66` : theme.node.selectedBorder,
              color: theme.node.text,
              opacity: isSending ? 0.7 : 1,
            }}
          >
            {isSending ? 'Skickar...' : 'Skicka'}
          </button>
        </div>
      </div>
    </div>
  );
}
