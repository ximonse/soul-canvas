// src/components/overlays/SelectionScopePanel.tsx
// Diskret panel på vänster sida för att expandera urval till kopplade noder

import type { Theme } from '../../themes';

interface DegreeCounts {
  degree: number;
  count: number;
  cumulative: number;
}

interface SelectionScopePanelProps {
  theme: Theme;
  isVisible: boolean;
  baseCount: number;
  currentDegree: number;
  includeInSelection: boolean;
  degreeCounts: DegreeCounts[];
  totalWithScope: number;
  onExpandToScope: (degree: number) => void;
  onToggleInclude: () => void;
  onPreview: (degree: number | null) => void;
  onClose: () => void;
}

// Färger för olika grader
const DEGREE_COLORS: Record<number, string> = {
  1: '#06b6d4', // Cyan
  2: '#8b5cf6', // Lila
  3: '#ec4899', // Rosa
  4: '#f97316', // Orange
  5: '#eab308', // Gul
};

export function SelectionScopePanel({
  theme,
  isVisible,
  baseCount,
  currentDegree,
  includeInSelection,
  degreeCounts,
  totalWithScope,
  onExpandToScope,
  onToggleInclude,
  onPreview,
  onClose,
}: SelectionScopePanelProps) {
  if (!isVisible || baseCount === 0) return null;

  return (
    <div
      className="fixed left-4 top-1/2 -translate-y-1/2 z-40 w-44 rounded-xl backdrop-blur-md border shadow-xl"
      style={{
        backgroundColor: theme.node.bg + 'e6',
        borderColor: theme.node.border,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: theme.node.border }}
      >
        <span className="text-sm font-medium" style={{ color: theme.node.text }}>
          Scope
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-200 text-xs"
          title="Stäng (Esc)"
        >
          ✕
        </button>
      </div>

      {/* Degree rows */}
      <div className="py-1">
        {/* Bas-rad */}
        <button
          onClick={() => onExpandToScope(0)}
          onMouseEnter={() => onPreview(0)}
          onMouseLeave={() => onPreview(null)}
          className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors ${
            currentDegree === 0 ? 'bg-blue-600/30' : 'hover:bg-white/10'
          }`}
          style={{ color: theme.node.text }}
        >
          <span className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: currentDegree === 0 ? '#3b82f6' : '#6b7280' }}
            />
            Bas
          </span>
          <span className="text-xs opacity-70">{baseCount} kort</span>
        </button>

        {/* Grad-rader */}
        {degreeCounts.map(({ degree, count }) => (
          <button
            key={degree}
            onClick={() => onExpandToScope(degree)}
            onMouseEnter={() => onPreview(degree)}
            onMouseLeave={() => onPreview(null)}
            className={`w-full flex items-center justify-between px-3 py-1.5 text-sm transition-colors ${
              currentDegree >= degree ? 'bg-white/10' : 'hover:bg-white/5'
            }`}
            style={{ color: theme.node.text }}
            disabled={count === 0}
          >
            <span className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{
                  backgroundColor: currentDegree >= degree
                    ? DEGREE_COLORS[degree] || '#9ca3af'
                    : '#4b5563',
                }}
              />
              +{degree} grad
            </span>
            <span className="text-xs opacity-70">
              {count > 0 ? `+${count}` : '—'}
            </span>
          </button>
        ))}
      </div>

      {/* Toggle för inkludering */}
      <div
        className="px-3 py-2 border-t"
        style={{ borderColor: theme.node.border }}
      >
        <label className="flex items-center gap-2 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={includeInSelection}
            onChange={onToggleInclude}
            className="w-3.5 h-3.5 rounded"
          />
          <span style={{ color: theme.node.text }} className="opacity-80">
            Inkludera i urval
          </span>
        </label>
      </div>

      {/* Totalt */}
      <div
        className="px-3 py-2 border-t text-xs"
        style={{
          borderColor: theme.node.border,
          color: theme.node.text,
        }}
      >
        <span className="opacity-60">Totalt: </span>
        <span className="font-medium">{totalWithScope} kort</span>
      </div>
    </div>
  );
}
