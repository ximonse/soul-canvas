// src/components/overlays/CardEditor.tsx
import { useState, useEffect, useRef } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import { type Theme } from '../../themes';
import { ImageCropper } from '../ImageCropper';
import { resolveImageUrl } from '../../utils/imageRefs';

interface CardEditorProps {
  cardId: string | null;
  onClose: () => void;
  theme: Theme;
}

export const CardEditor = ({ cardId, onClose, theme }: CardEditorProps) => {
  const nodes = useBrainStore((state) => state.nodes);
  const updateNode = useBrainStore((state) => state.updateNode);
  const assets = useBrainStore((state) => state.assets);
  const loadAssets = useBrainStore((state) => state.loadAssets);
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [comment, setComment] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState(''); // Keep existing name from Zotero
  const [value, setValue] = useState<number | undefined>(undefined);
  const [eventDate, setEventDate] = useState('');
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined);
  const [semanticTags, setSemanticTags] = useState<string[]>([]);
  const [showAITags, setShowAITags] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const eventInputRef = useRef<HTMLInputElement>(null);

  const card = cardId ? nodes.get(cardId) : null;

  const accentColors = ['#ffd400', '#ff6666', '#5fb236', '#2ea8e5', '#a28ae5', '#e56eee', '#f19837', '#aaaaaa'];

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (card) {
      setContent(card.content || '');
      setTags((card.tags || []).join(', '));
      setTitle(card.title || '');
      setCaption(card.caption || '');
      setComment(card.comment || '');
      setValue(card.value);
      setEventDate(card.event || '');
      setAccentColor(card.accentColor);

      // Parse link field if it exists
      if (card.link) {
        const linkMatch = card.link.match(/\[(.*)\]\((.*)\)/);
        if (linkMatch) {
          setLinkName(linkMatch[1] || 'Link');
          setLinkUrl(linkMatch[2] || '');
        } else {
          setLinkName('Link');
          setLinkUrl(card.link);
        }
      } else {
        setLinkName('Link');
        setLinkUrl('');
      }

      setSemanticTags(card.semanticTags || []);

      // Focus textarea after a short delay
      const timeoutId = setTimeout(() => {
        textareaRef.current?.focus();
        const len = textareaRef.current?.value.length || 0;
        textareaRef.current?.setSelectionRange(len, len);
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [card]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = () => {
    if (!cardId) return;

    const tagsArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    updateNode(cardId, {
      content,
      tags: tagsArray,
      title: title.trim(),
      caption: caption.trim(),
      comment: comment.trim(),
      value: value,
      event: eventDate.trim() ? eventDate.trim() : undefined,
      accentColor: accentColor,
      link: linkUrl.trim() ? `[${linkName || 'Link'}](${linkUrl.trim()})` : '',
      semanticTags: semanticTags,
    });

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'd' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const activeEl = document.activeElement;
      const isInput = activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement;
      if (!isInput) {
        e.preventDefault();
        e.stopPropagation();
        eventInputRef.current?.focus();
        eventInputRef.current?.select();
        return;
      }
    }

    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      // Ctrl+Enter or Cmd+Enter to save
      handleSave();
    }
  };

  if (!card) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="card-editor-title"
    >
      <div
        className="w-[800px] max-h-[80vh] backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          backgroundColor: theme.node.bg,
          borderColor: theme.node.border,
          borderWidth: '1px',
          borderStyle: 'solid'
        }}
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <header
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${theme.node.border}` }}
        >
          <h3
            id="card-editor-title"
            className="text-lg font-semibold"
            style={{ color: theme.node.text }}
          >
            Redigera kort
          </h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none opacity-60 hover:opacity-100"
            style={{ color: theme.node.text }}
            aria-label="Close editor"
          >
            ×
          </button>
        </header>

        {/* Body */}
        <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
          {/* Image display for image cards */}
          {card?.type === 'image' && resolveImageUrl(card, assets) && (
            <div className="relative">
              <img
                src={resolveImageUrl(card, assets) || undefined}
                alt={card.caption || ''}
                className="w-full object-contain rounded"
                style={{ backgroundColor: theme.canvasColor }}
              />
              <button
                onClick={() => setShowCropper(true)}
                className="absolute top-2 right-2 px-3 py-1 rounded text-sm font-semibold"
                style={{
                  backgroundColor: theme.node.selectedBg,
                  color: theme.node.text,
                }}
              >
                ✂️ Beskär
              </button>
            </div>
          )}

          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Rubrik (visas på kortet)"
            className="px-4 py-2 rounded-lg outline-none text-sm"
            style={{
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
              borderColor: theme.node.border,
              borderWidth: '1px',
              borderStyle: 'solid',
              fontWeight: 600
            }}
          />

          <textarea
            ref={textareaRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Skriv din anteckning här..."
            className="flex-1 px-4 py-3 rounded-lg outline-none resize-none text-sm"
            style={{
              minHeight: '300px',
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
              borderColor: theme.node.border,
              borderWidth: '1px',
              borderStyle: 'solid',
              fontFamily: 'Noto Serif, Georgia, serif'
            }}
          />

          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Bildtext / caption (synlig under kortet)"
            className="px-4 py-2 rounded-lg outline-none text-sm"
            style={{
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
              borderColor: theme.node.border,
              borderWidth: '1px',
              borderStyle: 'solid',
              fontStyle: 'italic'
            }}
          />

          <input
            type="text"
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="Taggar (kommaseparerade, t.ex: viktigt, projekt, idé)"
            className="px-4 py-2 rounded-lg outline-none text-sm"
            style={{
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
              borderColor: theme.node.border,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          />

          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Anteckning (visas vid hover, stödjer [länkar](url) och #rubriker)"
            className="px-4 py-2 rounded-lg outline-none text-sm resize-none"
            rows={3}
            style={{
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
              borderColor: theme.node.border,
              borderWidth: '1px',
              borderStyle: 'solid'
            }}
          />

          <div className="flex gap-3 items-start">
            <input
              type="text"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="L\u00e4nk (t.ex: https://example.com eller zotero://...)"
              className="flex-1 px-4 py-2 rounded-lg outline-none text-sm"
              style={{
                backgroundColor: theme.canvasColor,
                color: theme.node.text,
                borderColor: theme.node.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />

            {/* Expanderbar AI-taggar sektion ("det undermedvetna") */}
            <div
              className="flex-1 rounded-lg overflow-hidden"
              style={{
                backgroundColor: theme.canvasColor,
                borderColor: theme.node.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <button
                type="button"
                onClick={() => setShowAITags(!showAITags)}
                className="w-full px-4 py-2 text-sm text-left flex items-center justify-between opacity-60 hover:opacity-100"
                style={{ color: theme.node.text }}
              >
                <span>F\u00f6rdolda {semanticTags.length > 0 && `(${semanticTags.length})`}</span>
                <span>{showAITags ? '?-?' : '?-?'}</span>
              </button>

              {showAITags && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {semanticTags.length === 0 ? (
                    <span className="text-xs opacity-50" style={{ color: theme.node.text }}>
                      Inga f\u00f6rdolda taggar. H\u00f6gerklicka p\u00e5 kortet och v\u00e4lj "Auto-tagga".
                    </span>
                  ) : (
                    semanticTags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                        style={{
                          backgroundColor: theme.node.selectedBorder + '30',
                          color: theme.node.text
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => setSemanticTags(semanticTags.filter((_, i) => i !== index))}
                          className="opacity-60 hover:opacity-100 ml-1"
                          aria-label={`Ta bort tagg: ${tag}`}
                        >
                          ?-
                        </button>
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Value Input (Placed at bottom as requested) */}
          <div className="flex items-center gap-2 mt-2">
            <span style={{ color: theme.node.text, fontSize: '0.875rem' }}>Värde (1-6):</span>
            <input
              type="number"
              min="1"
              max="6"
              value={value || ''}
              onChange={(e) => {
                // Allow empty string to clear
                if (e.target.value === '') {
                  setValue(undefined);
                  return;
                }
                const val = parseInt(e.target.value, 10);
                if (!isNaN(val) && val >= 1 && val <= 6) {
                  setValue(val);
                }
              }}
              placeholder="-"
              className="px-2 py-1 rounded outline-none text-sm w-16 text-center"
              style={{
                backgroundColor: theme.canvasColor,
                color: theme.node.text,
                borderColor: theme.node.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />
            <div className="flex items-center gap-1">
              {accentColors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setAccentColor(color)}
                  className="w-4 h-4 rounded-full"
                  style={{
                    backgroundColor: color,
                    borderColor: accentColor === color ? theme.node.text : theme.node.border,
                    borderWidth: accentColor === color ? '2px' : '1px',
                    borderStyle: 'solid'
                  }}
                  aria-label={`Accent color ${color}`}
                  title={color}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setAccentColor(undefined)}
              className="text-xs opacity-60 hover:opacity-100"
              style={{ color: theme.node.text }}
            >
              Rensa accent
            </button>
            <span className="text-xs opacity-50" style={{ color: theme.node.text }}>(1=Viktigast, 6=Lägst)</span>
          </div>
          <div className="flex items-center gap-2">
            <span style={{ color: theme.node.text, fontSize: '0.875rem' }}>Event:</span>
            <input
              ref={eventInputRef}
              type="text"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="YYMMDD_HHMM or YYYY-MM-DD HH:MM"
              className="flex-1 px-3 py-1 rounded outline-none text-sm"
              style={{
                backgroundColor: theme.canvasColor,
                color: theme.node.text,
                borderColor: theme.node.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />
            <span className="text-xs opacity-50" style={{ color: theme.node.text }}>Shortcut: d</span>
          </div>

        </div>

        {/* Footer */}
        <footer
          className="p-4 flex items-center justify-between"
          style={{ borderTop: `1px solid ${theme.node.border}` }}
        >
          <div className="text-xs opacity-60 flex gap-4" style={{ color: theme.node.text }}>
            <span><kbd className="px-2 py-1 rounded" style={{ backgroundColor: theme.canvasColor }}>Esc</kbd> Stäng</span>
            <span><kbd className="px-2 py-1 rounded" style={{ backgroundColor: theme.canvasColor }}>Ctrl+Enter</kbd> Spara</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm opacity-70 hover:opacity-100"
              style={{
                backgroundColor: theme.canvasColor,
                color: theme.node.text
              }}
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.node.selectedBorder,
                color: theme.node.bg
              }}
            >
              Spara
            </button>
          </div>
        </footer>
      </div>

      {/* Image Cropper Modal */}
      {showCropper && card?.type === 'image' && (
        <ImageCropper
          imageUrl={resolveImageUrl(card, assets) || ''}
          onSave={(croppedImageData) => {
            // Generate unique ID for cropped image
            const croppedId = `cropped_${card.id}_${Date.now()}`;

            // Save cropped image to assets (merge with existing)
            const newAssets = { ...assets, [croppedId]: croppedImageData };
            loadAssets(newAssets);

            // Update card to use cropped image
            updateNode(card.id, { imageRef: croppedId });

            setShowCropper(false);
          }}
          onClose={() => setShowCropper(false)}
          theme={theme}
        />
      )}
    </div>
  );
};
