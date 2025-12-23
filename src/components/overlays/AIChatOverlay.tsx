// src/components/overlays/AIChatOverlay.tsx
import { useState, useEffect, useRef } from 'react';
import { CHAT_PROVIDER_LABELS, OPENAI_CHAT_MODELS, GEMINI_CHAT_MODELS } from '../../utils/chatProviders';
import type { ChatProvider, ChatMessage } from '../../utils/chatProviders';
import type { Theme } from '../../themes';
import type { Conversation, MindNode } from '../../types/types';
import { ConversationHistory } from './ConversationHistory';
import { ChatContextPanel } from './ChatContextPanel';

interface AIChatOverlayProps {
  messages: ChatMessage[];
  provider: ChatProvider;
  setProvider: (p: ChatProvider) => void;
  openaiModel?: string;
  setOpenaiModel?: (model: string) => void;
  geminiModel?: string;
  setGeminiModel?: (model: string) => void;
  onSend: (text: string, provider?: ChatProvider) => Promise<void>;
  onClose: () => void;
  onMinimize: () => void;
  onSaveAsCard?: () => Promise<void>;
  isSending: boolean;
  isSaving?: boolean;
  error?: string | null;
  theme: Theme;
  // Conversation history
  conversations?: Conversation[];
  currentConversationId?: string | null;
  onLoadConversation?: (id: string) => void;
  onNewConversation?: () => void;
  // Pinned nodes (associativ kontext)
  pinnedNodes?: MindNode[];
  onRemoveNodeFromContext?: (id: string) => void;
  onAddSelectedToContext?: () => void;
  onClearPinnedNodes?: () => void;
}


