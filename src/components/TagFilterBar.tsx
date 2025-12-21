import React, { useState } from 'react';
import type { TagFilterMode } from '../utils/nodeFilters';

interface TagFilterBarProps {
  mode: TagFilterMode;
  tags: string[];
  onModeChange: (mode: TagFilterMode) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onClear: () => void;
}

export const TagFilterBar: React.FC<TagFilterBarProps> = ({
  mode,
  tags,
  onModeChange,
  onAddTag,
  onRemoveTag,
  onClear,
}) => {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const clean = input.trim();
    if (!clean) return;
    onAddTag(clean);
    setInput('');
  };

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 bg-gray-900/80 text-gray-100 px-3 py-2 rounded-xl border border-gray-700 shadow-lg backdrop-blur"
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="flex gap-1">
        {(['all', 'include', 'exclude'] as TagFilterMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-2 py-1 rounded text-xs font-semibold ${mode === m ? 'bg-blue-500 text-white' : 'bg-gray-800 text-gray-300'}`}
          >
            {m === 'all' ? 'Alla' : m === 'include' ? 'Inkludera' : 'Exkludera'}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="tagg..."
          className="bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700 outline-none"
        />
        <button
          onClick={handleAdd}
          className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded"
        >
          Lägg till
        </button>
      </div>

      <div className="flex items-center gap-1 flex-wrap max-w-[320px]">
        {tags.length === 0 ? (
          <span className="text-xs text-gray-400">Inga filter</span>
        ) : (
          tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-800 border border-gray-700"
            >
              {t}
              <button
                onClick={() => onRemoveTag(t)}
                className="text-gray-400 hover:text-white"
                aria-label={`Ta bort ${t}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <button
        onClick={onClear}
        className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded"
      >
        Rensa
      </button>
    </div>
  );
};
