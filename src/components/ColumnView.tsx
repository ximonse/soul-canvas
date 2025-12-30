// src/components/ColumnView.tsx
import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
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
  const updateNode = useBrainStore((state) => state.updateNode);
  const loadAssets = useBrainStore((state) => state.loadAssets);

  // State för inline editing
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [croppingNodeId, setCroppingNodeId] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const lastUpdateRef = useRef<number>(0);
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  // Sortera nodes
  const sortedNodes = useMemo(
    () => sortNodes(nodes, columnSort, synapses),
    [nodes, columnSort, synapses]
  );

  // Filter nodes based on selection
  const filteredNodes = useMemo(() => {
    if (!showOnlySelected || selectedNodeIds.size === 0) return sortedNodes;
    return sortedNodes.filter(node => selectedNodeIds.has(node.id));
  }, [sortedNodes, showOnlySelected, selectedNodeIds]);

  // Hantera klick på kort
  const handleCardClick = useCallback((node: MindNode, e: React.MouseEvent) => {
    if (e.ctrlKey || e.metaKey) {
      // Toggle selection (multi = true för att behålla andra markeringar)
      toggleSelection(node.id, true);
    } else {
      // Toggle inline editing
      setEditingNodeId(prev => prev === node.id ? null : node.id);
    }
  }, [toggleSelection]);

  // Hantera checkbox
  const handleCheckbox = useCallback((node: MindNode, e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    // Multi = true för att kunna markera flera med checkboxar
    toggleSelection(node.id, true);
  }, [toggleSelection]);

  // Hantera crop mouse events
  const handleCropMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setIsDragging(true);
    setDragStart({ x, y });
    setCropArea({ x, y, width: 0, height: 0 });
    lastUpdateRef.current = 0; // Reset throttle
  }, []);

  const handleCropMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    // Throttle to 60fps (16ms)
    const now = performance.now();
    if (now - lastUpdateRef.current < 16) return;
    lastUpdateRef.current = now;

    // Capture event data before RAF (event will be null inside RAF callback)
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;
    const width = currentX - dragStart.x;
    const height = currentY - dragStart.y;
    setCropArea({
      x: width < 0 ? currentX : dragStart.x,
      y: height < 0 ? currentY : dragStart.y,
      width: Math.abs(width),
      height: Math.abs(height),
    });
  }, [isDragging, dragStart]);

  const handleCropMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Hantera crop save
  const handleCropSave = useCallback((node: MindNode, imageRef: React.RefObject<HTMLImageElement>) => {
    if (!imageRef.current || cropArea.width === 0 || cropArea.height === 0) return;

    const img = imageRef.current;
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = cropArea.width * scaleX;
    canvas.height = cropArea.height * scaleY;

    ctx.drawImage(
      img,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedImageData = canvas.toDataURL('image/png');
    const croppedId = `cropped_${node.id}_${Date.now()}`;
    const newAssets = { ...assets, [croppedId]: croppedImageData };
    loadAssets(newAssets);
    updateNode(node.id, { imageRef: croppedId });
    setCroppingNodeId(null);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
  }, [cropArea, assets, loadAssets, updateNode]);

  // Close edit view on Escape, save crop on Enter, toggle filter on 'k'
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditingNodeId(null);
        setCroppingNodeId(null);
        setCropArea({ x: 0, y: 0, width: 0, height: 0 });
      } else if (e.key === 'Enter' && croppingNodeId && cropArea.width > 10 && cropArea.height > 10) {
        // Save crop on Enter
        const node = nodes.find(n => n.id === croppingNodeId);
        if (node) {
          const ref = { current: (node as any)._cropImageRef };
          handleCropSave(node, ref);
        }
      } else if (e.key === 'k' || e.key === 'K') {
        // Toggle showing only selected nodes
        setShowOnlySelected(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [croppingNodeId, cropArea, nodes, handleCropSave]);

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
        {filteredNodes.map((node) => {
          const connections = countConnections(node.id, synapses);
          const tagCount = (node.tags?.length || 0) + (node.semanticTags?.length || 0);
          const displayTitle = getNodeDisplayTitle(node);
          const isSelected = selectedNodeIds.has(node.id);
          const imageUrl = node.type === 'image' ? resolveImageUrl(node, assets) : null;

          return (
            <div
              key={node.id}
              onClick={(e) => {
                // Close edit view if clicking on card background (not on content)
                if (e.target === e.currentTarget && editingNodeId === node.id) {
                  setEditingNodeId(null);
                  setCroppingNodeId(null);
                  setCropArea({ x: 0, y: 0, width: 0, height: 0 });
                } else {
                  handleCardClick(node, e);
                }
              }}
              onContextMenu={(e) => handleContextMenu(node, e)}
              className="rounded-lg cursor-pointer transition-all"
                style={{
                  backgroundColor: isSelected ? theme.node.selectedBg : theme.node.bg,
                  border: `1px solid ${isSelected ? theme.node.selectedBorder : theme.node.border}`,
                  boxShadow: isSelected
                    ? `0 0 6px ${theme.node.selectedShadow}`
                    : `0 1px 3px ${theme.node.shadow}`,
                  fontFamily: "'Noto Serif', Georgia, serif",
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
                    {editingNodeId === node.id ? (
                      // INLINE EDITOR
                      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                        {/* Bild för image-kort */}
                        {imageUrl && (
                          <div className="relative">
                            {croppingNodeId === node.id ? (
                              // CROP MODE
                              <>
                                <div
                                  className="relative inline-block cursor-crosshair select-none w-full"
                                  onMouseDown={handleCropMouseDown}
                                  onMouseMove={handleCropMouseMove}
                                  onMouseUp={handleCropMouseUp}
                                  onMouseLeave={handleCropMouseUp}
                                >
                                  <img
                                    ref={(ref) => {
                                      if (ref) {
                                        (node as any)._cropImageRef = ref;
                                      }
                                    }}
                                    src={imageUrl}
                                    alt={node.caption || ''}
                                    className="w-full object-contain rounded bg-black/5 pointer-events-none"
                                    draggable={false}
                                  />

                                  {/* Crop overlay */}
                                  {cropArea.width > 0 && cropArea.height > 0 && (
                                    <>
                                      {/* Darkened area outside crop */}
                                      <div
                                        className="absolute inset-0 bg-black/50 pointer-events-none"
                                        style={{
                                          clipPath: `polygon(
                                            0 0, 100% 0, 100% 100%, 0 100%, 0 0,
                                            ${cropArea.x}px ${cropArea.y}px,
                                            ${cropArea.x}px ${cropArea.y + cropArea.height}px,
                                            ${cropArea.x + cropArea.width}px ${cropArea.y + cropArea.height}px,
                                            ${cropArea.x + cropArea.width}px ${cropArea.y}px,
                                            ${cropArea.x}px ${cropArea.y}px
                                          )`
                                        }}
                                      />
                                      {/* Crop box border */}
                                      <div
                                        className="absolute border-2 border-white pointer-events-none"
                                        style={{
                                          left: cropArea.x,
                                          top: cropArea.y,
                                          width: cropArea.width,
                                          height: cropArea.height,
                                          boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)'
                                        }}
                                      />
                                    </>
                                  )}
                                </div>

                                {/* Crop buttons */}
                                <div className="flex gap-2 mt-2">
                                  <button
                                    key={`crop-btn-${cropArea.width}-${cropArea.height}`}
                                    onClick={() => {
                                      const ref = { current: (node as any)._cropImageRef };
                                      handleCropSave(node, ref);
                                    }}
                                    className="px-3 py-1 rounded text-sm font-semibold transition-all"
                                    style={{
                                      backgroundColor: theme.node.selectedBg,
                                      color: theme.node.text,
                                      opacity: (cropArea.width > 10 && cropArea.height > 10) ? 1 : 0.3,
                                      cursor: (cropArea.width > 10 && cropArea.height > 10) ? 'pointer' : 'not-allowed',
                                    }}
                                  >
                                    ✂️ Beskär & Spara {cropArea.width > 10 && cropArea.height > 10 ? '✓' : ''}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setCroppingNodeId(null);
                                      setCropArea({ x: 0, y: 0, width: 0, height: 0 });
                                    }}
                                    className="px-3 py-1 rounded text-sm"
                                    style={{
                                      backgroundColor: theme.node.border,
                                      color: theme.node.text,
                                    }}
                                  >
                                    Avbryt
                                  </button>
                                </div>
                              </>
                            ) : (
                              // NORMAL MODE
                              <>
                                <img
                                  src={imageUrl}
                                  alt={node.caption || ''}
                                  className="w-full object-contain rounded bg-black/5"
                                />
                                <button
                                  onClick={() => setCroppingNodeId(node.id)}
                                  className="absolute top-2 right-2 px-3 py-1 rounded text-sm font-semibold"
                                  style={{
                                    backgroundColor: theme.node.selectedBg,
                                    color: theme.node.text,
                                  }}
                                >
                                  ✂️ Beskär
                                </button>
                              </>
                            )}
                          </div>
                        )}

                        {/* Title */}
                        <input
                          type="text"
                          value={node.title || ''}
                          onChange={(e) => updateNode(node.id, { title: e.target.value })}
                          placeholder="Titel..."
                          className="w-full px-2 py-1 rounded text-sm font-semibold bg-transparent border"
                          style={{
                            borderColor: theme.node.border,
                            color: theme.node.text
                          }}
                        />

                        {/* Content */}
                        <textarea
                          value={node.content}
                          onChange={(e) => updateNode(node.id, { content: e.target.value })}
                          placeholder="Innehåll..."
                          className="w-full px-2 py-1 rounded text-sm leading-relaxed bg-transparent border resize-none"
                          style={{
                            borderColor: theme.node.border,
                            color: theme.node.text,
                            minHeight: '100px'
                          }}
                          rows={5}
                        />

                        {/* Caption */}
                        <input
                          type="text"
                          value={node.caption || ''}
                          onChange={(e) => updateNode(node.id, { caption: e.target.value })}
                          placeholder="Caption (synlig text under kortet)..."
                          className="w-full px-2 py-1 rounded text-sm italic bg-transparent border"
                          style={{
                            borderColor: theme.node.border,
                            color: theme.node.text,
                            opacity: 0.8
                          }}
                        />

                        {/* Comment */}
                        <textarea
                          value={node.comment || ''}
                          onChange={(e) => updateNode(node.id, { comment: e.target.value })}
                          placeholder="Kommentar (dold, visas vid hover)..."
                          className="w-full px-2 py-1 rounded text-sm bg-transparent border resize-none"
                          style={{
                            borderColor: theme.node.border,
                            color: theme.node.text,
                            opacity: 0.7
                          }}
                          rows={2}
                        />

                        {/* Tags */}
                        <input
                          type="text"
                          value={(node.tags || []).join(', ')}
                          onChange={(e) => {
                            const tagsArray = e.target.value.split(',').map(t => t.trim()).filter(t => t);
                            updateNode(node.id, { tags: tagsArray });
                          }}
                          placeholder="Taggar (kommaseparerade)..."
                          className="w-full px-2 py-1 rounded text-xs bg-transparent border"
                          style={{
                            borderColor: theme.node.border,
                            color: theme.node.text
                          }}
                        />

                      </div>
                    ) : (
                      // PREVIEW MODE
                      <>
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
                            className="w-full object-contain rounded mb-2 bg-black/5"
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
                      </>
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

        {filteredNodes.length === 0 && (
          <div className="text-center py-12 opacity-50">
            {showOnlySelected ? 'Inga markerade kort' : 'Inga kort att visa'}
          </div>
        )}
      </div>
    </div>
  );
};
