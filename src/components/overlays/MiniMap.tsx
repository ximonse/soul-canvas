import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import type { MindNode } from '../../types/types';
import type { Theme } from '../../themes';
import type { ViewState } from '../../hooks/useCanvas';
import { CARD } from '../../utils/constants';
import { calculateViewport, getNodesBoundingBox } from '../../utils/viewportUtils';

interface MiniMapProps {
  nodes: MindNode[];
  selectedNodeIds: Set<string>;
  view: ViewState;
  theme: Theme;
  onCenterPoint: (x: number, y: number) => void;
}

const MINI_MAP_WIDTH = 220;
const MINI_MAP_HEIGHT = 160;
const MINI_MAP_PADDING = 8;
const MIN_NODE_SIZE = 2;

const getNodeSize = (node: MindNode) => {
  const width = node.width || (node.type === 'image' ? CARD.IMAGE_WIDTH : CARD.WIDTH);
  const height = node.height || (node.type === 'image' ? CARD.IMAGE_HEIGHT : CARD.MIN_HEIGHT);
  return { width, height };
};

export const MiniMap: React.FC<MiniMapProps> = ({
  nodes,
  selectedNodeIds,
  view,
  theme,
  onCenterPoint,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const viewport = useMemo(
    () => calculateViewport(view, screenSize.width, screenSize.height),
    [view, screenSize]
  );

  const bounds = useMemo(() => getNodesBoundingBox(nodes), [nodes]);
  const transform = useMemo(() => {
    if (!bounds) {
      return {
        scale: 1,
        offsetX: MINI_MAP_PADDING,
        offsetY: MINI_MAP_PADDING,
        left: 0,
        top: 0,
      };
    }

    const worldWidth = Math.max(bounds.right - bounds.left, 1);
    const worldHeight = Math.max(bounds.bottom - bounds.top, 1);
    const availableWidth = MINI_MAP_WIDTH - MINI_MAP_PADDING * 2;
    const availableHeight = MINI_MAP_HEIGHT - MINI_MAP_PADDING * 2;
    const scale = Math.min(
      availableWidth / worldWidth,
      availableHeight / worldHeight
    );

    const drawWidth = worldWidth * scale;
    const drawHeight = worldHeight * scale;
    const offsetX = MINI_MAP_PADDING + (availableWidth - drawWidth) / 2;
    const offsetY = MINI_MAP_PADDING + (availableHeight - drawHeight) / 2;

    return {
      scale,
      offsetX,
      offsetY,
      left: bounds.left,
      top: bounds.top,
    };
  }, [bounds]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, MINI_MAP_WIDTH, MINI_MAP_HEIGHT);
    ctx.save();
    ctx.fillStyle = theme.canvasColor;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 0, MINI_MAP_WIDTH, MINI_MAP_HEIGHT);
    ctx.restore();

    if (!bounds) {
      ctx.fillStyle = theme.node.text;
      ctx.globalAlpha = 0.6;
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('Inga kort', MINI_MAP_PADDING, MINI_MAP_HEIGHT / 2);
      ctx.globalAlpha = 1;
      return;
    }

    ctx.save();
    ctx.fillStyle = theme.node.text;
    ctx.globalAlpha = 0.7;
    for (const node of nodes) {
      const { width, height } = getNodeSize(node);
      const x = transform.offsetX + (node.x - transform.left) * transform.scale;
      const y = transform.offsetY + (node.y - transform.top) * transform.scale;
      const w = Math.max(width * transform.scale, MIN_NODE_SIZE);
      const h = Math.max(height * transform.scale, MIN_NODE_SIZE);
      ctx.fillRect(x, y, w, h);
    }
    ctx.restore();

    if (selectedNodeIds.size > 0) {
      ctx.save();
      ctx.fillStyle = theme.node.selectedBorder;
      ctx.globalAlpha = 1;
      for (const node of nodes) {
        if (!selectedNodeIds.has(node.id)) continue;
        const { width, height } = getNodeSize(node);
        const x = transform.offsetX + (node.x - transform.left) * transform.scale;
        const y = transform.offsetY + (node.y - transform.top) * transform.scale;
        const w = Math.max(width * transform.scale, MIN_NODE_SIZE + 1);
        const h = Math.max(height * transform.scale, MIN_NODE_SIZE + 1);
        ctx.fillRect(x, y, w, h);
      }
      ctx.restore();
    }

    const vx = transform.offsetX + (viewport.left - transform.left) * transform.scale;
    const vy = transform.offsetY + (viewport.top - transform.top) * transform.scale;
    const vw = (viewport.right - viewport.left) * transform.scale;
    const vh = (viewport.bottom - viewport.top) * transform.scale;

    ctx.save();
    ctx.strokeStyle = theme.lineColor;
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(vx, vy, vw, vh);
    ctx.restore();
  }, [bounds, nodes, selectedNodeIds, theme, transform, viewport]);

  const handlePointer = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!bounds) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const worldX = transform.left + (localX - transform.offsetX) / transform.scale;
    const worldY = transform.top + (localY - transform.offsetY) / transform.scale;
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) return;
    onCenterPoint(worldX, worldY);
  }, [bounds, onCenterPoint, transform]);

  const [isDragging, setIsDragging] = useState(false);
  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.stopPropagation();
    setIsDragging(true);
    handlePointer(event);
  };
  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    event.stopPropagation();
    handlePointer(event);
  };
  const handleMouseUp = (event: React.MouseEvent<HTMLCanvasElement>) => {
    event.stopPropagation();
    setIsDragging(false);
  };

  return (
    <div
      className="absolute bottom-4 right-4 z-40 rounded-xl border shadow-lg backdrop-blur"
      style={{
        backgroundColor: theme.node.bg + 'f0',
        borderColor: theme.node.text,
        color: theme.node.text,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="px-3 pt-2 text-[11px] uppercase tracking-wide opacity-70">
        Minikarta
      </div>
      <canvas
        ref={canvasRef}
        width={MINI_MAP_WIDTH}
        height={MINI_MAP_HEIGHT}
        className="block m-2 rounded-lg cursor-pointer"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => setIsDragging(false)}
      />
    </div>
  );
};
