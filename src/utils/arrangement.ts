import type { MindNode } from '../types/types';
import { CARD, SPACING } from './constants';

interface Position {
  x: number;
  y: number;
}

const getNodeSize = (node: MindNode) => {
  const width = node.width || (node.type === 'image' ? CARD.IMAGE_WIDTH : CARD.WIDTH);

  // Calculate height based on content if not explicitly set
  if (node.height) {
    return { width, height: node.height };
  }

  if (node.type === 'image') {
    return { width, height: CARD.IMAGE_HEIGHT };
  }

  // Estimate height for text nodes - MUST match KonvaNode.tsx calculation
  const textContent = node.ocrText || node.content || '';
  const estimatedLines = textContent.split('\n').length + (textContent.length / 30) + 1;
  const estimatedHeight = Math.max(
    CARD.MIN_HEIGHT,
    Math.min(CARD.MAX_HEIGHT, estimatedLines * CARD.LINE_HEIGHT_TEXT + CARD.PADDING * 2)
  );

  return { width, height: estimatedHeight };
};

// Helper to center the arrangement
const centerArrangement = (positions: Map<string, Position>, center?: Position): Map<string, Position> => {
  if (!center || positions.size === 0) return positions;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const pos of positions.values()) {
    minX = Math.min(minX, pos.x);
    maxX = Math.max(maxX, pos.x);
    minY = Math.min(minY, pos.y);
    maxY = Math.max(maxY, pos.y);
  }

  const currentCenterX = (minX + maxX) / 2;
  const currentCenterY = (minY + maxY) / 2;

  const offsetX = center.x - currentCenterX;
  const offsetY = center.y - currentCenterY;

  const centeredPositions = new Map<string, Position>();
  for (const [id, pos] of positions.entries()) {
    centeredPositions.set(id, { x: pos.x + offsetX, y: pos.y + offsetY });
  }

  return centeredPositions;
};

export const arrangeVertical = (nodes: MindNode[], center?: Position): Map<string, Position> => {
  if (nodes.length === 0) return new Map();

  // Använd noderna i den ordning de kommer (kan vara sekvensordning eller Y-sorterad)
  // Fallback till Y-sortering om ingen explicit ordning gavs
  const orderedNodes = nodes;

  // Anchor to the first node's X position
  const startX = orderedNodes[0].x;
  let currentY = Math.min(...nodes.map(n => n.y));

  const positions = new Map<string, Position>();

  orderedNodes.forEach((node) => {
    positions.set(node.id, { x: startX, y: currentY });
    const size = getNodeSize(node);
    currentY += size.height + SPACING.ARRANGEMENT_GAP;
  });

  return centerArrangement(positions, center);
};

export const arrangeHorizontal = (nodes: MindNode[], center?: Position): Map<string, Position> => {
  if (nodes.length === 0) return new Map();

  // Använd noderna i den ordning de kommer (kan vara sekvensordning)
  const orderedNodes = nodes;

  let currentX = Math.min(...nodes.map(n => n.x));
  const startY = orderedNodes[0].y;

  const positions = new Map<string, Position>();

  orderedNodes.forEach((node) => {
    positions.set(node.id, { x: currentX, y: startY });
    const size = getNodeSize(node);
    currentX += size.width + SPACING.ARRANGEMENT_GAP;
  });

  return centerArrangement(positions, center);
};

export const arrangeGridHorizontal = (nodes: MindNode[], columns: number = SPACING.GRID_COLUMNS, center?: Position): Map<string, Position> => {
  if (nodes.length === 0) return new Map();

  // Sort by reading order (Y then X)
  const sortedNodes = [...nodes].sort((a, b) => {
    const rowTolerance = 100;
    if (Math.abs(a.y - b.y) < rowTolerance) return a.x - b.x;
    return a.y - b.y;
  });

  const positions = new Map<string, Position>();
  const nodeDims = new Map<string, { width: number; height: number }>();
  sortedNodes.forEach(node => nodeDims.set(node.id, getNodeSize(node)));

  const startX = Math.min(...nodes.map(n => n.x));
  const startY = Math.min(...nodes.map(n => n.y));

  const maxNodeWidth = Math.max(...Array.from(nodeDims.values()).map(d => d.width), CARD.WIDTH);
  const effectiveColWidth = maxNodeWidth + SPACING.GRID_GAP;

  // Calculate max height for each row
  const numRows = Math.ceil(sortedNodes.length / columns);
  const rowHeights: number[] = [];

  for (let row = 0; row < numRows; row++) {
    let maxHeight = 0;
    for (let col = 0; col < columns; col++) {
      const idx = row * columns + col;
      if (idx >= sortedNodes.length) break;
      const { height } = nodeDims.get(sortedNodes[idx].id)!;
      maxHeight = Math.max(maxHeight, height);
    }
    rowHeights.push(maxHeight);
  }

  // Calculate Y position for each row (cumulative)
  const rowY: number[] = [startY];
  for (let i = 1; i < numRows; i++) {
    rowY[i] = rowY[i - 1] + rowHeights[i - 1] + SPACING.GRID_GAP;
  }

  // Place nodes row by row
  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i];
    const col = i % columns;
    const row = Math.floor(i / columns);

    positions.set(node.id, {
      x: startX + col * effectiveColWidth,
      y: rowY[row]
    });
  }

  return centerArrangement(positions, center);
};

