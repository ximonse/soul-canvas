import type { MindNode, Synapse } from '../types/types';
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
    // Better default for images if no rendered height exists
    return { width, height: node.height || CARD.IMAGE_HEIGHT + (node.caption ? 40 : 0) };
  }

  // Estimate height for text nodes - MUST match KonvaNode.tsx calculation
  const textContent = node.ocrText || node.content || '';
  const estimatedLines = textContent.split('\n').length + (textContent.length / 30) + 1;
  let estimatedHeight = Math.max(
    CARD.MIN_HEIGHT,
    Math.min(CARD.MAX_HEIGHT, estimatedLines * CARD.LINE_HEIGHT_TEXT + CARD.PADDING * 2)
  );

  if (node.title) {
    estimatedHeight += CARD.LINE_HEIGHT + CARD.PADDING / 2;
  }

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
  const rowHeights: number[] = new Array(numRows).fill(0);
  sortedNodes.forEach((node, idx) => {
    const row = Math.floor(idx / columns);
    const { height } = nodeDims.get(node.id)!;
    rowHeights[row] = Math.max(rowHeights[row], height);
  });

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

    // Next card in this column starts after this card + 20px gap (as requested)
    columnY[col] += height + 20;
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

/**
 * Arrange nodes in a 16:9 rectangle with most connected nodes in center
 * Less connected nodes spread outward in concentric rings
 */
export const arrangeCentrality = (
  nodes: MindNode[],
  synapses: Synapse[],
  center?: Position
): Map<string, Position> => {
  if (nodes.length === 0) return new Map();

  const nodeIds = new Set(nodes.map(n => n.id));

  // Count connections per node (only count synapses between selected nodes)
  const connectionCount = new Map<string, number>();
  nodes.forEach(n => connectionCount.set(n.id, 0));

  for (const syn of synapses) {
    if (nodeIds.has(syn.sourceId) && nodeIds.has(syn.targetId)) {
      connectionCount.set(syn.sourceId, (connectionCount.get(syn.sourceId) || 0) + 1);
      connectionCount.set(syn.targetId, (connectionCount.get(syn.targetId) || 0) + 1);
    }
  }

  // Sort by connection count (most connected first)
  const sortedNodes = [...nodes].sort((a, b) => {
    const countA = connectionCount.get(a.id) || 0;
    const countB = connectionCount.get(b.id) || 0;
    return countB - countA; // Descending
  });

  const positions = new Map<string, Position>();

  // Calculate rectangle dimensions (16:9 aspect ratio)
  // Determine max dimensions to prevent overlap
  let maxNodeWidth = CARD.WIDTH;
  let maxNodeHeight = CARD.MIN_HEIGHT;

  sortedNodes.forEach(node => {
    const size = getNodeSize(node);
    maxNodeWidth = Math.max(maxNodeWidth, size.width);
    maxNodeHeight = Math.max(maxNodeHeight, size.height);
  });

  // visual buffer
  const bufferX = SPACING.GRID_GAP + 40;
  const bufferY = SPACING.GRID_GAP + 40;

  const avgWidth = maxNodeWidth + bufferX;
  const avgHeight = maxNodeHeight + bufferY;

  // Calculate grid size to fit all nodes in ~16:9 ratio
  const totalNodes = sortedNodes.length;
  // For 16:9: width/height = 16/9, so cols/rows ≈ sqrt(n * 16/9) : sqrt(n * 9/16)
  const cols = Math.max(1, Math.ceil(Math.sqrt(totalNodes * 16 / 9)));
  const rows = Math.max(1, Math.ceil(totalNodes / cols));

  const totalWidth = cols * avgWidth;
  const totalHeight = rows * avgHeight;

  // Center of the rectangle
  const rectCenterX = totalWidth / 2;
  const rectCenterY = totalHeight / 2;

  // Generate all grid positions
  const gridPositions: Position[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      gridPositions.push({
        x: col * avgWidth,
        y: row * avgHeight
      });
    }
  }

  // Sort grid positions by distance from center
  gridPositions.sort((a, b) => {
    const distA = Math.sqrt(Math.pow(a.x - rectCenterX, 2) + Math.pow(a.y - rectCenterY, 2));
    const distB = Math.sqrt(Math.pow(b.x - rectCenterX, 2) + Math.pow(b.y - rectCenterY, 2));
    return distA - distB;
  });

  // Assign most connected nodes to center positions
  for (let i = 0; i < sortedNodes.length && i < gridPositions.length; i++) {
    positions.set(sortedNodes[i].id, gridPositions[i]);
  }

  return centerArrangement(positions, center);
};
