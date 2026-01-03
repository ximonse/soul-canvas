// src/components/overlays/PdfImportPrompt.tsx

import { useEffect, useRef, useState } from 'react';
import type { Theme } from '../../themes';

interface PdfImportPromptProps {
  suggestedName: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  theme: Theme;
}

export function PdfImportPrompt({
  suggestedName,
  onConfirm,
  onCancel,
  theme,
}: PdfImportPromptProps) {
  const [value, setValue] = useState(suggestedName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const handleSubmit = () => {
    const trimmed = value.trim();
    onConfirm(trimmed || suggestedName);
  };

  return (
    <div
      className="absolute inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm font-serif text-base"
      onMouseDown={onCancel}
    >
      <div
        className="p-6 rounded-2xl shadow-2xl w-[460px] max-w-[90vw]"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl mb-3 font-bold">PDF-gruppnamn</h2>
        <p className="text-sm opacity-80 mb-4">
          Namnet används i filerna och som pdfId-suffix.
        </p>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onCancel();
          }}
          className="w-full bg-black/20 border rounded p-3 mb-4"
          style={{ borderColor: theme.node.border, color: theme.node.text }}
        />
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded border"
            style={{ borderColor: theme.node.border, color: theme.node.text }}
          >
            Avbryt
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 rounded font-semibold"
            style={{ backgroundColor: theme.node.selectedBorder, color: theme.node.text }}
          >
            Spara
          </button>
        </div>
      </div>
    </div>
  );
}
