// components/BulkActionsToolbar.tsx
// UI för bulk-operationer på markerade kort

import React from 'react';

interface BulkActionsToolbarProps {
  selectedCount: number;
  tagInput: string;
  onTagInputChange: (value: string) => void;
  onAddTag: () => void;
  onDelete: () => void;
  onClear: () => void;
  zenMode: boolean;
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  tagInput,
  onTagInputChange,
  onAddTag,
  onDelete,
  onClear,
  zenMode,
}) => {
  if (selectedCount === 0 || zenMode) return null;

  return (
    <div
      className="absolute bottom-10 left-1/2 transform -translate-x-1/2 z-50 bg-gray-800 p-4 rounded-xl shadow-2xl border border-gray-700 flex gap-2 items-center"
      onMouseDown={e => e.stopPropagation()}
    >
      <span className="text-white font-bold">{selectedCount} valda</span>

      {selectedCount > 1 && (
        <>
          <input
            type="text"
            value={tagInput}
            onChange={e => {
              e.stopPropagation();
              onTagInputChange(e.target.value);
            }}
            placeholder="Ny tagg..."
            className="bg-gray-900 text-white px-2 py-1 rounded border border-gray-600 outline-none"
            onKeyDown={e => e.key === 'Enter' && onAddTag()}
          />
          <button
            onClick={onAddTag}
            className="px-3 py-1 bg-blue-600 rounded text-white text-sm"
          >
            Tagga
          </button>
        </>
      )}

      <button
        onClick={onDelete}
        className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded text-white text-sm font-semibold"
      >
        Radera
      </button>

      <button
        onClick={onClear}
        className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm"
      >
        Avbryt
      </button>
    </div>
  );
};
