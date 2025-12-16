// src/components/overlays/ContextMenu.tsx
// Högerklicksmeny för kort

import { useBrainStore } from '../../store/useBrainStore';

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  onRunOCR: (nodeId: string) => void;
  onAutoTag?: (nodeId: string) => void;
  onAttractSimilar?: () => void;
  onOpenAIChat?: () => void;
}

export function ContextMenu({ menu, onClose, onRunOCR, onAutoTag, onAttractSimilar, onOpenAIChat }: ContextMenuProps) {
  const store = useBrainStore();
  const node = store.nodes.get(menu.nodeId);
  const selectedCount = Array.from(store.nodes.values()).filter(n => n.selected).length;

  // Early return if node was deleted while menu was open
  if (!node) {
    onClose();
    return null;
  }

  const handleFlip = () => {
    store.updateNode(menu.nodeId, { isFlipped: !node.isFlipped });
    onClose();
  };

  const handleOCR = () => {
    onRunOCR(menu.nodeId);
    onClose();
  };

  const handleDelete = () => {
    store.removeNode(menu.nodeId);
    onClose();
  };

  const handlePin = () => {
    store.updateNode(menu.nodeId, { pinned: !node.pinned });
    onClose();
  };

  const handleAutoTag = () => {
    onAutoTag?.(menu.nodeId);
    onClose();
  };

  const handleAttractSimilar = () => {
    onAttractSimilar?.();
    onClose();
  };

  const handleChat = () => {
    onOpenAIChat?.();
    onClose();
  };

  // Check if current node or any selected node has embedding
  const hasEmbedding = node.embedding ||
    Array.from(store.nodes.values()).some(n => n.selected && n.embedding);

  return (
    <menu
      className="fixed z-[100] bg-gray-800 border border-gray-700 rounded shadow-xl py-1 w-48 backdrop-blur-md"
      style={{ left: menu.x, top: menu.y }}
      onMouseDown={e => e.stopPropagation()}
      role="menu"
      aria-label="Card actions"
    >
      <li role="none">
        <button
          onClick={handleFlip}
          className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600"
          role="menuitem"
        >
          Vänd kort
        </button>
      </li>

      {node.type === 'image' && (
        <li role="none">
          <button
            onClick={handleOCR}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600"
            role="menuitem"
          >
            AI: Läs text
          </button>
        </li>
      )}

      <li role="none">
        <button
          onClick={handlePin}
          className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600"
          role="menuitem"
        >
          {node.pinned ? 'Avpinna' : 'Pinna'}
        </button>
      </li>

      {onAutoTag && (
        <li role="none">
          <button
            onClick={handleAutoTag}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-purple-600"
            role="menuitem"
          >
            🧠 Auto-tagga{selectedCount > 1 ? ` (${selectedCount})` : ''}
          </button>
        </li>
      )}

      {onAttractSimilar && hasEmbedding && (
        <li role="none">
          <button
            onClick={handleAttractSimilar}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600"
            role="menuitem"
          >
            🧲 Dra till sig liknande{selectedCount > 1 ? ` (${selectedCount})` : ''}
          </button>
        </li>
      )}

      {onOpenAIChat && (
        <li role="none">
          <button
            onClick={handleChat}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-green-600"
            role="menuitem"
          >
            💬 Chatta om valda
          </button>
        </li>
      )}

      <li role="separator" className="h-px bg-gray-700 my-1" aria-hidden="true" />

      <li role="none">
        <button
          onClick={handleDelete}
          className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-900/50"
          role="menuitem"
        >
          Radera
        </button>
      </li>
    </menu>
  );
}
