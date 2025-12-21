// src/components/overlays/ChatContextPanel.tsx
import type { MindNode } from '../../types/types';
import type { Theme } from '../../themes';

interface ChatContextPanelProps {
  pinnedNodes: MindNode[];
  onRemoveNode: (id: string) => void;
  onAddSelected: () => void;
  onClearAll: () => void;
  theme: Theme;
}

function getNodePreview(node: MindNode): string {
  const text = node.ocrText || node.content || '';
  // Strip HTML tags for zotero nodes
  const cleanText = node.type === 'zotero'
    ? text.replace(/<[^>]*>/g, '')
    : text;
  return cleanText.replace(/\s+/g, ' ').slice(0, 60) + (cleanText.length > 60 ? '...' : '');
}

export function ChatContextPanel({
  pinnedNodes,
  onRemoveNode,
  onAddSelected,
  onClearAll,
  theme,
}: ChatContextPanelProps) {
  if (pinnedNodes.length === 0) {
    return (
      <div
        className="px-4 py-2 flex items-center justify-between text-sm"
        style={{ borderBottom: `1px solid ${theme.node.border}33` }}
      >
        <span className="opacity-60">Inga kort indragna</span>
        <button
          className="text-xs px-2 py-1 rounded hover:opacity-80 transition"
          style={{ backgroundColor: `${theme.node.selectedBorder}44` }}
          onClick={onAddSelected}
        >
          + Lägg till markerade
        </button>
      </div>
    );
  }

  return (
    <div
      className="px-4 py-2"
      style={{ borderBottom: `1px solid ${theme.node.border}33` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">
          📌 {pinnedNodes.length} kort i kontext
        </span>
        <div className="flex gap-1">
          <button
            className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition"
            style={{ backgroundColor: `${theme.node.selectedBorder}44` }}
            onClick={onAddSelected}
            title="Lägg till markerade kort"
          >
            +
          </button>
          <button
            className="text-xs px-2 py-0.5 rounded hover:opacity-80 transition opacity-60"
            style={{ backgroundColor: `${theme.node.border}44` }}
            onClick={onClearAll}
            title="Rensa alla"
          >
            ✕
          </button>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
        {pinnedNodes.map(node => (
          <div
            key={node.id}
            className="group flex items-center gap-1 text-xs px-2 py-1 rounded max-w-[200px]"
            style={{
              backgroundColor: `${theme.node.border}33`,
              border: `1px solid ${theme.node.border}55`,
            }}
          >
            <span className="opacity-50">
              {node.type === 'image' ? '🖼' : node.type === 'zotero' ? '📚' : '📝'}
            </span>
            <span className="truncate flex-1" title={getNodePreview(node)}>
              {node.title || getNodePreview(node)}
            </span>
            <button
              className="opacity-0 group-hover:opacity-70 hover:opacity-100 transition ml-1"
              onClick={() => onRemoveNode(node.id)}
              title="Ta bort"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
