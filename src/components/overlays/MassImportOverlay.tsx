// src/components/overlays/MassImportOverlay.tsx
import React, { useState, useCallback } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import { type Theme } from '../../themes';

interface MassImportOverlayProps {
  theme: Theme;
  onClose: () => void;
  centerX: number;
  centerY: number;
}

/**
 * Parse mass import text into cards
 * - Double newline (\n\n) separates cards
 * - If last line starts with #, it becomes tags (space-separated)
 */
const parseImportText = (text: string): Array<{ content: string; tags: string[] }> => {
  const blocks = text.split(/\n\n+/).filter(block => block.trim());

  return blocks.map(block => {
    const lines = block.trim().split('\n');
    const lastLine = lines[lines.length - 1];

    // Check if last line is tags (starts with #)
    if (lastLine.trim().startsWith('#')) {
      const tagLine = lines.pop() || '';
      // Extract tags: split by space, filter those starting with #, remove #
      const tags = tagLine
        .split(/\s+/)
        .filter(t => t.startsWith('#'))
        .map(t => t.slice(1).trim())
        .filter(t => t.length > 0);

      return {
        content: lines.join('\n').trim(),
        tags
      };
    }

    return {
      content: block.trim(),
      tags: []
    };
  }).filter(card => card.content.length > 0);
};

const MassImportOverlay: React.FC<MassImportOverlayProps> = ({
  theme,
  onClose,
  centerX,
  centerY
}) => {
  const [text, setText] = useState('');
  const saveStateForUndo = useBrainStore((state) => state.saveStateForUndo);
  const addNodeWithId = useBrainStore((state) => state.addNodeWithId);
  const updateNode = useBrainStore((state) => state.updateNode);

  const cards = parseImportText(text);

  const handleImport = useCallback(() => {
    if (cards.length === 0) return;

    saveStateForUndo();

    const spacing = 300;
    const cols = Math.ceil(Math.sqrt(cards.length));

    cards.forEach((card, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const x = centerX + (col - cols / 2) * spacing;
      const y = centerY + (row - Math.ceil(cards.length / cols) / 2) * spacing;

      const nodeId = crypto.randomUUID();
      addNodeWithId(nodeId, card.content, x, y, 'text');

      if (card.tags.length > 0) {
        updateNode(nodeId, { tags: card.tags });
      }
    });

    onClose();
  }, [cards, saveStateForUndo, addNodeWithId, updateNode, centerX, centerY, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
    // Ctrl+Enter to import
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleImport();
    }
  }, [onClose, handleImport]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: theme.node.bg,
          borderRadius: 12,
          padding: 24,
          width: '600px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{
            margin: 0,
            color: theme.node.text,
            fontFamily: "'Noto Serif', Georgia, serif",
            fontSize: 20
          }}>
            Mass-import
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: theme.node.text,
              fontSize: 24,
              cursor: 'pointer',
              opacity: 0.6
            }}
          >
            ×
          </button>
        </div>

        <p style={{
          margin: 0,
          color: theme.node.text,
          opacity: 0.7,
          fontSize: 14,
          fontFamily: "'Noto Serif', Georgia, serif"
        }}>
          Klistra in text. Dubbla radbrytningar = nytt kort.<br />
          Sista raden med #taggar blir taggar (visas ej på kortet).
        </p>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder={`Första kortet här...

Andra kortet här...
#tagg1 #tagg2

Tredje kortet...`}
          style={{
            width: '100%',
            height: 300,
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${theme.node.border}`,
            backgroundColor: theme.node.bg,
            color: theme.node.text,
            fontFamily: "'Noto Serif', Georgia, serif",
            fontSize: 15,
            resize: 'vertical',
            outline: 'none'
          }}
        />

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{
            color: theme.node.text,
            opacity: 0.6,
            fontSize: 14
          }}>
            {cards.length} kort kommer skapas
          </span>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: `1px solid ${theme.node.border}`,
                backgroundColor: 'transparent',
                color: theme.node.text,
                cursor: 'pointer',
                fontFamily: "'Noto Serif', Georgia, serif"
              }}
            >
              Avbryt
            </button>
            <button
              onClick={handleImport}
              disabled={cards.length === 0}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: 'none',
                backgroundColor: cards.length > 0 ? theme.lineColor : theme.node.border,
                color: cards.length > 0 ? '#fff' : theme.node.text,
                cursor: cards.length > 0 ? 'pointer' : 'not-allowed',
                fontFamily: "'Noto Serif', Georgia, serif",
                fontWeight: 500
              }}
            >
              Importera ({cards.length})
            </button>
          </div>
        </div>

        <span style={{
          color: theme.node.text,
          opacity: 0.4,
          fontSize: 12,
          textAlign: 'right'
        }}>
          Ctrl+Enter för att importera
        </span>
      </div>
    </div>
  );
};

export default MassImportOverlay;
