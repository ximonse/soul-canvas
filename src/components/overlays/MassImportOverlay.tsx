import React, { useState, useCallback } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import { type Theme } from '../../themes';
import type { MindNode } from '../../types/types';
import { parseImportText } from './massImport';

interface MassImportOverlayProps {
  theme: Theme;
  onClose: () => void;
  centerX: number;
  centerY: number;
}

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

      if (card.title || card.tags.length > 0) {
        const updates: Partial<MindNode> = {};
        if (card.title) updates.title = card.title;
        if (card.tags.length > 0) updates.tags = card.tags;
        updateNode(nodeId, updates);
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

        <div style={{
          margin: 0,
          color: theme.node.text,
          opacity: 0.7,
          fontSize: 14,
          fontFamily: "'Noto Serif', Georgia, serif",
          display: 'flex',
          flexDirection: 'column',
          gap: 4
        }}>
          <p style={{ margin: 0 }}>Klistra in text. Dubbla radbrytningar = nytt kort.</p>
          <p style={{ margin: 0 }}><strong>Första raden blir rubrik</strong> ( # tas bort automatiskt).</p>
          <p style={{ margin: 0 }}>Sista raden med #taggar blir taggar.</p>
        </div>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder={`# Rubrik här
Här kommer själva texten...

Nästa kort med rubrik
Och innehåll
#tagg1 #tagg2`}
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
