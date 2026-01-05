// src/components/overlays/CardEditor.tsx
import { useState, useEffect, useRef } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import { type Theme } from '../../themes';
import type { MindNode } from '../../types/types';
import { ImageCropper } from '../ImageCropper';
import { getImageRef, resolveImageUrl } from '../../utils/imageRefs';

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
  const [remindAt, setRemindAt] = useState('');
  const [remindSlider, setRemindSlider] = useState(0);
  const [reminderMenuOpen, setReminderMenuOpen] = useState(false);
  const [accentColor, setAccentColor] = useState<string | undefined>(undefined);
  const [semanticTags, setSemanticTags] = useState<string[]>([]);
  const [showAITags, setShowAITags] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const card = cardId ? nodes.get(cardId) : null;

  const accentColors = ['#ffd400', '#ff6666', '#5fb236', '#2ea8e5', '#a28ae5', '#e56eee', '#f19837', '#aaaaaa'];

  const remindSliderOptions = [
    { label: '-', none: true },
    { label: 'nu', days: 0 },
    { label: '1d', days: 1 },
    { label: '3d', days: 3 },
    { label: '7d', days: 7 },
    { label: '2v', days: 14 },
    { label: '1 m\u00e5n', months: 1 },
    { label: '3 m\u00e5n', months: 3 },
    { label: '6 m\u00e5n', months: 6 },
  ];

  const formatReminderStamp = (date: Date) => {
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${yy}${mm}${dd}_${hh}${min}`;
  };

  const appendReminderDate = (date: Date) => {
    const stamp = formatReminderStamp(date);
    const parts = remindAt
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.includes(stamp)) {
      const next = [...parts, stamp].join(', ');
      setRemindAt(next);
    }
  };

  const addReminderFromSlider = (index: number) => {
    const option = remindSliderOptions[index];
    if (!option || option.none) return;
    const now = new Date();
    const date = new Date(now);
    if (option.months) {
      date.setMonth(date.getMonth() + option.months);
    } else if (typeof option.days === 'number') {
      date.setDate(date.getDate() + option.days);
    }
    appendReminderDate(date);
  };

  const reminderParts = Array.from(new Set(
    remindAt
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
  ));

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (card) {
      const imageRef = getImageRef(card);
      const contentValue = card.content || '';
      const contentIsImageRef = card.type === 'image'
        && Boolean(imageRef)
        && contentValue.trim() === imageRef;
      setContent(contentIsImageRef ? '' : contentValue);
      setTags((card.tags || []).join(', '));
      setTitle(card.title || '');
      setCaption(card.caption || '');
      setComment(card.comment || '');
      setValue(card.value);
      setEventDate(card.event || '');
      setRemindAt(card.remindAt || '');
      setRemindSlider(0);
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
    if (!cardId || !card) return;

    const tagsArray = tags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    const nextLink = linkUrl.trim() ? `[${linkName || 'Link'}](${linkUrl.trim()})` : '';
    const nextEvent = eventDate.trim() ? eventDate.trim() : undefined;
    const nextRemindAt = remindAt.trim() ? remindAt.trim() : undefined;
    const nextTitle = title.trim();
    const nextCaption = caption.trim();
    const nextComment = comment.trim();

    const arraysEqual = (a: string[], b: string[]) =>
      a.length === b.length && a.every((value, index) => value === b[index]);

    const updates: Partial<MindNode> = {};

    const resolvedImageRef = card.type === 'image' ? getImageRef(card) : null;
    const contentWasImageRef = Boolean(
      resolvedImageRef
      && (card.content || '').trim() === resolvedImageRef
    );
    const nextContent = content;

    if (card.type === 'image') {
      if (resolvedImageRef && card.imageRef !== resolvedImageRef) {
        updates.imageRef = resolvedImageRef;
      }
      if (contentWasImageRef) {
        if (nextContent.trim()) {
          if (nextContent !== (card.content || '')) updates.content = nextContent;
        } else if ((card.content || '') !== '') {
          updates.content = '';
        }
      } else if (nextContent !== (card.content || '')) {
        updates.content = nextContent;
      }
    } else if (nextContent !== (card.content || '')) {
      updates.content = nextContent;
    }
    if (nextTitle !== (card.title || '')) updates.title = nextTitle;
    if (nextCaption !== (card.caption || '')) updates.caption = nextCaption;
    if (nextComment !== (card.comment || '')) updates.comment = nextComment;
    if (nextLink !== (card.link || '')) updates.link = nextLink;
    if (!arraysEqual(tagsArray, card.tags || [])) updates.tags = tagsArray;
    if (!arraysEqual(semanticTags, card.semanticTags || [])) updates.semanticTags = semanticTags;
    if (value !== card.value) updates.value = value;
    if ((nextEvent || undefined) !== (card.event || undefined)) updates.event = nextEvent;
    if ((nextRemindAt || undefined) !== (card.remindAt || undefined)) updates.remindAt = nextRemindAt;
    if ((accentColor || undefined) !== (card.accentColor || undefined)) updates.accentColor = accentColor;

    if (Object.keys(updates).length > 0) {
      updateNode(cardId, updates);
    }

    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
          onClose();
        }
      }}
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
          borderStyle: 'solid',
        }}
        onClick={e => e.stopPropagation()}
        onMouseDown={e => e.stopPropagation()}
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
            className="px-4 rounded-lg outline-none text-sm"
            style={{
              backgroundColor: theme.canvasColor,
              paddingTop: '0.2em',
              paddingBottom: '0.2rem',
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
            className="flex-1 px-4 rounded-lg outline-none resize-none text-sm"
            style={{
              minHeight: '200px',
              paddingTop: '0.2em',
              paddingBottom: '0.2rem',
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
              borderColor: theme.node.border,
              borderWidth: '1px',
              borderStyle: 'solid',
              fontFamily: 'Noto Serif, Georgia, serif'
            }}
          />

          <div className="mt-2 flex items-center gap-3">
            <span style={{ color: theme.node.text, fontSize: '0.875rem' }}>Datum:</span>
            <input
              type="text"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              placeholder="YYMMDD_HHMM or YYYY-MM-DD HH:MM"
              className="flex-1 px-3 rounded outline-none text-sm"
              style={{
                backgroundColor: theme.canvasColor,
              paddingTop: '0.2em',
              paddingBottom: '0.2rem',
                color: theme.node.text,
                borderColor: theme.node.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-3">
              <span style={{ color: theme.node.text, fontSize: '0.875rem' }}>Påminn:</span>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={remindSlider}
                onChange={(e) => setRemindSlider(Number(e.target.value))}
                onMouseUp={() => addReminderFromSlider(remindSlider)}
                onTouchEnd={() => addReminderFromSlider(remindSlider)}
                className="flex-1"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setReminderMenuOpen((prev) => !prev)}
                  className="text-xs px-2 py-1 rounded"
                  style={{
                    backgroundColor: theme.canvasColor,
                    color: theme.node.text,
                    border: `1px solid ${theme.node.border}`,
                    minWidth: '160px',
                  }}
                  title="Påminnelser"
                >
                  Påminnelser
                </button>
                {reminderMenuOpen && (
                  <div
                    className="absolute right-0 mt-1 rounded border shadow-lg z-10"
                    style={{
                      backgroundColor: theme.canvasColor,
                      borderColor: theme.node.border,
                      color: theme.node.text,
                      minWidth: '160px',
                    }}
                  >
                    {reminderParts.length === 0 ? (
                      <div className="px-2 py-1 text-xs opacity-60">(inga)</div>
                    ) : (
                      <div className="max-h-40 overflow-y-auto">
                        {reminderParts.map((stamp) => (
                          <div
                            key={stamp}
                            className="flex items-center justify-between gap-3 px-2 py-1 text-xs"
                          >
                            <span>{stamp}</span>
                            <button
                              type="button"
                              onClick={() => {
                                const next = reminderParts.filter((part) => part !== stamp);
                                setRemindAt(next.join(', '));
                                setRemindSlider(0);
                                if (next.length === 0) {
                                  setReminderMenuOpen(false);
                                }
                              }}
                              className="opacity-70 hover:opacity-100"
                              title={`Ta bort ${stamp}`}
                            >
                              x
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    {reminderParts.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setRemindAt('');
                          setRemindSlider(0);
                          setReminderMenuOpen(false);
                        }}
                        className="w-full px-2 py-1 text-xs border-t opacity-70 hover:opacity-100"
                        style={{ borderColor: theme.node.border }}
                        title="Ta bort alla p\u00e5minnelser"
                      >
                        x alla
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex text-xs mt-1" style={{ color: theme.node.text, opacity: 0.6 }}>
              {remindSliderOptions.map((option) => (
                <span key={option.label} className="flex-1 text-center">
                  {option.label}
                </span>
              ))}
            </div>
          </div>


          <input
            type="text"
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Bildtext / caption (synlig under kortet)"
            className="px-4 rounded-lg outline-none text-sm"
            style={{
              backgroundColor: theme.canvasColor,
              paddingTop: '0.2em',
              paddingBottom: '0.2rem',
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
            className="px-4 rounded-lg outline-none text-sm"
            style={{
              backgroundColor: theme.canvasColor,
              paddingTop: '0.2em',
              paddingBottom: '0.2rem',
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
            className="px-4 rounded-lg outline-none text-sm resize-none"
            rows={3}
            style={{
              minHeight: '200px',
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
              borderColor: theme.node.border,
              borderWidth: '1px',
              borderStyle: 'solid',
              paddingTop: '0.2em',
              paddingBottom: '0.2rem'
            }}
          />

          <div className="flex gap-3 items-start">
            <input
              type="text"
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder={"L\u00e4nk (t.ex: https://example.com eller zotero://...)"}
              className="flex-1 px-4 rounded-lg outline-none text-sm"
              style={{
                backgroundColor: theme.canvasColor,
              paddingTop: '0.2em',
              paddingBottom: '0.2rem',
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
              paddingTop: '0.2em',
              paddingBottom: '0.2rem',
                borderColor: theme.node.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            >
              <button
                type="button"
                onClick={() => setShowAITags(!showAITags)}
                className="w-full px-4 text-sm text-left flex items-center justify-between opacity-60 hover:opacity-100"
                style={{ color: theme.node.text, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
                >
                <span>{`F\u00f6rdolda${semanticTags.length > 0 ? ` (${semanticTags.length})` : ''}`}</span>
                <span>{showAITags ? '?-?' : '?-?'}</span>
              </button>

              {showAITags && (
                <div className="px-4 pb-3 flex flex-wrap gap-2">
                  {semanticTags.length === 0 ? (
                    <span className="text-xs opacity-50" style={{ color: theme.node.text }}>
                      {"Inga f\u00f6rdolda taggar. H\u00f6gerklicka p\u00e5 kortet och v\u00e4lj \"Auto-tagga\"."}
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
              className="px-2 rounded outline-none text-sm w-16 text-center"
              style={{
                backgroundColor: theme.canvasColor,
              paddingTop: '0.2em',
              paddingBottom: '0.2rem',
                color: theme.node.text,
                borderColor: theme.node.border,
                borderWidth: '1px',
                borderStyle: 'solid'
              }}
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setAccentColor(undefined)}
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: '#ffffff',
                  borderColor: accentColor ? '#b3b3b3' : '#6b7280',
                  borderWidth: accentColor ? '1px' : '2px',
                  borderStyle: 'solid'
                }}
                aria-label="Ingen accentfarg"
                title="Ingen accentfarg"
              />
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
          </div>
          {(card.pdfId || card.zoteroItemKey) && (
            <div
              className="text-xs mt-2"
              style={{ color: theme.node.text, opacity: 0.6 }}
            >
              {card.pdfId && <div>{`pdfId: ${card.pdfId}`}</div>}
              {card.zoteroItemKey && <div>{`zoteroItemKey: ${card.zoteroItemKey}`}</div>}
            </div>
          )}
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
