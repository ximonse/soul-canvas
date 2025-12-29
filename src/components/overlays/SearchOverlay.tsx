// src/components/overlays/SearchOverlay.tsx
// Sök-overlay som följer aktivt tema

import { useEffect, useRef, useState } from 'react';
import type { MindNode } from '../../types/types';
import type { Theme } from '../../themes';
import { useBrainStore } from '../../store/useBrainStore';
import { getNodeDisplayTitle } from '../../utils/nodeDisplay';
import { resolveImageUrl } from '../../utils/imageRefs';

const FIELD_COMPLETIONS = [
  'title',
  'content',
  'caption',
  'comment',
  'link',
  'ocr',
  'tags',
  'semantic',
  'created',
  'updated',
  'type',
  'copyref',
  'copied',
  'originalcreated',
  'value',
];

const DATE_OPERATOR_COMPLETIONS = [
  { prefix: 'fö', completion: 'före:', template: 'ÅÅÅÅ-MM-DD' },
  { prefix: 'in', completion: 'innan:', template: 'ÅÅÅÅ-MM-DD' },
  { prefix: 'be', completion: 'before:', template: 'YYYY-MM-DD' },
  { prefix: 'ef', completion: 'efter:', template: 'ÅÅÅÅ-MM-DD' },
  { prefix: 'af', completion: 'after:', template: 'YYYY-MM-DD' },
  { prefix: 'me', completion: 'mellan:', template: 'ÅÅÅÅ-MM-DD:ÅÅÅÅ-MM-DD' },
  { prefix: 'bt', completion: 'between:', template: 'YYYY-MM-DD:YYYY-MM-DD' },
];

const expandPartialField = (value: string) => {
  const match = value.match(/(^|\s)([^()\s:]+):$/);
  if (!match) return value;
  const prefix = match[2].toLowerCase();
  if (prefix.length < 2) return value;
  const completion = FIELD_COMPLETIONS.find((field) => field.startsWith(prefix));
  if (!completion || completion === prefix) return value;
  return value.slice(0, value.length - prefix.length - 1) + completion + ':';
};

const applyFieldCompletion = (value: string) => {
  // Check for value field autocomplete
  const valueFieldMatch = value.match(/(^|\s)(value):([^()\s]*)$/i);
  if (valueFieldMatch) {
    const op = valueFieldMatch[3];
    // Suggest operators if they haven't typed a full number yet
    if (!op || op.match(/^[<>]?$/)) {
      // Just a visual hint, not forcing replacement unless unambiguous? 
      // Actually let's just let them type numbers, but maybe hint format?
      // user asked for "autocomplete", maybe simply showing ">" "1" etc?
      // Let's stick to the prompt's simplicity. The user asked for it to "work like normal".
      // The best "autocomplete" here implies hints.
      return value;
    }
  }

  // Kolla först om vi är efter ett datum-fält och ska komplettera en operator
  const dateFieldMatch = value.match(/(^|\s)(created|createdat|updated|updatedat|copied|copiedat|originalcreated|originalcreatedat):([^()\s]*)$/i);
  if (dateFieldMatch) {
    const operatorPrefix = dateFieldMatch[3].toLowerCase();
    if (operatorPrefix.length >= 2) {
      const completion = DATE_OPERATOR_COMPLETIONS.find((op) => op.prefix === operatorPrefix.slice(0, 2));
      if (completion) {
        return value.slice(0, value.length - operatorPrefix.length) + completion.template;
      }
    }
  }

  // Annars, vanlig fält-komplettering
  const match = value.match(/(^|\s)([^()\s:]+)$/);
  if (!match) return value;
  const prefix = match[2].toLowerCase();
  if (prefix.length < 2) return value;
  const completion = FIELD_COMPLETIONS.find((field) => field.startsWith(prefix));
  if (!completion || completion === prefix) return value;
  return value.slice(0, value.length - prefix.length) + completion + ':';
};

