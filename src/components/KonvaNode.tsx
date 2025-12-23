// src/components/KonvaNode.tsx
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Group, Rect, Text, Image as KonvaImage, Circle } from 'react-konva';
import Konva from 'konva';
import { useBrainStore } from '../store/useBrainStore';
import { dKeyState } from '../hooks/useKeyboard';
import type { MindNode } from '../types/types';
import { type Theme } from '../themes';
import { CARD } from '../utils/constants';
import { getScopeColor, getNodeStyles, getGravitatingColor, getSemanticThemeColor } from '../utils/nodeStyles';
import { layoutMarkdownText, measureTextHeight } from '../utils/textLayout';
import type { GravitatingColorMode } from '../types/types';
import MarkdownText from './MarkdownText';

interface KonvaNodeProps {
  node: MindNode;
  theme: Theme;
  gravitatingSimilarity?: number;  // Om noden är en gravitating node, dess similarity (0-1)
  gravitatingSemanticTheme?: string;  // Semantiskt tema (existential, practical, etc.)
  gravitatingColorMode?: GravitatingColorMode;  // 'similarity' eller 'semantic'
  isWandering?: boolean;
  onWanderStep?: (nodeId: string) => void;
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
  gravitatingSimilarity,
  gravitatingSemanticTheme,
  gravitatingColorMode = 'similarity',
  isWandering = false,
  onWanderStep,
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateNodePosition = useBrainStore((state: any) => state.updateNodePosition);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toggleSelection = useBrainStore((state: any) => state.toggleSelection);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clearSelection = useBrainStore((state: any) => state.clearSelection);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dragSelectedNodes = useBrainStore((state: any) => state.dragSelectedNodes);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isTagging = useBrainStore((state: any) => state.taggingNodes.has(node.id));

