// src/components/KonvaNode.tsx
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Group, Rect, Text, Image as KonvaImage, Circle } from 'react-konva';
import Konva from 'konva';
import { useBrainStore } from '../store/useBrainStore';
import { dKeyState } from '../hooks/useKeyboard';
import type { MindNode } from '../types/types';
import { type Theme } from '../themes';
import { CARD } from '../utils/constants';
import { getScopeColor, getNodeStyles } from '../utils/nodeStyles';
import MarkdownText from './MarkdownText';

interface KonvaNodeProps {
  node: MindNode;
  theme: Theme;
  onEditCard: (cardId: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onHover?: (nodeId: string | null) => void;
  onContextMenu?: (nodeId: string, screenPos: { x: number; y: number }) => void;
}

// Extract URL from markdown link format [text](url)
const extractLinkUrl = (markdown: string | undefined): string | null => {
  if (!markdown) return null;
  const match = markdown.match(/\[.*?\]\((.*?)\)/);
  return match ? match[1] : null;
};

const KonvaNode: React.FC<KonvaNodeProps> = ({
  node,
  theme,
  onEditCard,
  onDragStart: onDragStartProp,
  onDragEnd: onDragEndProp,
  onHover,
  onContextMenu
}) => {
  const groupRef = useRef<Konva.Group>(null);
  const glowRef = useRef<Konva.Circle>(null);

  // Extract link URL from comment field
  const linkUrl = useMemo(() => extractLinkUrl(node.comment), [node.comment]);
  const updateNodePosition = useBrainStore((state) => state.updateNodePosition);
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const dragSelectedNodes = useBrainStore((state) => state.dragSelectedNodes);
  const isTagging = useBrainStore((state) => state.taggingNodes.has(node.id));

  const getSelectedCount = useCallback(() => {
    const nodes = useBrainStore.getState().nodes;
    let count = 0;
    nodes.forEach(n => { if (n.selected) count++; });
    return count;
  }, []);

  const [imageObj, setImageObj] = useState<HTMLImageElement | undefined>(undefined);
  const [cardHeight, setCardHeight] = useState<number>(CARD.MIN_HEIGHT);
  const [initialX, setInitialX] = useState(0);
  const [initialY, setInitialY] = useState(0);

  const isImage = node.type === 'image';
  const isSelected = node.selected || false;
  const isFlipped = node.isFlipped;
  const isScopeSelected = node.scopeDegree && node.scopeDegree > 0;

  // Image loading
  useEffect(() => {
    if (isImage && node.content.startsWith('assets/')) {
      const assetUrl = useBrainStore.getState().assets[node.content];
      if (assetUrl) {
        const img = new window.Image();
        img.src = assetUrl;
        img.onload = () => {
          setImageObj(img);
          const aspectRatio = img.height / img.width;
          let totalHeight = CARD.WIDTH * aspectRatio;
          if (node.caption?.trim()) {
            totalHeight += Math.ceil(node.caption.length / 30 + 1) * CARD.LINE_HEIGHT + CARD.PADDING;
          }
          setCardHeight(Math.max(CARD.MIN_HEIGHT, Math.min(CARD.MAX_HEIGHT, totalHeight)));
        };
        img.onerror = () => { setImageObj(undefined); setCardHeight(CARD.MIN_HEIGHT); };
      }
    } else if (isImage) {
      const img = new window.Image();
      img.src = node.content;
      img.onload = () => {
        setImageObj(img);
        const aspectRatio = img.height / img.width;
        let totalHeight = CARD.WIDTH * aspectRatio;
        if (node.caption?.trim()) {
          totalHeight += Math.ceil(node.caption.length / 30 + 1) * CARD.LINE_HEIGHT + CARD.PADDING;
        }
        setCardHeight(Math.max(CARD.MIN_HEIGHT, Math.min(CARD.MAX_HEIGHT, totalHeight)));
      };
      img.onerror = () => { setImageObj(undefined); setCardHeight(CARD.MIN_HEIGHT); };
    } else {
      setImageObj(undefined);
      const textContent = node.ocrText || node.content || '';
      const estimatedLines = textContent.split('\n').length + textContent.length / 30 + 1;
      let height = Math.max(CARD.MIN_HEIGHT, Math.min(CARD.MAX_HEIGHT, estimatedLines * CARD.LINE_HEIGHT_TEXT + CARD.PADDING * 2));
      if (node.title) {
        height += CARD.LINE_HEIGHT + CARD.PADDING / 2;
      }
      // Lägg till höjd för caption om den finns
      if (node.caption?.trim()) {
        const captionLines = Math.ceil(node.caption.length / 35) + 1;
        height += captionLines * CARD.LINE_HEIGHT + CARD.PADDING;
      }
      setCardHeight(height);
    }
  }, [node.content, node.type, node.caption, isImage]);

  // Drag handlers
  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (!isSelected) { clearSelection(); toggleSelection(node.id, false); }
    setInitialX(e.target.x());
    setInitialY(e.target.y());
    groupRef.current?.moveToTop();
    onDragStartProp?.();
  }, [isSelected, clearSelection, toggleSelection, node.id, onDragStartProp]);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (getSelectedCount() > 1) {
      const dx = e.target.x() - initialX;
      const dy = e.target.y() - initialY;
      Array.from(useBrainStore.getState().nodes.values())
        .filter(n => n.selected && n.id !== node.id)
        .forEach(n => {
          const stage = e.target.getStage();
          const otherGroup = stage?.findOne(`#konva-node-${n.id}`) as Konva.Group;
          otherGroup?.position({ x: n.x + dx, y: n.y + dy });
        });
      e.target.getLayer()?.batchDraw();
    }
  }, [getSelectedCount, initialX, initialY, node.id]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const dx = e.target.x() - initialX;
    const dy = e.target.y() - initialY;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      e.target.position({ x: node.x, y: node.y });
      onDragEndProp?.();
      return;
    }
    if (getSelectedCount() > 1) {
      dragSelectedNodes(dx, dy);
      e.target.position({ x: node.x + dx, y: node.y + dy });
    } else {
      updateNodePosition(node.id, e.target.x(), e.target.y());
    }
    onDragEndProp?.();
  }, [initialX, initialY, node.x, node.y, node.id, getSelectedCount, dragSelectedNodes, updateNodePosition, onDragEndProp]);

  // Click handlers
  const handleClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 0) {
      e.cancelBubble = true;
      if (dKeyState.pressed) {
        const store = useBrainStore.getState();
        store.activeSequence ? store.addToSequence(node.id) : store.startSequence(node.id);
        return;
      }
      toggleSelection(node.id, e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey);
    }
  }, [toggleSelection, node.id]);

  const handleDblClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onEditCard(node.id);
  }, [onEditCard, node.id]);

  const handleContextMenu = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.evt.preventDefault();
    e.cancelBubble = true;
    onContextMenu?.(node.id, { x: e.evt.clientX, y: e.evt.clientY });
  }, [node.id, onContextMenu]);

  const handleMouseEnter = useCallback(() => {
    if (node.comment?.trim() && onHover) onHover(node.id);
  }, [node.id, node.comment, onHover]);

  const handleMouseLeave = useCallback(() => { onHover?.(null); }, [onHover]);

  // Tagging animation
  useEffect(() => {
    if (!isTagging || !glowRef.current) return undefined;
    const colors = [
      { r: 147, g: 112, b: 219 }, { r: 100, g: 149, b: 237 },
      { r: 72, g: 209, b: 204 }, { r: 255, g: 182, b: 193 }, { r: 144, g: 238, b: 144 },
    ];
    const anim = new Konva.Animation((frame) => {
      if (!frame || !glowRef.current) return;
      const colorProgress = (frame.time / 2000) % colors.length;
      const i = Math.floor(colorProgress);
      const t = colorProgress - i;
      const c1 = colors[i], c2 = colors[(i + 1) % colors.length];
      const r = Math.round(c1.r + (c2.r - c1.r) * t);
      const g = Math.round(c1.g + (c2.g - c1.g) * t);
      const b = Math.round(c1.b + (c2.b - c1.b) * t);
      glowRef.current.fill(`rgb(${r},${g},${b})`);
      glowRef.current.scale({ x: 1 + Math.sin(frame.time / 400) * 0.2, y: 1 + Math.sin(frame.time / 400) * 0.2 });
      glowRef.current.opacity(0.5 + Math.sin(frame.time / 500) * 0.3);
    }, glowRef.current.getLayer());
    anim.start();
    return () => { anim.stop(); };
  }, [isTagging]);

  const styles = useMemo(() =>
    getNodeStyles(theme, node.createdAt, isSelected, node.backgroundColor),
    [theme, node.createdAt, isSelected, node.backgroundColor]
  );

  return (
    <Group
      x={node.x} y={node.y} draggable
      onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
      onClick={handleClick} onDblClick={handleDblClick} onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      ref={groupRef} id={`konva-node-${node.id}`}
    >
      <Rect
        width={CARD.WIDTH} height={cardHeight} fill={styles.bg} cornerRadius={CARD.CORNER_RADIUS}
        stroke={isSelected ? styles.border : isScopeSelected ? getScopeColor(node.scopeDegree) : '#4a4a4a'}
        strokeWidth={isSelected ? 3 : isScopeSelected ? 2 : 1}
        dash={isScopeSelected && !isSelected ? [8, 4] : undefined}
      />

      {node.accentColor && (
        <Group clipFunc={(ctx) => {
          ctx.beginPath();
          ctx.moveTo(CARD.CORNER_RADIUS, 0);
          ctx.lineTo(14, 0); ctx.lineTo(14, cardHeight); ctx.lineTo(CARD.CORNER_RADIUS, cardHeight);
          ctx.arcTo(0, cardHeight, 0, cardHeight - CARD.CORNER_RADIUS, CARD.CORNER_RADIUS);
          ctx.lineTo(0, CARD.CORNER_RADIUS);
          ctx.arcTo(0, 0, CARD.CORNER_RADIUS, 0, CARD.CORNER_RADIUS);
          ctx.closePath();
        }}>
          <Rect x={0} y={0} width={14} height={cardHeight} fill={node.accentColor} />
        </Group>
      )}

      {isImage && imageObj && (
        <KonvaImage image={imageObj} x={0} y={0} width={CARD.WIDTH}
          height={CARD.WIDTH * (imageObj.height / imageObj.width)}
          cornerRadius={[CARD.CORNER_RADIUS, CARD.CORNER_RADIUS, 0, 0]}
        />
      )}

      {!isImage && !isFlipped && node.title && (
        <Text
          text={node.title}
          x={node.accentColor ? CARD.PADDING + 8 : CARD.PADDING}
          y={CARD.PADDING}
          width={CARD.WIDTH - CARD.PADDING * 2 - (node.accentColor ? 8 : 0)}
          fill={styles.text}
          fontSize={CARD.FONT_SIZE}
          fontFamily="Inter, sans-serif"
          fontStyle="bold"
          wrap="word"
        />
      )}

      {!isImage && !isFlipped && (
        <MarkdownText
          text={node.content}
          x={node.accentColor ? CARD.PADDING + 8 : CARD.PADDING} y={CARD.PADDING + (node.title ? CARD.LINE_HEIGHT * 2 : 0)}
          width={CARD.WIDTH - CARD.PADDING * 2 - (node.accentColor ? 8 : 0)}
          fill={styles.text} fontSize={CARD.FONT_SIZE} fontFamily="Inter, sans-serif" align="left"
        />
      )}

      {!isImage && !isFlipped && node.caption?.trim() && (() => {
        const captionLines = Math.ceil((node.caption?.length || 0) / 35) + 1;
        const captionHeight = captionLines * CARD.LINE_HEIGHT;
        return (
          <Text text={node.caption}
            x={node.accentColor ? CARD.PADDING + 8 : CARD.PADDING}
            y={cardHeight - CARD.PADDING - captionHeight}
            width={CARD.WIDTH - CARD.PADDING * 2 - (node.accentColor ? 8 : 0)}
            fill={styles.text} fontSize={CARD.FONT_SIZE_SMALL}
            fontFamily="'Noto Serif', Georgia, serif" fontStyle="italic" align="center" wrap="word"
          />
        );
      })()}

      {isFlipped && (
        <>
          <Rect x={0} y={0} width={CARD.WIDTH} height={cardHeight}
            fill={theme.node.flippedBg} cornerRadius={CARD.CORNER_RADIUS}
          />
          <Text text="Baksida (Redigerbart)" x={CARD.PADDING} y={CARD.PADDING}
            width={CARD.WIDTH - CARD.PADDING * 2} fill={theme.node.flippedText}
            fontSize={CARD.FONT_SIZE_SMALL} fontFamily="Inter, sans-serif" align="center"
          />
          <Text text={node.ocrText || (node.type === 'zotero' ? node.content : '')}
            x={CARD.PADDING} y={CARD.PADDING + 30} width={CARD.WIDTH - CARD.PADDING * 2}
            fill={theme.node.flippedText} fontSize={CARD.FONT_SIZE_TINY}
            fontFamily="Inter, monospace" align="left" verticalAlign="top" wrap="word"
          />
        </>
      )}

      {node.pinned && <Circle x={CARD.WIDTH - 15} y={15} radius={5} fill={theme.lineColor} />}

      {/* Link icon - clickable to open URL or copy file path */}
      {linkUrl && !isFlipped && (
        <Text
          text="🔗"
          x={CARD.WIDTH - (node.pinned ? 40 : 28)}
          y={8}
          fontSize={14}
          onClick={(e) => {
            e.cancelBubble = true;
            let urlToOpen = linkUrl;

            if (linkUrl.startsWith('file:///')) {
              // Convert file:// to zotero:// format
              // Extract storage folder ID (e.g. BH6LCAYP from .../Zotero/storage/BH6LCAYP/...)
              const storageMatch = linkUrl.match(/\/storage\/([A-Z0-9]+)\//i);
              const pageMatch = linkUrl.match(/#page=(\d+)/);

              if (storageMatch) {
                const itemId = storageMatch[1];
                const page = pageMatch ? pageMatch[1] : '1';
                urlToOpen = `zotero://open-pdf/library/items/${itemId}?page=${page}`;
              }
            }

            window.open(urlToOpen, '_blank');
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'pointer';
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = 'default';
          }}
        />
      )}

      {isTagging && (
        <Circle ref={glowRef} x={CARD.WIDTH / 2} y={cardHeight / 2} radius={20}
          fill="rgb(147, 112, 219)" opacity={0.6} shadowColor="white" shadowBlur={15} shadowOpacity={0.8}
        />
      )}

      {isImage && node.caption?.trim() && (
        <Text text={node.caption} x={CARD.PADDING}
          y={CARD.WIDTH * (imageObj?.height || 0) / (imageObj?.width || 1) + CARD.PADDING / 2}
          width={CARD.WIDTH - CARD.PADDING * 2} fill={styles.text} fontSize={CARD.FONT_SIZE_SMALL}
          fontFamily="'Noto Serif', Georgia, serif" fontStyle="italic" align="center" wrap="word"
        />
      )}
    </Group>
  );
};

export default KonvaNode;