const getFieldCompletionHint = (value: string) => {
  // Check for value field hint
  const valueFieldMatch = value.match(/(^|\s)(value):([^()\s]*)$/i);
  if (valueFieldMatch) {
    const currentVal = valueFieldMatch[3];
    if (currentVal === '') return value + '>3'; // Hint: value:>3
    if (currentVal === '>') return value + '3'; // Hint: value:>3
    if (currentVal === '<') return value + '3'; // Hint: value:<3
  }

  // Kolla först om vi är efter ett datum-fält och ska visa operator-hint
  const dateFieldMatch = value.match(/(^|\s)(created|createdat|updated|updatedat|copied|copiedat|originalcreated|originalcreatedat):([^()\s]*)$/i);
  if (dateFieldMatch) {
    const operatorPrefix = dateFieldMatch[3].toLowerCase();
    if (operatorPrefix.length >= 2) {
      const completion = DATE_OPERATOR_COMPLETIONS.find((op) => op.prefix === operatorPrefix.slice(0, 2));
      if (completion) {
        return value.slice(0, value.length - operatorPrefix.length) + completion.template;
      }
    }
  }

  // Annars, vanlig fält-hint
  const match = value.match(/(^|\s)([^()\s:]+)$/);
  if (!match) return null;
  const prefix = match[2].toLowerCase();
  if (prefix.length < 2) return null;
  const completion = FIELD_COMPLETIONS.find((field) => field.startsWith(prefix));
  if (!completion || completion === prefix) return null;
  return value.slice(0, value.length - prefix.length) + completion + ':';
};

interface SearchOverlayProps {
  query: string;
  results: MindNode[];
  onQueryChange: (query: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  theme: Theme;
}

export function SearchOverlay({
  query,
  results,
  onQueryChange,
  onConfirm,
  onClose,
  theme,
}: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const assets = useBrainStore((state) => state.assets);
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const [showHelp, setShowHelp] = useState(false);

  // Fokusera input när overlay öppnas
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'Tab') {
        const nextValue = applyFieldCompletion(query);
        if (nextValue !== query) {
          e.preventDefault();
          onQueryChange(nextValue);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onConfirm, onQueryChange, query]);

  // Beräkna grid-position för resultat
  const getResultPosition = (index: number, total: number) => {
    const cols = Math.min(5, total);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const cardWidth = 220;
    const cardHeight = 160;
    const gap = 20;

    const gridWidth = cols * cardWidth + (cols - 1) * gap;
    const startX = (window.innerWidth - gridWidth) / 2;

    return {
      left: startX + col * (cardWidth + gap),
      top: 150 + row * (cardHeight + gap),
    };
  };

  const cardStyle = {
    backgroundColor: theme.node.bg,
    borderColor: theme.node.border,
    color: theme.node.text,
    boxShadow: `0 10px 30px ${theme.node.shadow || 'rgba(0,0,0,0.25)'}`,
  };

  const inputShellStyle = {
    backgroundColor: theme.node.bg,
    borderColor: theme.node.border,
    color: theme.node.text,
    boxShadow: `0 10px 24px ${theme.node.shadow || 'rgba(0,0,0,0.2)'}`,
  };

  const hintStyle = { color: theme.node.text, opacity: 0.75 };
  const titleStyle = { color: theme.node.text, fontWeight: 600 };
  const tagStyle = {
    backgroundColor: theme.node.selectedBorder || theme.node.border,
    color: theme.node.hotText || theme.node.text,
  };

  const completionHint = getFieldCompletionHint(query);
  const completionSuffix =
    completionHint && completionHint.startsWith(query)
      ? completionHint.slice(query.length)
      : '';

