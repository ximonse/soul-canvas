// src/components/overlays/ContextMenu.tsx
// Högerklicksmeny för kort

import { useBrainStore } from '../../store/useBrainStore';
import type { MindNode } from '../../types/types';

export interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
}

interface ContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
  onRunOCR: (nodeId: string) => void;
  onRunOCROnSelected?: () => void;
  onAutoTag?: (nodeId: string) => void;
  onAttractSimilar?: () => void;
  onOpenAIChat?: () => void;
  onSummarize?: (nodeId: string) => void;
  onSuggestTitle?: (nodeId: string) => void;
  onAddToChat?: (nodeId: string) => void;
}

export function ContextMenu({
  menu,
  onClose,
  onRunOCR,
  onRunOCROnSelected,
  onAutoTag,
  onAttractSimilar,
  onOpenAIChat,
  onSummarize,
  onSuggestTitle,
  onAddToChat,
}: ContextMenuProps) {
  const store = useBrainStore();
  const node = store.nodes.get(menu.nodeId);
  const selectedNodes = (Array.from(store.nodes.values()) as MindNode[]).filter((n: MindNode) => n.selected);
  const selectedCount = selectedNodes.length;
  const selectedImageCount = selectedNodes.filter((n: MindNode) => n.type === 'image').length;

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

  const handleSummarize = () => {
    onSummarize?.(menu.nodeId);
    onClose();
  };

  const handleSuggestTitle = () => {
    onSuggestTitle?.(menu.nodeId);
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

  const handleAddToChat = () => {
    // Lägg till markerade kort om flera är markerade, annars bara aktuellt kort
    if (selectedCount > 1) {
      selectedNodes.forEach((n: MindNode) => onAddToChat?.(n.id));
    } else {
      onAddToChat?.(menu.nodeId);
    }
    onClose();
  };

  // Check if current node or any selected node has embedding
  const hasEmbedding = node.embedding ||
    (Array.from(store.nodes.values()) as MindNode[]).some((n: MindNode) => n.selected && n.embedding);

  // Session-relaterat
  const isInSession = store.activeSessionId !== null;

  const handleRemoveFromSession = () => {
    if (!store.activeSessionId) return;
    const cardIdsToRemove = selectedCount > 1
      ? selectedNodes.map((n: MindNode) => n.id)
      : [menu.nodeId];
    store.removeCardsFromSession(store.activeSessionId, cardIdsToRemove);
    onClose();
  };

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

      {(node.type === 'image' || selectedImageCount > 0) && (
        <li role="none">
          <button
            onClick={() => {
              if (selectedImageCount > 1 && onRunOCROnSelected) {
                onRunOCROnSelected();
              } else {
                handleOCR();
              }
              onClose();
            }}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-blue-600"
            role="menuitem"
          >
            🔍 Läs & beskriv bild{selectedImageCount > 1 ? `er (${selectedImageCount})` : ''}
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

      {onSummarize && (
        <li role="none">
          <button
            onClick={handleSummarize}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600"
            role="menuitem"
          >
            AI: Summera → kommentar
          </button>
        </li>
      )}

      {onSuggestTitle && (
        <li role="none">
          <button
            onClick={handleSuggestTitle}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-indigo-600"
            role="menuitem"
          >
            AI: Föreslå rubrik
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

      {onAddToChat && (
        <li role="none">
          <button
            onClick={handleAddToChat}
            className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-teal-600"
            role="menuitem"
          >
            📌 Lägg till i chat{selectedCount > 1 ? ` (${selectedCount})` : ''}
          </button>
        </li>
      )}

      {isInSession && (
        <li role="none">
          <button
            onClick={handleRemoveFromSession}
            className="w-full text-left px-4 py-2 text-sm text-orange-400 hover:bg-orange-900/50"
            role="menuitem"
          >
            📤 Ta bort från session{selectedCount > 1 ? ` (${selectedCount})` : ''}
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
