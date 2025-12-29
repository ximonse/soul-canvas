// src/components/ColumnView.tsx
import React, { useMemo, useCallback } from 'react';
import type { MindNode, Synapse } from '../types/types';
import type { Theme } from '../themes';
import { sortNodes } from '../utils/sortNodes';
import { getNodeDisplayTitle } from '../utils/nodeDisplay';
import { resolveImageUrl } from '../utils/imageRefs';
import { useBrainStore } from '../store/useBrainStore';

interface ColumnViewProps {
  nodes: MindNode[];
  synapses: Synapse[];
  theme: Theme;
  onEditCard: (id: string) => void;
  onContextMenu: (nodeId: string, pos: { x: number; y: number }) => void;
}

// Räkna kopplingar för ett kort
function countConnections(nodeId: string, synapses: Synapse[]): number {
  return synapses.filter(s => s.sourceId === nodeId || s.targetId === nodeId).length;
}

// Formatera datum
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('sv-SE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// Strippa HTML och trunkera text
function getPreviewText(content: string, maxLength = 200): string {
  // Ta bort HTML-taggar
  const stripped = content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (stripped.length <= maxLength) return stripped;
  return stripped.substring(0, maxLength) + '...';
}

export const ColumnView: React.FC<ColumnViewProps> = ({
  nodes,
  synapses,
  theme,
  onEditCard,
  onContextMenu,
}) => {
  const columnSort = useBrainStore((state) => state.columnSort);
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const columnShowComments = useBrainStore((state) => state.columnShowComments);
  const columnShowTags = useBrainStore((state) => state.columnShowTags);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const assets = useBrainStore((state) => state.assets);

  // Sortera nodes
  const sortedNodes = useMemo(
    () => sortNodes(nodes, columnSort, synapses),
    [nodes, columnSort, synapses]
  );

  // Hantera klick på kort
  const handleCardClick = useCallback((node: MindNode, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection (multi = true för att behålla andra markeringar)
      toggleSelection(node.id, true);
    } else {
      onEditCard(node.id);
    }
  }, [onEditCard, toggleSelection]);

  // Hantera checkbox
  const handleCheckbox = useCallback((node: MindNode, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    // Multi = true för att kunna markera flera med checkboxar
    toggleSelection(node.id, true);
  }, [toggleSelection]);

  // Hantera högerklick
  const handleContextMenu = useCallback((node: MindNode, e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(node.id, { x: e.clientX, y: e.clientY });
  }, [onContextMenu]);

  return (
    <div
      className="absolute inset-0 overflow-auto pt-16"
      style={{
        backgroundColor: theme.canvasColor,
        color: theme.node.text,
      }}
    >
      {/* Kortlista */}
      <div className="max-w-2xl mx-auto py-4 px-4 space-y-3 pb-32">
        {sortedNodes.map((node) => {
          const connections = countConnections(node.id, synapses);
          const tagCount = (node.tags?.length || 0) + (node.semanticTags?.length || 0);
          const displayTitle = getNodeDisplayTitle(node);
          const isSelected = selectedNodeIds.has(node.id);
          const imageUrl = node.type === 'image' ? resolveImageUrl(node, assets) : null;

          return (
            <div
              key={node.id}
              onClick={(e) => handleCardClick(node, e)}
              onContextMenu={(e) => handleContextMenu(node, e)}
              className="rounded-lg cursor-pointer transition-all hover:scale-[1.01]"
              style={{
                backgroundColor: isSelected ? theme.node.selectedBg : theme.node.bg,
                border: `1px solid ${isSelected ? theme.node.selectedBorder : theme.node.border}`,
                boxShadow: isSelected
                  ? `0 0 6px ${theme.node.selectedShadow}`
                  : `0 2px 4px ${theme.node.shadow}`,
                fontFamily: "'Noto Serif', Georgia, serif",
                opacity: isSelected ? 0.95 : 1,
              }}
            >
              {/* Accent stripe för Zotero-kort */}
              {node.accentColor && (
                <div
                  className="h-1 rounded-t-lg"
                  style={{ backgroundColor: node.accentColor }}
                />
              )}

              <div className="p-4">
                {/* Header med checkbox och metadata */}
                <div className="flex items-start gap-3 mb-2">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={(e) => handleCheckbox(node, e)}
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 w-4 h-4 cursor-pointer"
                  />

                  <div className="flex-1 min-w-0">
                    {/* Titel om finns */}
                    {displayTitle && (
                      <h3
                        className="font-semibold mb-1 truncate"
                        style={{ color: theme.node.text }}
                      >
                        {displayTitle}
                      </h3>
                    )}

                    {/* Bild för image-kort */}
                    {imageUrl && (
                      <img
                        src={imageUrl}
                        alt={node.caption || ''}
                        className="w-full h-48 object-cover rounded mb-2"
                      />
                    )}

                    {/* Innehåll preview */}
                    <p
                      className="text-sm leading-relaxed whitespace-pre-wrap"
                      style={{ color: theme.node.text, opacity: 0.85 }}
                    >
                      {node.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                    </p>

                    {/* Caption om finns */}
                    {node.caption && (
                      <p
                        className="text-sm mt-2 italic"
                        style={{ color: theme.node.text, opacity: 0.7 }}
                      >
                        {node.caption}
                      </p>
                    )}

                    {/* Kommentar om visas */}
                    {columnShowComments && node.comment && (
                      <p
                        className="text-sm mt-2 p-2 rounded"
                        style={{
                          backgroundColor: theme.canvasColor,
                          color: theme.node.text,
                          opacity: 0.8,
                        }}
                      >
                        {node.comment}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer med taggar och metadata */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t"
                  style={{ borderColor: theme.node.border }}
                >
                  {/* Taggar */}
                  {columnShowTags && node.tags?.slice(0, 5).map((tag) => (
                    <span
                      key={tag}
                      className="text-xs px-2 py-0.5 rounded"
                      style={{
                        backgroundColor: theme.canvasColor,
                        color: theme.node.text,
                        opacity: 0.8,
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                  {columnShowTags && (node.tags?.length || 0) > 5 && (
                    <span className="text-xs opacity-50">
                      +{(node.tags?.length || 0) - 5}
                    </span>
                  )}

                  {/* Metadata */}
                  <div className="ml-auto flex items-center gap-3 text-xs opacity-50">
                    {connections > 0 && (
                      <span title="Kopplingar">{connections} kopplade</span>
                    )}
                    {tagCount > 0 && (
                      <span title="Taggar">{tagCount} taggar</span>
                    )}
                    <span title={node.updatedAt ? 'Senast ändrad' : 'Skapad'}>
                      {formatDate(node.updatedAt || node.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {sortedNodes.length === 0 && (
          <div className="text-center py-12 opacity-50">
            Inga kort att visa
          </div>
        )}
      </div>
    </div>
  );
};