  return (
    <div className="fixed inset-0 z-[90]">
      {/* Bakgrund med lätt dimma som funkar för både ljusa och mörka teman */}
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
        onClick={onClose}
      />

      {/* Sökfält */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <div
          className="rounded-xl shadow-2xl p-2 flex items-center gap-3 border"
          style={inputShellStyle}
        >
          <span className="text-xl pl-2" style={{ color: theme.node.text, opacity: 0.7 }}>/</span>
          <div className="relative w-80">
            {completionSuffix && (
              <div
                className="absolute inset-0 pointer-events-none text-lg whitespace-pre"
                style={{ color: theme.node.text, opacity: 0.35 }}
                aria-hidden="true"
              >
                <span style={{ opacity: 0 }}>{query}</span>
                <span>{completionSuffix}</span>
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => onQueryChange(expandPartialField(e.target.value))}
              placeholder="SБk i kort..."
              className="bg-transparent text-lg outline-none w-full placeholder:opacity-60"
              style={{ color: theme.node.text }}
              autoFocus
            />
          </div>
          <span className="text-sm pr-2" style={hintStyle}>
            {results.length} träffar
          </span>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="text-sm px-2 py-1 rounded hover:bg-opacity-10 hover:bg-white transition-colors"
            style={{ color: theme.node.text, opacity: 0.6 }}
            title="Visa hjälp"
          >
            ?
          </button>
        </div>
        <div className="text-center text-xs mt-2 space-y-1" style={hintStyle}>
          <div>Enter = markera ・ Escape = avbryt ・ Tab = fält (t.ex. title:, createdat:)</div>
          <div className="opacity-75">Datum: createdat:före:ÅÅÅÅ-MM-DD, createdat:efter:ÅÅÅÅ-MM-DD, createdat:mellan:ÅÅÅÅ-MM-DD:ÅÅÅÅ-MM-DD</div>
        </div>
      </div>

      {/* Hjälp-overlay */}
      {showHelp && (
        <div
          className="absolute top-32 right-8 z-20 rounded-xl shadow-2xl p-6 border max-w-md"
          style={inputShellStyle}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg" style={{ color: theme.node.text }}>
                Söksyntax
              </h3>
              <button
                onClick={() => setShowHelp(false)}
                className="text-sm px-2 py-1 rounded hover:bg-opacity-10 hover:bg-white transition-colors"
                style={{ color: theme.node.text, opacity: 0.6 }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-sm" style={{ color: theme.node.text }}>
              <div>
                <div className="font-medium mb-1 opacity-90">Fältsökning:</div>
                <div className="text-xs opacity-60 mb-2">Sök i specifika fält genom att ange fältnamn följt av kolon.</div>
                <div className="text-xs opacity-75 space-y-1">
                  <div><span className="font-mono">title:</span> ord i rubriker</div>
                  <div><span className="font-mono">content:</span> ord i innehållstexten</div>
                  <div><span className="font-mono">tags:</span> taggar som kortet givits (t.ex. viktigt, todo, relationer, arbete)</div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-1 opacity-90">Datumsökning:</div>
                <div className="text-xs opacity-60 mb-2">Hitta kort baserat på när de skapades. Använd svenska (före/efter/mellan) eller engelska (before/after/between).</div>
                <div className="font-mono text-xs opacity-75 space-y-1">
                  <div>created:after:2025-01-01</div>
                  <div>created:before:2025-12-31</div>
                  <div>created:between:2025-01-01:2025-12-31</div>
                  <div className="opacity-60">// Fristående: after:2025-01-01</div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-1 opacity-90">Värdesökning:</div>
                <div className="text-xs opacity-60 mb-2">Hitta kort baserat på värde (1-6).</div>
                <div className="font-mono text-xs opacity-75 space-y-1">
                  <div>value:1</div>
                  <div>value:&gt;3 (4, 5, 6)</div>
                  <div>value:&lt;3 (1, 2)</div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-1 opacity-90">Boolean-operatorer:</div>
                <div className="text-xs opacity-60 mb-2">Kombinera söktermer med AND, OR och NOT. Använd parenteser för att gruppera.</div>
                <div className="text-xs opacity-75 space-y-1.5">
                  <div><span className="font-mono">ord1 AND ord2</span> - t.ex. <span className="italic">spelning AND Eric</span>. Visar alla kort där spelning OCH Eric nämns.</div>
                  <div><span className="font-mono">ord1 OR ord2</span> - t.ex. <span className="italic">skog OR utflykt</span>. Visar kort där skog och/eller utflykt nämns.</div>
                  <div><span className="font-mono">NOT ord</span> - utesluter kort som innehåller ordet.</div>
                  <div><span className="font-mono">(ord1 OR ord2) AND NOT ord3</span> - t.ex. <span className="italic">(skog OR utflykt) AND NOT korv</span>. Visar kort där skog och/eller utflykt nämns men där korv inte står med.</div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-1 opacity-90">Wildcard-sökning:</div>
                <div className="text-xs opacity-60 mb-2">Använd <span className="font-mono">*</span> som jokertecken för att matcha vilka tecken som helst.</div>
                <div className="text-xs opacity-75 space-y-1">
                  <div><span className="font-mono">test*</span> - matchar test, testing, tester, etc.</div>
                  <div><span className="font-mono">*tion</span> - matchar nation, station, relation, etc.</div>
                  <div><span className="font-mono">pro*ing</span> - matchar programming, processing, etc.</div>
                </div>
              </div>

              <div>
                <div className="font-medium mb-1 opacity-90">Autokomplettering:</div>
                <div className="text-xs opacity-75">
                  Tryck <span className="font-mono">Tab</span> efter att ha skrivit början av ett fältnamn (t.ex. <span className="font-mono">cre</span> → <span className="font-mono">createdat:</span>)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resultat-kort */}
      <div className="absolute inset-0 overflow-auto pt-32 pointer-events-none">
        {results.slice(0, 25).map((node, index) => {
          const pos = getResultPosition(index, Math.min(results.length, 25));
          const assetUrl = node.type === 'image' ? resolveImageUrl(node, assets) : null;
          const previewTitle = getNodeDisplayTitle(node);

          return (
            <div
              key={node.id}
              className="absolute w-52 p-3 rounded-lg border transition-all duration-300 pointer-events-auto cursor-pointer hover:scale-105"
              style={{
                left: pos.left,
                top: pos.top,
                ...cardStyle,
                animation: `fadeSlideIn 0.3s ease-out ${index * 0.05}s both`,
              }}
              onClick={() => {
                // Markera detta kort och stäng
                toggleSelection(node.id, false);
                onClose();
              }}
            >
              {previewTitle && (
                <div className="text-sm line-clamp-1 mb-1" style={titleStyle}>
                  {previewTitle}
                </div>
              )}
              {node.type === 'image' && assetUrl ? (
                <div className="space-y-2">
                  <img
                    src={assetUrl}
                    alt=""
                    className="w-full h-24 object-cover rounded"
                  />
                  {node.comment && (
                    <p className="text-xs line-clamp-2" style={{ color: theme.node.text, opacity: 0.9 }}>
                      {node.comment}
                    </p>
                  )}
                </div>
              ) : node.type === 'zotero' ? (
                <div
                  className="text-sm line-clamp-5 max-w-none"
                  style={{ color: theme.node.text }}
                  dangerouslySetInnerHTML={{ __html: node.content }}
                />
              ) : (
                <p className="text-sm line-clamp-5" style={{ color: theme.node.text }}>
                  {node.content}
                </p>
              )}

              {node.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {node.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={tagStyle}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {results.length > 25 && (
          <div
            className="absolute text-sm"
            style={{
              left: '50%',
              transform: 'translateX(-50%)',
              top: getResultPosition(25, 25).top + 180,
              color: theme.node.text,
              opacity: 0.8,
            }}
          >
            +{results.length - 25} fler träffar...
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