  const getSelectedCount = useCallback(() => {
    const nodes = useBrainStore.getState().nodes;
    let count = 0;
    nodes.forEach((n: MindNode) => { if (n.selected) count++; });
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
  const contentX = node.accentColor ? CARD.PADDING + 8 : CARD.PADDING;
  const contentWidth = CARD.WIDTH - CARD.PADDING * 2 - (node.accentColor ? 8 : 0);
  const captionWidth = isImage ? CARD.WIDTH - CARD.PADDING * 2 : contentWidth;
  const contentLineHeight = 1.6;
  const titleLineHeight = 1.2;
  const captionLineHeight = 1.2;
  const contentFontFamily = 'Inter, sans-serif';
  const captionFontFamily = "'Noto Serif', Georgia, serif";

  const titleHeight = useMemo(() => {
    if (!node.title?.trim()) return 0;
    return measureTextHeight(node.title, {
      width: contentWidth,
      fontSize: CARD.FONT_SIZE,
      fontFamily: contentFontFamily,
      fontStyle: 'bold',
      lineHeight: titleLineHeight,
    });
  }, [node.title, contentWidth, contentFontFamily, titleLineHeight]);

  const contentLayout = useMemo(() => (
    layoutMarkdownText(node.content || '', {
      width: contentWidth,
      fontSize: CARD.FONT_SIZE,
      fontFamily: contentFontFamily,
      lineHeight: contentLineHeight,
    })
  ), [node.content, contentWidth, contentFontFamily, contentLineHeight]);

  const captionHeight = useMemo(() => {
    if (!node.caption?.trim()) return 0;
    return measureTextHeight(node.caption, {
      width: captionWidth,
      fontSize: CARD.FONT_SIZE_SMALL,
      fontFamily: captionFontFamily,
      fontStyle: 'italic',
      lineHeight: captionLineHeight,
    });
  }, [node.caption, captionWidth, captionFontFamily, captionLineHeight]);

  const titleGap = node.title ? CARD.PADDING : 0;
  const contentOffsetY = CARD.PADDING + (node.title ? titleHeight + titleGap : 0);

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
          if (captionHeight > 0) {
            totalHeight += captionHeight + CARD.PADDING;
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
        if (captionHeight > 0) {
          totalHeight += captionHeight + CARD.PADDING;
        }
        setCardHeight(Math.max(CARD.MIN_HEIGHT, Math.min(CARD.MAX_HEIGHT, totalHeight)));
      };
      img.onerror = () => { setImageObj(undefined); setCardHeight(CARD.MIN_HEIGHT); };
    } else {
      setImageObj(undefined);
      let height = CARD.PADDING * 2 + contentLayout.height;
      if (node.title) {
        height += titleHeight + titleGap;
      }
      if (captionHeight > 0) {
        height += captionHeight + CARD.PADDING;
      }
      setCardHeight(Math.max(CARD.MIN_HEIGHT, Math.min(CARD.MAX_HEIGHT, height)));
    }
  }, [
    node.content,
    node.type,
    node.title,
    node.caption,
    isImage,
    captionHeight,
    contentLayout.height,
    titleHeight,
  ]);

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
      (Array.from(useBrainStore.getState().nodes.values()) as MindNode[])
        .filter((n: MindNode) => n.selected && !n.pinned && n.id !== node.id)
        .forEach((n: MindNode) => {
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
      const hasModifier = e.evt.shiftKey || e.evt.ctrlKey || e.evt.metaKey || e.evt.altKey;
      toggleSelection(node.id, hasModifier);
      if (isWandering && !hasModifier) {
        onWanderStep?.(node.id);
      }
    }
  }, [toggleSelection, node.id, isWandering, onWanderStep]);

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

  // Är detta en gravitating node?
  const isGravitating = gravitatingSimilarity !== undefined;

  // Beräkna gravitating-färg baserat på colorMode
  const gravitatingColor = useMemo(() => {
    if (!isGravitating) return '#4a4a4a';
    if (gravitatingColorMode === 'semantic') {
      return getSemanticThemeColor(gravitatingSemanticTheme);
    }
    return getGravitatingColor(gravitatingSimilarity);
  }, [isGravitating, gravitatingColorMode, gravitatingSemanticTheme, gravitatingSimilarity]);

  // Beräkna stroke-färg med prioritet: selected > gravitating > scope > default
  const strokeColor = useMemo(() => {
    if (isSelected) return styles.border;
    if (isGravitating) return gravitatingColor;
    if (isScopeSelected) return getScopeColor(node.scopeDegree);
    return '#4a4a4a';
  }, [isSelected, styles.border, isGravitating, gravitatingColor, isScopeSelected, node.scopeDegree]);

  const strokeWidth = isSelected ? 3 : isGravitating ? 3 : isScopeSelected ? 2 : 1;

  return (
    <Group
      x={node.x} y={node.y} draggable={!node.pinned}
      onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}
      onClick={handleClick} onDblClick={handleDblClick} onContextMenu={handleContextMenu}
      onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}
      ref={groupRef} id={`konva-node-${node.id}`}
    >
      {/* Glow-effekt för gravitating nodes */}
      {isGravitating && (
        <Rect
          x={-8} y={-8}
          width={CARD.WIDTH + 16} height={cardHeight + 16}
          fill="transparent"
          stroke={gravitatingColor}
          strokeWidth={6}
          cornerRadius={CARD.CORNER_RADIUS + 6}
          opacity={0.8}
          shadowColor={gravitatingColor}
          shadowBlur={20}
          shadowOpacity={0.8}
        />
      )}

      <Rect
        width={CARD.WIDTH} height={cardHeight}
        fill={isGravitating ? gravitatingColor : styles.bg}
        opacity={isGravitating ? 0.85 : 1}
        cornerRadius={CARD.CORNER_RADIUS}
        stroke={strokeColor}
        strokeWidth={isGravitating ? 4 : strokeWidth}
        dash={isScopeSelected && !isSelected && !isGravitating ? [8, 4] : undefined}
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
          x={contentX}
          y={CARD.PADDING}
          width={contentWidth}
          fill={styles.text}
          fontSize={CARD.FONT_SIZE}
          fontFamily={contentFontFamily}
          fontStyle="bold"
          wrap="word"
          lineHeight={titleLineHeight}
        />
      )}

      {!isImage && !isFlipped && (
        <MarkdownText
          text={node.content}
          x={contentX} y={contentOffsetY}
          width={contentWidth}
          fill={styles.text} fontSize={CARD.FONT_SIZE} fontFamily={contentFontFamily} align="left"
          lineHeight={contentLineHeight}
        />
      )}

      {!isImage && !isFlipped && node.caption?.trim() && (() => {
        return (
          <Text text={node.caption}
            x={contentX}
            y={cardHeight - CARD.PADDING - captionHeight}
            width={contentWidth}
            fill={styles.text} fontSize={CARD.FONT_SIZE_SMALL}
            fontFamily={captionFontFamily} fontStyle="italic" align="center" wrap="word"
            lineHeight={captionLineHeight}
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
          fontFamily={captionFontFamily} fontStyle="italic" align="center" wrap="word"
          lineHeight={captionLineHeight}
        />
      )}
    </Group>
  );
};

export default KonvaNode;
