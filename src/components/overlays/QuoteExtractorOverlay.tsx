// src/components/overlays/QuoteExtractorOverlay.tsx
import React, { useState, useCallback } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import { extractQuotesFromText, type ExtractedQuote } from '../../utils/quoteExtractor';
import { type Theme } from '../../themes';

interface QuoteExtractorOverlayProps {
  theme: Theme;
  onClose: () => void;
  centerX: number;
  centerY: number;
}

type Mode = 'input' | 'extracting' | 'preview';

export const QuoteExtractorOverlay: React.FC<QuoteExtractorOverlayProps> = ({
  theme,
  onClose,
  centerX,
  centerY
}) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<Mode>('input');
  const [quickCount, setQuickCount] = useState(5);
  const [quotes, setQuotes] = useState<ExtractedQuote[]>([]);
  const [sourceTitle, setSourceTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const store = useBrainStore();

  const handleExtract = useCallback(async (count: number) => {
    if (!text.trim()) return;
    if (!store.claudeKey) {
      setError('Claude API-nyckel saknas. Ställ in den i Inställningar.');
      return;
    }

    setError(null);
    setMode('extracting');

    try {
      const result = await extractQuotesFromText(text, store.claudeKey, count);
      setQuotes(result.quotes);
      setSourceTitle(result.sourceTitle || '');
      setMode('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Något gick fel');
      setMode('input');
    }
  }, [text, store.claudeKey]);

  const toggleQuote = useCallback((index: number) => {
    setQuotes(prev => prev.map((q, i) =>
      i === index ? { ...q, selected: !q.selected } : q
    ));
  }, []);

  const selectAll = useCallback(() => {
    setQuotes(prev => prev.map(q => ({ ...q, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    setQuotes(prev => prev.map(q => ({ ...q, selected: false })));
  }, []);

  const createCards = useCallback(() => {
    const selectedQuotes = quotes.filter(q => q.selected);
    if (selectedQuotes.length === 0) return;

    store.saveStateForUndo();

    const spacing = 320;
    const cols = Math.ceil(Math.sqrt(selectedQuotes.length));

    selectedQuotes.forEach((quote, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = centerX + (col - cols / 2) * spacing;
      const y = centerY + (row - Math.ceil(selectedQuotes.length / cols) / 2) * spacing;

      const nodeId = crypto.randomUUID();
      store.addNodeWithId(nodeId, quote.quote, x, y, 'text');

      // Lägg till caption (synlig på framsidan), taggar och källa
      const tags = [...quote.tags, 'citat'];
      if (sourceTitle) tags.push(sourceTitle.toLowerCase().replace(/\s+/g, '-'));

      store.updateNode(nodeId, {
        caption: quote.comment,
        tags,
      });
    });

    onClose();
  }, [quotes, store, centerX, centerY, sourceTitle, onClose]);

  const selectedCount = quotes.filter(q => q.selected).length;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-[700px] max-h-[85vh] rounded-xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: theme.node.bg,
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: `1px solid ${theme.node.border}` }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: theme.node.text, fontFamily: "'Noto Serif', Georgia, serif" }}
          >
            {mode === 'input' && '✨ Citatextraktor'}
            {mode === 'extracting' && '⏳ Analyserar...'}
            {mode === 'preview' && `📝 ${quotes.length} citat hittade`}
          </h2>
          <button
            onClick={onClose}
            className="text-2xl opacity-60 hover:opacity-100 transition"
            style={{ color: theme.node.text }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div
              className="mb-4 px-4 py-3 rounded-lg"
              style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}
            >
              {error}
            </div>
          )}

          {mode === 'input' && (
            <>
              <p
                className="mb-4 opacity-70"
                style={{ color: theme.node.text, fontFamily: "'Noto Serif', Georgia, serif" }}
              >
                Klistra in text från en artikel, bok eller anteckningar.
                AI:n plockar ut de bästa citaten och kommenterar dem.
              </p>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                autoFocus
                placeholder="Klistra in text här..."
                className="w-full h-64 p-4 rounded-lg resize-none outline-none"
                style={{
                  backgroundColor: theme.node.bg,
                  color: theme.node.text,
                  border: `1px solid ${theme.node.border}`,
                  fontFamily: "'Noto Serif', Georgia, serif",
                  fontSize: 15,
                }}
              />

              <div className="mt-6 flex items-center justify-between">
                {/* Quick mode */}
                <div className="flex items-center gap-3">
                  <span style={{ color: theme.node.text, opacity: 0.7 }}>Antal citat:</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={quickCount}
                    onChange={e => setQuickCount(Math.max(1, Math.min(20, parseInt(e.target.value) || 5)))}
                    className="w-16 px-2 py-1 rounded text-center"
                    style={{
                      backgroundColor: theme.node.bg,
                      color: theme.node.text,
                      border: `1px solid ${theme.node.border}`,
                    }}
                  />
                  <button
                    onClick={() => handleExtract(quickCount)}
                    disabled={!text.trim()}
                    className="px-4 py-2 rounded-lg font-medium transition"
                    style={{
                      backgroundColor: text.trim() ? theme.lineColor : theme.node.border,
                      color: text.trim() ? '#fff' : theme.node.text,
                      opacity: text.trim() ? 1 : 0.5,
                    }}
                  >
                    Snabbläge
                  </button>
                </div>

                {/* Preview mode */}
                <button
                  onClick={() => handleExtract(0)}
                  disabled={!text.trim()}
                  className="px-4 py-2 rounded-lg font-medium transition"
                  style={{
                    backgroundColor: 'transparent',
                    color: theme.node.text,
                    border: `1px solid ${theme.node.border}`,
                    opacity: text.trim() ? 1 : 0.5,
                  }}
                >
                  Förhandsgranska alla →
                </button>
              </div>

              <p
                className="mt-4 text-sm opacity-50"
                style={{ color: theme.node.text }}
              >
                {text.length > 0 ? `${text.length} tecken` : 'Klistra in text för att börja'}
              </p>
            </>
          )}

          {mode === 'extracting' && (
            <div className="flex flex-col items-center justify-center py-16">
              <div
                className="text-6xl mb-6 animate-pulse"
              >
                🔍
              </div>
              <p style={{ color: theme.node.text, opacity: 0.7 }}>
                Analyserar text och letar efter intressanta citat...
              </p>
            </div>
          )}

          {mode === 'preview' && (
            <>
              {sourceTitle && (
                <p
                  className="mb-4 text-sm opacity-60"
                  style={{ color: theme.node.text }}
                >
                  Källa: <strong>{sourceTitle}</strong>
                </p>
              )}

              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={selectAll}
                  className="text-sm px-3 py-1 rounded transition"
                  style={{ backgroundColor: `${theme.node.border}44`, color: theme.node.text }}
                >
                  Välj alla
                </button>
                <button
                  onClick={deselectAll}
                  className="text-sm px-3 py-1 rounded transition"
                  style={{ backgroundColor: `${theme.node.border}44`, color: theme.node.text }}
                >
                  Avmarkera alla
                </button>
                <span className="ml-auto text-sm opacity-60" style={{ color: theme.node.text }}>
                  {selectedCount} av {quotes.length} valda
                </span>
              </div>

              <div className="space-y-4">
                {quotes.map((quote, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg cursor-pointer transition overflow-hidden"
                    style={{
                      backgroundColor: quote.selected
                        ? `${theme.node.selectedBorder}15`
                        : `${theme.node.border}22`,
                      border: `2px solid ${quote.selected ? theme.node.selectedBorder : 'transparent'}`,
                    }}
                    onClick={() => toggleQuote(index)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-1"
                        style={{
                          borderColor: quote.selected ? theme.node.selectedBorder : theme.node.border,
                          backgroundColor: quote.selected ? theme.node.selectedBorder : 'transparent',
                        }}
                      >
                        {quote.selected && <span className="text-white text-xs">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p
                          className="text-base leading-relaxed mb-2 break-words"
                          style={{ color: theme.node.text, fontFamily: "'Noto Serif', Georgia, serif", overflowWrap: 'break-word' }}
                        >
                          "{quote.quote}"
                        </p>
                        <p
                          className="text-sm opacity-70 italic mb-2 break-words"
                          style={{ color: theme.node.text, overflowWrap: 'break-word' }}
                        >
                          💬 {quote.comment}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {quote.tags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded"
                              style={{ backgroundColor: `${theme.node.border}44`, color: theme.node.text }}
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {mode === 'preview' && (
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderTop: `1px solid ${theme.node.border}` }}
          >
            <button
              onClick={() => { setMode('input'); setQuotes([]); }}
              className="px-4 py-2 rounded-lg transition"
              style={{
                backgroundColor: 'transparent',
                color: theme.node.text,
                border: `1px solid ${theme.node.border}`,
              }}
            >
              ← Tillbaka
            </button>
            <button
              onClick={createCards}
              disabled={selectedCount === 0}
              className="px-6 py-2 rounded-lg font-medium transition"
              style={{
                backgroundColor: selectedCount > 0 ? theme.lineColor : theme.node.border,
                color: selectedCount > 0 ? '#fff' : theme.node.text,
                opacity: selectedCount > 0 ? 1 : 0.5,
              }}
            >
              Skapa {selectedCount} kort
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
