import { useState } from 'react';
import type { Theme } from '../../themes';
import type { ImportPickerOptions } from '../../hooks/useImportHandlers';

interface ImportOptionsModalProps {
  theme: Theme;
  claudeAvailable: boolean;
  onClose: () => void;
  onChooseFiles: (options: ImportPickerOptions) => void | Promise<void>;
}

export function ImportOptionsModal({
  theme,
  claudeAvailable,
  onClose,
  onChooseFiles,
}: ImportOptionsModalProps) {
  const [smartMarkdown, setSmartMarkdown] = useState(false);

  return (
    <div
      className="absolute inset-0 z-[130] flex items-center justify-center bg-black/50 backdrop-blur-sm font-serif text-base"
      onMouseDown={onClose}
    >
      <div
        className="p-6 rounded-2xl shadow-2xl w-[520px] max-w-[90vw]"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl mb-3 font-bold">Importera filer</h2>
        <p className="text-sm opacity-80 mb-4">
          Stöder bilder, JSON, HTML/Zotero, PDF, RIS och Obsidian-markdown.
        </p>

        <label className="flex items-start gap-3 mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={smartMarkdown}
            disabled={!claudeAvailable}
            onChange={(e) => setSmartMarkdown(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm leading-6">
            <strong>AI smart-import för markdownfiler</strong>
            <br />
            Dela upp `.md`-filer i flera kort med summeringar, citat, idéer och konkreta punkter.
            Vanlig import för andra filtyper påverkas inte.
          </span>
        </label>

        {!claudeAvailable && (
          <p className="text-sm mb-4" style={{ color: '#f59e0b' }}>
            Claude-nyckel saknas. AI smart-import är därför avstängd.
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded border"
            style={{ borderColor: theme.node.border, color: theme.node.text }}
          >
            Avbryt
          </button>
          <button
            onClick={() => onChooseFiles({ smartMarkdown })}
            className="px-4 py-2 rounded font-semibold"
            style={{ backgroundColor: theme.node.selectedBorder, color: theme.node.text }}
          >
            Välj filer
          </button>
        </div>
      </div>
    </div>
  );
}
