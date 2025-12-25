// src/components/KonvaNode.tsx
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Group, Rect, Text, Image as KonvaImage, Circle } from 'react-konva';
import Konva from 'konva';
import { useBrainStore } from '../store/useBrainStore';
import { dKeyState } from '../hooks/useKeyboard';
import type { AIProvider, MindNode } from '../types/types';
import { type Theme } from '../themes';
import { CARD } from '../utils/constants';
import { getScopeColor, getNodeStyles, getGravitatingColor, getSemanticThemeColor } from '../utils/nodeStyles';
import { layoutMarkdownText, measureTextHeight, type MarkdownLineLayout } from '../utils/textLayout';
import { getImageText, resolveImageUrl } from '../utils/imageRefs';
import { loadCachedImage } from '../utils/imageCache';
import type { GravitatingColorMode } from '../types/types';
import MarkdownText from './MarkdownText';

interface KonvaNodeProps {
  nodeId: string;
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

type KonvaNodeInnerProps = Omit<KonvaNodeProps, 'nodeId'> & {
  node: MindNode;
};

// Extract URL from markdown link format [text](url)
const extractLinkUrl = (markdown: string | undefined): string | null => {
  if (!markdown) return null;
  const match = markdown.match(/\[.*?\]\((.*?)\)/);
  return match ? match[1] : null;
};

type RGB = { r: number; g: number; b: number };

const AI_PULSE_PALETTE: Record<AIProvider, RGB[]> = {
  claude: [{ r: 249, g: 115, b: 22 }],
  openai: [{ r: 156, g: 163, b: 175 }],
  gemini: [
    { r: 250, g: 204, b: 21 },
    { r: 59, g: 130, b: 246 },
    { r: 239, g: 68, b: 68 },
  ],
};

const toRgb = (color: RGB) => `rgb(${color.r},${color.g},${color.b})`;
const HEIGHT_SYNC_DELAY_MS = 120;

interface FrontTextContentProps {
  title?: string;
  content: string;
  contentLines: MarkdownLineLayout[];
  contentX: number;
  contentOffsetY: number;
  contentWidth: number;
  contentFontFamily: string;
  captionFontFamily: string;
  contentLineHeight: number;
  titleLineHeight: number;
  captionLineHeight: number;
  textColor: string;
  cardHeight: number;
  caption?: string;
  captionHeight: number;
}

const FrontTextContent: React.FC<FrontTextContentProps> = React.memo(({
  title,
  content,
  contentLines,
  contentX,
  contentOffsetY,
  contentWidth,
  contentFontFamily,
  captionFontFamily,
  contentLineHeight,
  titleLineHeight,
  captionLineHeight,
  textColor,
  cardHeight,
  caption,
  captionHeight,
}) => (
  <>
    {title && (
      <Text
        text={title}
        x={contentX}
        y={CARD.PADDING}
        width={contentWidth}
        fill={textColor}
        fontSize={CARD.FONT_SIZE}
        fontFamily={contentFontFamily}
        fontStyle="bold"
        wrap="word"
        lineHeight={titleLineHeight}
      />
    )}

    <MarkdownText
      text={content}
      lines={contentLines}
      x={contentX}
      y={contentOffsetY}
      width={contentWidth}
      fill={textColor}
      fontSize={CARD.FONT_SIZE}
      fontFamily={contentFontFamily}
      align="left"
      lineHeight={contentLineHeight}
    />

    {caption?.trim() && (
      <Text
        text={caption}
        x={contentX}
        y={cardHeight - CARD.PADDING - captionHeight}
        width={contentWidth}
        fill={textColor}
        fontSize={CARD.FONT_SIZE_SMALL}
        fontFamily={captionFontFamily}
        fontStyle="italic"
        align="center"
        wrap="word"
        lineHeight={captionLineHeight}
      />
    )}
  </>
));

interface FlippedContentProps {
  isImage: boolean;
  cardHeight: number;
  theme: Theme;
  backTextWidth: number;
  hasTitle: boolean;
  title?: string;
  backTitleHeight: number;
  backTitleFontFamily: string;
  backTitleLineHeight: number;
  backFontFamily: string;
  backContentLineHeight: number;
  imageText: string;
  backSideText: string;
  cardFontFamily: string;
}

const FlippedContent: React.FC<FlippedContentProps> = React.memo(({
  isImage,
  cardHeight,
  theme,
  backTextWidth,
  hasTitle,
  title,
  backTitleHeight,
  backTitleFontFamily,
  backTitleLineHeight,
  backFontFamily,
  backContentLineHeight,
  imageText,
  backSideText,
  cardFontFamily,
}) => (
  <>
    <Rect
      x={0}
      y={0}
      width={CARD.WIDTH}
      height={cardHeight}
      fill={theme.node.flippedBg}
      cornerRadius={CARD.CORNER_RADIUS}
    />
    {isImage ? (
      <>
        {hasTitle && (
          <Text
            text={title}
            x={CARD.PADDING}
            y={CARD.PADDING}
            width={backTextWidth}
            fill={theme.node.flippedText}
            fontSize={20}
            fontFamily={backTitleFontFamily}
            fontStyle="bold"
            align="left"
            lineHeight={backTitleLineHeight}
            wrap="word"
          />
        )}
        <Text
          text={imageText}
          x={CARD.PADDING}
          y={CARD.PADDING + (hasTitle ? backTitleHeight + CARD.PADDING / 2 : 0)}
          width={backTextWidth}
          fill={theme.node.flippedText}
          fontSize={18}
          fontFamily={backFontFamily}
          align="left"
          verticalAlign="top"
          wrap="word"
          lineHeight={backContentLineHeight}
        />
      </>
    ) : (
      <>
        <Text
          text="Baksida (Redigerbart)"
          x={CARD.PADDING}
          y={CARD.PADDING}
          width={CARD.WIDTH - CARD.PADDING * 2}
          fill={theme.node.flippedText}
          fontSize={CARD.FONT_SIZE_SMALL}
          fontFamily={cardFontFamily}
          align="center"
        />
        <Text
          text={backSideText}
          x={CARD.PADDING}
          y={CARD.PADDING + 30}
          width={CARD.WIDTH - CARD.PADDING * 2}
          fill={theme.node.flippedText}
          fontSize={CARD.FONT_SIZE_TINY}
          fontFamily={cardFontFamily}
          align="left"
          verticalAlign="top"
          wrap="word"
        />
      </>
    )}
  </>
));

const KonvaNodeInner: React.FC<KonvaNodeInnerProps> = ({
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
  const aiPulseRef = useRef<Konva.Circle>(null);
  const heightSyncTimeoutRef = useRef<number | null>(null);

  // Extract link URL from comment field
  const linkUrl = useMemo(() => extractLinkUrl(node.comment), [node.comment]);
  const updateNodePosition = useBrainStore((state) => state.updateNodePosition);
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const dragSelectedNodes = useBrainStore((state) => state.dragSelectedNodes);
  const isTagging = useBrainStore((state) => state.taggingNodes.has(node.id));
  const processingProvider = useBrainStore((state) => state.aiProcessingNodes.get(node.id));
  const isSelected = useBrainStore((state) => state.selectedNodeIds.has(node.id));
  const effectiveProvider: AIProvider | null = processingProvider ?? (isTagging ? 'claude' : null);
  const updateNode = useBrainStore((state) => state.updateNode);
  const assets = useBrainStore((state) => state.assets);

  const getSelectedCount = useCallback(() => {
    return useBrainStore.getState().selectedNodeIds.size;
  }, []);

  const [imageObj, setImageObj] = useState<HTMLImageElement | undefined>(undefined);
  const [cardHeight, setCardHeight] = useState<number>(CARD.MIN_HEIGHT);
  const [initialX, setInitialX] = useState(0);
  const [initialY, setInitialY] = useState(0);

  const isImage = node.type === 'image';
  const isFlipped = node.isFlipped;
  const isScopeSelected = node.scopeDegree && node.scopeDegree > 0;
  const contentX = node.accentColor ? CARD.PADDING + 8 : CARD.PADDING;
  const contentWidth = CARD.WIDTH - CARD.PADDING * 2 - (node.accentColor ? 8 : 0);
  const captionWidth = isImage ? CARD.WIDTH - CARD.PADDING * 2 : contentWidth;
  const contentLineHeight = 1.6;
  const titleLineHeight = 1.2;
  const captionLineHeight = 1.2;
  const cardFontFamily = "'Noto Serif', Georgia, serif";
  const contentFontFamily = cardFontFamily;
  const captionFontFamily = cardFontFamily;
  const backFontFamily = cardFontFamily;
  const backTitleFontFamily = cardFontFamily;
  const backTitleLineHeight = 1.1;
  const backContentLineHeight = 1.35;
  const backTextWidth = CARD.WIDTH - CARD.PADDING * 2;
  const hasTitle = Boolean(node.title?.trim());

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

  const backTitleHeight = useMemo(() => {
    if (node.type !== 'image' || !node.title?.trim()) return 0;
    return measureTextHeight(node.title, {
      width: backTextWidth,
      fontSize: 20, // Sync with JSX
      fontFamily: backTitleFontFamily,
      fontStyle: 'bold',
      lineHeight: backTitleLineHeight,
    });
  }, [node.type, node.title, backTextWidth, backTitleFontFamily, backTitleLineHeight]);

  const titleGap = hasTitle ? CARD.PADDING : 0;
  const contentOffsetY = CARD.PADDING + (hasTitle ? titleHeight + titleGap : 0);

  const imageText = useMemo(
    () => getImageText(node),
    [node.type, node.content, node.imageRef, node.ocrText, node.comment]
  );
  const backSideText = useMemo(
    () => node.ocrText || (node.type === 'zotero' ? node.content : ''),
    [node.ocrText, node.type, node.content]
  );

  const backContentHeight = useMemo(() => {
    if (node.type !== 'image') return 0;
    return measureTextHeight(imageText, {
      width: backTextWidth,
      fontSize: 18, // Sync with JSX
      fontFamily: backFontFamily,
      lineHeight: backContentLineHeight,
    });
  }, [node.type, imageText, backTextWidth, backFontFamily, backContentLineHeight]);

  // Image loading & Height calculation
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    const calcBackHeight = () => {
      if (!isFlipped || !isImage) return 0;
      return CARD.PADDING * 2 + backTitleHeight + (hasTitle ? CARD.PADDING / 2 : 0) + backContentHeight;
    };

    if (isImage) {
      const assetUrl = resolveImageUrl(node, assets);
      if (!assetUrl) {
        setImageObj(undefined);
        const backH = calcBackHeight();
        setCardHeight(Math.max(CARD.MIN_HEIGHT, backH));
        return () => { cancelled = true; };
      }
      loadCachedImage(assetUrl)
        .then((img) => {
          if (cancelled) return;
          setImageObj(img);
          const aspectRatio = img.height / img.width;
          let totalHeight = CARD.WIDTH * aspectRatio;
          if (captionHeight > 0) {
            totalHeight += captionHeight + CARD.PADDING;
          }

          const backH = calcBackHeight();
          setCardHeight(Math.max(CARD.MIN_HEIGHT, Math.max(totalHeight, backH)));
        })
        .catch(() => {
          if (cancelled) return;
          setImageObj(undefined);
          const backH = calcBackHeight();
          setCardHeight(Math.max(CARD.MIN_HEIGHT, backH));
        });
      return () => { cancelled = true; };
    } else {
      setImageObj(undefined);
      let height = CARD.PADDING * 2 + contentLayout.height;
      if (hasTitle) {
        height += titleHeight + titleGap;
      }
      if (captionHeight > 0) {
        height += captionHeight + CARD.PADDING;
      }
      setCardHeight(Math.max(CARD.MIN_HEIGHT, Math.min(CARD.MAX_HEIGHT, height)));
    }
    return () => { cancelled = true; };
  }, [
    node.content,
    node.imageRef,
    isImage,
    isFlipped,
    captionHeight,
    contentLayout.height,
    titleHeight,
    backTitleHeight,
    backContentHeight,
    titleGap,
    hasTitle,
    assets,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (cardHeight > 0 && node.height !== cardHeight) {
      if (heightSyncTimeoutRef.current) {
        window.clearTimeout(heightSyncTimeoutRef.current);
      }
      heightSyncTimeoutRef.current = window.setTimeout(() => {
        updateNode(node.id, { height: cardHeight });
        heightSyncTimeoutRef.current = null;
      }, HEIGHT_SYNC_DELAY_MS);
    }
    return () => {
      if (heightSyncTimeoutRef.current) {
        window.clearTimeout(heightSyncTimeoutRef.current);
        heightSyncTimeoutRef.current = null;
      }
    };
  }, [cardHeight, node.id, node.height, updateNode]);

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
      const state = useBrainStore.getState();
      state.selectedNodeIds.forEach((selectedId) => {
        if (selectedId === node.id) return;
        const selectedNode = state.nodes.get(selectedId);
        if (!selectedNode || selectedNode.pinned) return;
        const stage = e.target.getStage();
        const otherGroup = stage?.findOne(`#konva-node-${selectedNode.id}`) as Konva.Group;
        otherGroup?.position({ x: selectedNode.x + dx, y: selectedNode.y + dy });
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
        if (store.activeSequence) {
          store.addToSequence(node.id);
        } else {
          store.startSequence(node.id);
        }
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

  // AI processing pulse
  useEffect(() => {
    if (!effectiveProvider || !aiPulseRef.current) return undefined;
    const palette = AI_PULSE_PALETTE[effectiveProvider];
    const layer = aiPulseRef.current.getLayer();
    if (!layer) return undefined;

    const baseColor = palette[0];
    aiPulseRef.current.fill(toRgb(baseColor));
    aiPulseRef.current.shadowColor(toRgb(baseColor));

    const anim = new Konva.Animation((frame) => {
      if (!frame || !aiPulseRef.current) return;
      const pulse = (frame.time / 1400) * Math.PI * 2;
      const scale = 1 + Math.sin(pulse) * 0.18;
      const opacity = 0.45 + Math.sin(pulse + Math.PI / 3) * 0.2;
      aiPulseRef.current.scale({ x: scale, y: scale });
      aiPulseRef.current.opacity(opacity);

      if (palette.length > 1) {
        const colorProgress = (frame.time / 2200) % palette.length;
        const i = Math.floor(colorProgress);
        const t = colorProgress - i;
        const c1 = palette[i];
        const c2 = palette[(i + 1) % palette.length];
        const blended = {
          r: Math.round(c1.r + (c2.r - c1.r) * t),
          g: Math.round(c1.g + (c2.g - c1.g) * t),
          b: Math.round(c1.b + (c2.b - c1.b) * t),
        };
        const rgb = toRgb(blended);
        aiPulseRef.current.fill(rgb);
        aiPulseRef.current.shadowColor(rgb);
      }
    }, layer);
    anim.start();
    return () => { anim.stop(); };
  }, [effectiveProvider]);

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

      {!isImage && !isFlipped && (
        <FrontTextContent
          title={node.title}
          content={node.content}
          contentLines={contentLayout.lines}
          contentX={contentX}
          contentOffsetY={contentOffsetY}
          contentWidth={contentWidth}
          contentFontFamily={contentFontFamily}
          captionFontFamily={captionFontFamily}
          contentLineHeight={contentLineHeight}
          titleLineHeight={titleLineHeight}
          captionLineHeight={captionLineHeight}
          textColor={styles.text}
          cardHeight={cardHeight}
          caption={node.caption}
          captionHeight={captionHeight}
        />
      )}

      {isFlipped && (
        <FlippedContent
          isImage={node.type === 'image'}
          cardHeight={cardHeight}
          theme={theme}
          backTextWidth={backTextWidth}
          hasTitle={hasTitle}
          title={node.title}
          backTitleHeight={backTitleHeight}
          backTitleFontFamily={backTitleFontFamily}
          backTitleLineHeight={backTitleLineHeight}
          backFontFamily={backFontFamily}
          backContentLineHeight={backContentLineHeight}
          imageText={imageText}
          backSideText={backSideText}
          cardFontFamily={cardFontFamily}
        />
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

      {effectiveProvider && (
        <Circle
          ref={aiPulseRef}
          x={CARD.WIDTH / 2}
          y={-12}
          radius={10}
          opacity={0.6}
          shadowBlur={16}
          shadowOpacity={0.85}
          listening={false}
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

const KonvaNodeComponent: React.FC<KonvaNodeProps> = ({ nodeId, ...rest }) => {
  const node = useBrainStore((state) => state.nodes.get(nodeId));
  if (!node) return null;
  return <KonvaNodeInner {...rest} node={node} />;
};

const areKonvaNodePropsEqual = (prev: KonvaNodeProps, next: KonvaNodeProps) => (
  prev.nodeId === next.nodeId &&
  prev.theme === next.theme &&
  prev.gravitatingSimilarity === next.gravitatingSimilarity &&
  prev.gravitatingSemanticTheme === next.gravitatingSemanticTheme &&
  prev.gravitatingColorMode === next.gravitatingColorMode &&
  prev.isWandering === next.isWandering &&
  prev.onWanderStep === next.onWanderStep &&
  prev.onEditCard === next.onEditCard &&
  prev.onDragStart === next.onDragStart &&
  prev.onDragEnd === next.onDragEnd &&
  prev.onHover === next.onHover &&
  prev.onContextMenu === next.onContextMenu
);

const KonvaNode = React.memo(KonvaNodeComponent, areKonvaNodePropsEqual);

export default KonvaNode;