export function AIChatOverlay({
  messages,
  provider,
  setProvider,
  openaiModel,
  setOpenaiModel,
  geminiModel,
  setGeminiModel,
  onSend,
  onClose,
  onMinimize,
  onSaveAsCard,
  isSending,
  isSaving,
  error,
  theme,
  conversations = [],
  currentConversationId,
  onLoadConversation,
  onNewConversation,
  pinnedNodes = [],
  onRemoveNodeFromContext,
  onAddSelectedToContext,
  onClearPinnedNodes,
}: AIChatOverlayProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Filtrera bort system-meddelanden för räkning
  const visibleMessages = messages.filter(m => m.role !== 'system');

  // Fokusera på input vid öppning
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  // Scroll to bottom ref
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="fixed inset-0 z-[180] bg-black/50 backdrop-blur-md flex items-center justify-center font-serif" onClick={onMinimize}>
      <div
        className="w-[680px] max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Minimal header */}
        <header className="flex items-center justify-between px-6 py-4 relative">
          <div className="flex items-center gap-4">
            {/* Provider as subtle pills */}
            <div className="flex gap-1 items-center">
              {(['claude', 'openai', 'gemini'] as ChatProvider[]).map(p => (
                <button
                  key={p}
                  onClick={() => setProvider(p)}
                  className="px-3 py-1.5 rounded-full text-sm transition-all"
                  style={{
                    backgroundColor: provider === p ? `${theme.node.selectedBorder}40` : 'transparent',
                    opacity: provider === p ? 1 : 0.5,
                  }}
                >
                  {CHAT_PROVIDER_LABELS[p]}
                </button>
              ))}
              {provider === 'openai' && setOpenaiModel && (
                <select
                  value={openaiModel || OPENAI_CHAT_MODELS[0].id}
                  onChange={(e) => setOpenaiModel(e.target.value)}
                  className="ml-2 px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: `${theme.node.border}22`,
                    color: theme.node.text,
                    border: `1px solid ${theme.node.border}`,
                  }}
                >
                  {OPENAI_CHAT_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label} - {model.id}
                    </option>
                  ))}
                </select>
              )}
              {provider === 'gemini' && setGeminiModel && (
                <select
                  value={geminiModel || GEMINI_CHAT_MODELS[1].id}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="ml-2 px-2 py-1 rounded text-xs"
                  style={{
                    backgroundColor: `${theme.node.border}22`,
                    color: theme.node.text,
                    border: `1px solid ${theme.node.border}`,
                  }}
                >
                  {GEMINI_CHAT_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label} - {model.id}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* History button */}
            {onLoadConversation && (
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition"
                style={{ backgroundColor: showHistory ? `${theme.node.selectedBorder}30` : 'transparent' }}
                onClick={() => setShowHistory(!showHistory)}
                aria-label="Samtalshistorik"
              >
                📜
              </button>
            )}
            {onSaveAsCard && visibleMessages.length > 1 && (
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition"
                style={{ cursor: isSaving ? 'wait' : 'pointer' }}
                onClick={onSaveAsCard}
                disabled={isSaving}
                aria-label="Spara som kort"
              >
                {isSaving ? '⏳' : '💾'}
              </button>
            )}
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition"
              onClick={onMinimize}
            >
              −
            </button>
            <button
              className="w-8 h-8 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition"
              onClick={onClose}
            >
              ×
            </button>
          </div>

          {/* Conversation history dropdown */}
          {showHistory && onLoadConversation && onNewConversation && (
            <ConversationHistory
              conversations={conversations}
              currentConversationId={currentConversationId ?? null}
              onSelect={onLoadConversation}
              onNewConversation={() => {
                onNewConversation();
                setShowHistory(false);
              }}
              onClose={() => setShowHistory(false)}
              theme={theme}
            />
          )}
        </header>

        {/* Context panel for pinned nodes */}
        {onRemoveNodeFromContext && onAddSelectedToContext && onClearPinnedNodes && (
          <ChatContextPanel
            pinnedNodes={pinnedNodes}
            onRemoveNode={onRemoveNodeFromContext}
            onAddSelected={onAddSelectedToContext}
            onClearAll={onClearPinnedNodes}
            theme={theme}
          />
        )}

        {/* Messages - clean, no bubbles */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {visibleMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-center opacity-40 text-lg italic">
                Börja ett samtal...
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {messages.filter(m => m.role !== 'system').map((m, idx) => (
                <div key={idx} className="group">
                  {m.role === 'user' ? (
                    // User message - right aligned, subtle
                    <div className="flex justify-end">
                      <div className="max-w-[85%]">
                        <p
                          className="text-lg leading-relaxed whitespace-pre-wrap"
                          style={{
                            opacity: 0.9,
                            fontFamily: theme.chat?.userFont || 'inherit',
                          }}
                        >
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    // Assistant message - left aligned with subtle accent
                    <div className="flex">
                      <div
                        className="max-w-[90%] pl-4"
                        style={{
                          borderLeft: `2px solid ${theme.node.selectedBorder}40`,
                        }}
                      >
                        <p
                          className="text-lg leading-relaxed whitespace-pre-wrap"
                          style={{
                            fontFamily: theme.chat?.assistantFont || 'inherit',
                          }}
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

        {/* Error message */}
        {error && (
          <div
            className="mx-6 mb-2 px-3 py-2 rounded-lg text-sm"
            style={{
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              border: '1px solid #fecaca',
            }}
          >
            {error}
          </div>
        )}

        {/* Input area - minimal and integrated */}
        <div className="px-6 pb-6 pt-2">
          <div
            className="flex items-end gap-3 rounded-2xl p-3"
            style={{
              backgroundColor: `${theme.node.border}15`,
            }}
          >
            <textarea
              ref={inputRef}
              className="flex-1 bg-transparent outline-none resize-none text-lg leading-relaxed"
              style={{ color: theme.node.text, minHeight: '28px', maxHeight: '120px' }}
              placeholder="Skriv något..."
              value={input}
              onChange={e => {
                setInput(e.target.value);
                // Auto-resize
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              rows={1}
            />
            <button
              onClick={handleSend}
              disabled={isSending || !input.trim()}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-all shrink-0"
              style={{
                backgroundColor: input.trim() ? theme.node.selectedBorder : 'transparent',
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