export const arrangeGridVertical = (
  nodes: MindNode[],
  columns: number = SPACING.GRID_COLUMNS,
  center?: Position
): Map<string, Position> => {
  if (nodes.length === 0) return new Map();

  // Sort by reading order (Y then X) - same as g+h for consistency
  const sortedNodes = [...nodes].sort((a, b) => {
    const rowTolerance = 100;
    if (Math.abs(a.y - b.y) < rowTolerance) return a.x - b.x;
    return a.y - b.y;
  });

  const positions = new Map<string, Position>();
  const nodeDims = new Map<string, { width: number; height: number }>();
  sortedNodes.forEach(node => nodeDims.set(node.id, getNodeSize(node)));

  const startX = Math.min(...nodes.map(n => n.x));
  const startY = Math.min(...nodes.map(n => n.y));

  const maxNodeWidth = Math.max(...Array.from(nodeDims.values()).map(d => d.width), CARD.WIDTH);
  const effectiveColWidth = maxNodeWidth + SPACING.GRID_GAP;

  // Track Y position for each column independently (masonry style)
  const columnY: number[] = Array(columns).fill(startY);

  // Fill row by row (same order as g+h), but track each column's Y independently
  for (let i = 0; i < sortedNodes.length; i++) {
    const col = i % columns;
    const node = sortedNodes[i];
    const { height } = nodeDims.get(node.id)!;

    positions.set(node.id, {
      x: startX + col * effectiveColWidth,
      y: columnY[col]
    });

    // Next card in this column starts after this card + gap
    columnY[col] += height + SPACING.GRID_GAP;
  }

  return centerArrangement(positions, center);
};

export const arrangeCircle = (nodes: MindNode[], center?: Position): Map<string, Position> => {
  if (nodes.length === 0) return new Map();

  const sortedNodes = [...nodes].sort((a, b) => {
    const rowTolerance = 100;
    if (Math.abs(a.y - b.y) < rowTolerance) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const positions = new Map<string, Position>();
  const baseX = Math.min(...nodes.map(n => n.x));
  const baseY = Math.min(...nodes.map(n => n.y));

  const offsetStep = 6; // slight shift so edges are visible
  const jitter = 12;    // small random jitter for organic stack

  sortedNodes.forEach((node, index) => {
    const jitterX = (Math.random() - 0.5) * jitter;
    const jitterY = (Math.random() - 0.5) * jitter;
    positions.set(node.id, {
      x: baseX + offsetStep * index + jitterX,
      y: baseY + offsetStep * index + jitterY,
    });
  });

  return centerArrangement(positions, center);
};

export const arrangeKanban = (nodes: MindNode[], columns: number = SPACING.GRID_COLUMNS, center?: Position): Map<string, Position> => {
  if (nodes.length === 0) return new Map();

  // Sort by reading order (top-left first)
  const sortedNodes = [...nodes].sort((a, b) => {
    const rowTolerance = 100;
    if (Math.abs(a.y - b.y) < rowTolerance) {
      return a.x - b.x;
    }
    return a.y - b.y;
  });

  const positions = new Map<string, Position>();
  const startX = Math.min(...nodes.map(n => n.x));
  const startY = Math.min(...nodes.map(n => n.y));

  const nodeDims = new Map<string, { width: number; height: number }>();
  sortedNodes.forEach(node => nodeDims.set(node.id, getNodeSize(node)));

  const maxNodeWidth = Math.max(...Array.from(nodeDims.values()).map(d => d.width), CARD.WIDTH);
  const effectiveColWidth = maxNodeWidth + SPACING.GRID_GAP;
  const rowSpacing = 80; // spacing between stacked cards

  // First card (A1) at top, second card (A2) slightly below and on top visually, etc.
  // Cards with higher Y render on top due to KonvaCanvas sort order
  sortedNodes.forEach((node, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);

    const x = startX + col * effectiveColWidth;
    const y = startY + row * rowSpacing;

    positions.set(node.id, { x, y });
  });

  return centerArrangement(positions, center);
};
