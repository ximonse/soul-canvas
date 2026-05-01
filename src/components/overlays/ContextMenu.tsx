import { useLayoutEffect, useRef } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import type { MindNode } from '../../types/types';
import { clampMenuPosition } from './contextMenuPosition';

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
  onTagSelected?: () => void;
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
  onTagSelected,
}: ContextMenuProps) {
  const nodes = useBrainStore((state) => state.nodes);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const updateNode = useBrainStore((state) => state.updateNode);
  const removeNode = useBrainStore((state) => state.removeNode);
  const activeSessionId = useBrainStore((state) => state.activeSessionId);
  const removeCardsFromSession = useBrainStore((state) => state.removeCardsFromSession);

  const menuRef = useRef<HTMLMenuElement>(null);

  const node = nodes.get(menu.nodeId);
  const selectedNodes = Array.from(selectedNodeIds)
    .map(id => nodes.get(id))
    .filter(Boolean) as MindNode[];
  const selectedCount = selectedNodes.length;
  const selectedImageCount = selectedNodes.filter((n: MindNode) => n.type === 'image').length;
  const useSelectedImages = selectedImageCount > 0 && Boolean(onRunOCROnSelected);
  const accentColors = ['#ffd400', '#ff6666', '#5fb236', '#2ea8e5', '#a28ae5', '#e56eee', '#f19837', '#aaaaaa'];

  // Justera position för att stanna inom viewport
  useLayoutEffect(() => {
    const menuElement = menuRef.current;
    if (!menuElement) return;

    const rect = menuElement.getBoundingClientRect();
    const adjustedPos = clampMenuPosition({
      x: menu.x,
      y: menu.y,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });

    menuElement.style.left = `${adjustedPos.x}px`;
    menuElement.style.top = `${adjustedPos.y}px`;
  }, [menu.x, menu.y]);

  if (!node) {
    onClose();
    return null;
  }

  const handleFlip = () => {
    if (selectedCount > 1) {
      selectedNodes.forEach((n: MindNode) => {
        updateNode(n.id, { isFlipped: !n.isFlipped });
      });
    } else {
      updateNode(menu.nodeId, { isFlipped: !node.isFlipped });
    }
    onClose();
  };

  const handleFlipSelected = () => {
    selectedNodes.forEach((n: MindNode) => {
      if (n.type === 'image') {
        updateNode(n.id, { isFlipped: !n.isFlipped });
      }
    });
    onClose();
  };

  const handleOCR = () => {
    onRunOCR(menu.nodeId);
    onClose();
  };

  const handleDelete = () => {
    removeNode(menu.nodeId);
    onClose();
  };

  const handlePin = () => {
    updateNode(menu.nodeId, { pinned: !node.pinned });
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
    if (selectedCount > 1) {
      selectedNodes.forEach((n: MindNode) => onAddToChat?.(n.id));
    } else {
      onAddToChat?.(menu.nodeId);
    }
    onClose();
  };

  const handleTagSelected = () => {
    onTagSelected?.();
    onClose();
  };

  const hasEmbedding = node.embedding || selectedNodes.some((n: MindNode) => n.embedding);
  const isInSession = activeSessionId !== null;

  const handleRemoveFromSession = () => {
    if (!activeSessionId) return;
    const cardIdsToRemove = selectedCount > 1
      ? selectedNodes.map((n: MindNode) => n.id)
      : [menu.nodeId];
    removeCardsFromSession(activeSessionId, cardIdsToRemove);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[10000]"
      onMouseDown={onClose}
      onContextMenu={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <menu
        ref={menuRef}
        className="arrow-action-menu"
        style={{ left: menu.x, top: menu.y }}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => e.stopPropagation()}
        role="menu"
      >
        <button onClick={handleFlip} className="arrow-action-item">
          Vänd kort
        </button>

        {selectedImageCount > 1 && (
          <button onClick={handleFlipSelected} className="arrow-action-item">
            🔄 Vänd alla markerade ({selectedImageCount})
          </button>
        )}

        {(node.type === 'image' || selectedImageCount > 0) && (
          <button
            onClick={() => {
              if (useSelectedImages && onRunOCROnSelected) {
                onRunOCROnSelected();
              } else {
                handleOCR();
              }
            }}
            className="arrow-action-item"
          >
            🔍 Läs & beskriv bild{selectedImageCount > 1 ? `er (${selectedImageCount})` : ''}
          </button>
        )}

        <button onClick={handlePin} className="arrow-action-item">
          {node.pinned ? 'Avpinna' : 'Pinna'}
        </button>

        {onAutoTag && (
          <button onClick={handleAutoTag} className="arrow-action-item">
            🧠 Auto-tagga{selectedCount > 1 ? ` (${selectedCount})` : ''}
          </button>
        )}

        {onTagSelected && selectedCount > 0 && (
          <button onClick={handleTagSelected} className="arrow-action-item">
            🏷️ Tagga markerade ({selectedCount})
          </button>
        )}

        {onSummarize && (
          <button onClick={handleSummarize} className="arrow-action-item">
            AI: Summera → kommentar{selectedCount > 1 ? ` (${selectedCount})` : ''}
          </button>
        )}

        {onSuggestTitle && (
          <button onClick={handleSuggestTitle} className="arrow-action-item">
            AI: Föreslå rubrik{selectedCount > 1 ? ` (${selectedCount})` : ''}
          </button>
        )}

        {/* Value Submenu */}
        <div className="relative group">
          <button className="arrow-action-item flex justify-between items-center w-full">
            <span>Värde (1-6)</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <div className="absolute left-[90%] top-0 pl-6 hidden group-hover:block z-[10001]">
            <div className="arrow-action-menu relative">
              {/* Invisible bridge item to catch hover between parent and child */}
              <div className="absolute -left-10 top-0 bottom-0 w-12 bg-transparent cursor-default" />

              {[1, 2, 3, 4, 5, 6].map((val) => (
                <button
                  key={val}
                  onClick={() => {
                    if (selectedCount > 1) {
                      selectedNodes.forEach(n => updateNode(n.id, { value: val }));
                    } else {
                      updateNode(menu.nodeId, { value: val });
                    }
                    onClose();
                  }}
                  className="arrow-action-item"
                >
                  {val === node.value ? '✅ ' : ''}{val}
                </button>
              ))}
              <div className="h-px bg-white/10 my-1 mx-2"></div>
              <button
                onClick={() => {
                  const targets = selectedCount > 1 ? selectedNodes : [node];
                  targets.forEach(n => updateNode(n.id, { value: undefined }));
                  onClose();
                }}
                className="arrow-action-item text-red-400"
              >
                Rensa värde
              </button>
            </div>
          </div>
        </div>

        {/* Accent Color Submenu */}
        <div className="relative group">
          <button className="arrow-action-item flex justify-between items-center w-full">
            <span>Accentfärg</span>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6" /></svg>
          </button>
          <div className="absolute left-[90%] top-0 pl-6 hidden group-hover:block z-[10001]">
            <div className="arrow-action-menu relative">
              {/* Invisible bridge item to catch hover between parent and child */}
              <div className="absolute -left-10 top-0 bottom-0 w-12 bg-transparent cursor-default" />

              <div className="p-2 flex flex-wrap gap-2 max-w-[140px]">
                {accentColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      const targets = selectedCount > 1 ? selectedNodes : [node];
                      targets.forEach(n => updateNode(n.id, { accentColor: color }));
                      onClose();
                    }}
                    className="w-5 h-5 rounded-full border border-white/20 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <div className="h-px bg-white/10 my-1 mx-2"></div>
              <button
                onClick={() => {
                  const targets = selectedCount > 1 ? selectedNodes : [node];
                  targets.forEach(n => updateNode(n.id, { accentColor: undefined }));
                  onClose();
                }}
                className="arrow-action-item text-red-400"
              >
                Rensa accent
              </button>
            </div>
          </div>
        </div>

        {onAttractSimilar && hasEmbedding && (
          <button onClick={handleAttractSimilar} className="arrow-action-item">
            🧲 Liknande{selectedCount > 1 ? ` (${selectedCount})` : ''}
          </button>
        )}

        {onOpenAIChat && (
          <button onClick={handleChat} className="arrow-action-item">
            💬 Chatta om valda
          </button>
        )}

        {onAddToChat && (
          <button onClick={handleAddToChat} className="arrow-action-item">
            📌 Lägg till i chat{selectedCount > 1 ? ` (${selectedCount})` : ''}
          </button>
        )}

        {isInSession && (
          <button onClick={handleRemoveFromSession} className="arrow-action-item text-orange-400">
            📤 Ta bort från session
          </button>
        )}

        <div className="h-px bg-white/10 my-1 mx-2" />

        <button onClick={handleDelete} className="arrow-action-item delete-chain">
          Radera
        </button>
      </menu>
    </div>
  );
}
