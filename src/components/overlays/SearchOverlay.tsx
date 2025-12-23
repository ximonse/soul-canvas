// src/components/overlays/SearchOverlay.tsx
// Sök-overlay som följer aktivt tema

import { useEffect, useRef } from 'react';
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
  'ocr',
  'tags',
  'semantic',
  'created',
  'updated',
  'type',
  'copyref',
  'copied',
  'originalcreated',
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
  const match = value.match(/(^|\s)([^()\s:]+)$/);
  if (!match) return value;
  const prefix = match[2].toLowerCase();
  if (prefix.length < 2) return value;
  const completion = FIELD_COMPLETIONS.find((field) => field.startsWith(prefix));
  if (!completion || completion === prefix) return value;
  return value.slice(0, value.length - prefix.length) + completion + ':';
};

const getFieldCompletionHint = (value: string) => {
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
  const store = useBrainStore();

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
        </div>
        <div className="text-center text-xs mt-2" style={hintStyle}>
          Enter = markera ・ Escape = avbryt ・ Tab = fält (t.ex. title:)
        </div>
      </div>

      {/* Resultat-kort */}
      <div className="absolute inset-0 overflow-auto pt-32 pointer-events-none">
        {results.slice(0, 25).map((node, index) => {
          const pos = getResultPosition(index, Math.min(results.length, 25));
          const assetUrl = node.type === 'image' ? resolveImageUrl(node, store.assets) : null;
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
                store.toggleSelection(node.id, false);
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
