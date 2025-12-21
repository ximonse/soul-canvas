// src/components/overlays/ReflectionChatOverlay.tsx
import { useState, useEffect, useRef } from 'react';
import type { ChatProvider, ChatMessage } from '../../utils/chatProviders';

interface ReflectionChatOverlayProps {
  messages: ChatMessage[];
  provider: ChatProvider;
  setProvider: (p: ChatProvider) => void;
  onSend: (text: string, provider?: ChatProvider) => Promise<void>;
  onClose: () => void;
  onMinimize: () => void;
  onSaveAsCard?: () => Promise<void>;
  isSending: boolean;
  isSaving?: boolean;
}


export function ReflectionChatOverlay({
  messages,
  provider,
  setProvider,
  onSend,
  onClose,
  onMinimize,
  onSaveAsCard,
  isSending,
  isSaving,
}: ReflectionChatOverlayProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Filtrera bort system-meddelanden för visning
  const visibleMessages = messages.filter(m => m.role !== 'system');

  const handleSend = async () => {
    if (!input.trim()) return;
    try {
      await onSend(input, provider);
      setInput('');
    } catch (err) {
      console.error('AI chat error', err);
    }
  };

  // Scrolla till botten vid nya meddelanden
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fokusera på input vid öppning
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape minimerar
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
    <div
      className="fixed inset-0 z-[180] bg-black/50 backdrop-blur-md flex items-center justify-center font-serif"
      onClick={onMinimize}
    >
      <div
        className="w-[680px] max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden bg-gradient-to-br from-purple-900/95 to-pink-900/95"
        onClick={e => e.stopPropagation()}
      >
        {/* Minimal header */}
        <header className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <span className="text-2xl">💭</span>
            {/* Provider as subtle pills */}
            <div className="flex gap-1">
              {(['claude', 'openai', 'gemini'] as ChatProvider[]).map(p => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className="px-3 py-1.5 rounded-full text-sm transition-all"
                  style={{
                    backgroundColor: provider === p ? 'rgba(255,255,255,0.2)' : 'transparent',
                    color: provider === p ? 'white' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {p === 'claude' ? '✨' : p === 'openai' ? '🤖' : '💫'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onSaveAsCard && visibleMessages.length > 1 && (
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition"
                style={{ cursor: isSaving ? 'wait' : 'pointer' }}
                onClick={onSaveAsCard}
                disabled={isSaving}
              >
                {isSaving ? '⏳' : '💾'}
              </button>
            )}
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition"
              onClick={onMinimize}
            >
              −
            </button>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center text-white/60 hover:text-white transition"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </header>

        {/* Messages - clean, no bubbles */}
        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[200px]">
          {visibleMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-center text-white/40 text-lg italic">
                Börja utforska...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {visibleMessages.map((m, idx) => (
                <div key={idx} className="group">
                  {m.role === 'user' ? (
                    // User message - right aligned
                    <div className="flex justify-end">
                      <div className="max-w-[85%]">
                        <p
                          className="text-lg text-white/90 leading-relaxed whitespace-pre-wrap"
                          style={{ fontFamily: "'JetBrains Mono', 'SF Mono', monospace" }}
                        >
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Assistant message - left with accent
                    <div className="flex">
                      <div
                        className="max-w-[90%] pl-4"
                        style={{ borderLeft: '2px solid rgba(255,255,255,0.3)' }}
                      >
                        <p
                          className="text-lg text-white leading-relaxed whitespace-pre-wrap"
                          style={{ fontFamily: "'Crimson Pro', 'Libre Baskerville', Georgia, serif" }}
                        >
                          {m.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area - minimal */}
        <div className="px-6 pb-6 pt-2">
          <div className="flex items-end gap-3 rounded-2xl p-3 bg-white/10">
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent text-white placeholder-white/40 outline-none resize-none text-lg leading-relaxed"
              style={{ minHeight: '28px', maxHeight: '120px' }}
              placeholder="Skriv något..."
              value={input}
              onChange={e => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0"
              style={{
                backgroundColor: input.trim() ? 'rgba(255,255,255,0.25)' : 'transparent',
                color: 'white',
                opacity: input.trim() ? 1 : 0.3,
              }}
            >
              {isSending ? (
                <span className="animate-pulse">•••</span>
              ) : (
                <span style={{ fontSize: '18px' }}>↑</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
