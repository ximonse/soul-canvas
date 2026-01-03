import { useEffect, useRef, useState } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import type { Theme } from '../../themes';
import { DEFAULT_OCR_PROMPT } from '../../utils/gemini';

interface OcrPromptModalProps {
  onClose: () => void;
  theme: Theme;
}

export const OcrPromptModal = ({ onClose, theme }: OcrPromptModalProps) => {
  const ocrPrompt = useBrainStore((state) => state.ocrPrompt);
  const setOcrPrompt = useBrainStore((state) => state.setOcrPrompt);
  const [draft, setDraft] = useState(ocrPrompt);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraft(ocrPrompt);
  }, [ocrPrompt]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.focus();
    const len = el.value.length;
    el.setSelectionRange(len, len);
  }, []);

  const handleSave = () => {
    setOcrPrompt(draft);
    onClose();
  };

  const handleReset = () => {
    setDraft(DEFAULT_OCR_PROMPT.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm font-serif"
      onClick={onClose}
    >
      <div
        className="w-[760px] max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <header
          className="p-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${theme.node.border}` }}
        >
          <h3 className="text-lg font-semibold">OCR-prompt</h3>
          <button
            onClick={onClose}
            className="text-2xl leading-none opacity-60 hover:opacity-100"
            style={{ color: theme.node.text }}
            aria-label="Close editor"
          >
            ×
          </button>
        </header>

        <div className="p-4 flex flex-col gap-3 overflow-y-auto max-h-[65vh]">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full rounded-lg outline-none resize-none text-sm"
            rows={12}
            style={{
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
              borderColor: theme.node.border,
              borderWidth: '1px',
              borderStyle: 'solid',
              padding: '0.6rem 0.8rem',
              fontFamily: 'Noto Serif, Georgia, serif',
            }}
          />

          <div
            className="rounded-lg p-3 text-sm"
            style={{
              backgroundColor: theme.canvasColor,
              border: `1px solid ${theme.node.border}`,
              color: theme.node.text,
              opacity: 0.8,
            }}
          >
            <div className="font-semibold mb-2">Tips f\u00f6r en bra OCR-prompt</div>
            <ul className="list-disc ml-5 space-y-1">
              <li>Var tydlig med exakta JSON-nycklar och format.</li>
              <li>S\u00e4g vilket spr\u00e5k svaret ska vara p\u00e5.</li>
              <li>Beskriv vad som ska ignoreras eller l\u00e4mnas tomt.</li>
              <li>H\u00e5ll instruktionerna korta och prioriterade.</li>
            </ul>
          </div>
        </div>

        <footer
          className="p-4 flex items-center justify-between"
          style={{ borderTop: `1px solid ${theme.node.border}` }}
        >
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-2 rounded-lg text-sm opacity-70 hover:opacity-100"
            style={{
              backgroundColor: theme.canvasColor,
              color: theme.node.text,
            }}
          >
            \u00c5terst\u00e4ll standard
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm opacity-70 hover:opacity-100"
              style={{
                backgroundColor: theme.canvasColor,
                color: theme.node.text,
              }}
            >
              Avbryt
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{
                backgroundColor: theme.node.selectedBorder,
                color: theme.node.bg,
              }}
            >
              Spara
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};
