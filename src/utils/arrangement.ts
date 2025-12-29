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
 * Arrange nodes by Centrality:
 * 1. Use Spiral Grid logic to determine Integer Coordinates (Col, Row).
 * 2. Post-process to align the Middle card of each column to Y=0.
 * 3. Stack other cards above/below based on actual height to prevent overlap.
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

    const nodeDims = new Map<string, { width: number; height: number }>();
    sortedNodes.forEach(node => nodeDims.set(node.id, getNodeSize(node)));

    // 1. Calculate Standard Spiral Grid assignments (Integer Col, Row)
    // ----------------------------------------------------------------
    const totalNodes = sortedNodes.length;
    // For 16:9 ratio
    const cols = Math.max(1, Math.ceil(Math.sqrt(totalNodes * 16 / 9)));
    const rows = Math.max(1, Math.ceil(totalNodes / cols));

    // Create all integer grid positions (0,0), (1,0)...
    // Center is roughly at (cols/2, rows/2)
    const gridPositions: { col: number; row: number; dist: number }[] = [];
    const centerX = (cols - 1) / 2;
    const centerY = (rows - 1) / 2;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            // Euclidean distance from center
            const dist = Math.sqrt(Math.pow(c - centerX, 2) + Math.pow(r - centerY, 2));
            gridPositions.push({ col: c, row: r, dist });
        }
    }

    // Sort positions by distance from center so closest get most connected nodes
    gridPositions.sort((a, b) => a.dist - b.dist);

    // Assign nodes to (Col, Row) buckets
    const colGroups = new Map<number, { node: MindNode; row: number }[]>();

    for (let i = 0; i < sortedNodes.length; i++) {
        if (i >= gridPositions.length) break; // Should fit if calcs are right

        const node = sortedNodes[i];
        const pos = gridPositions[i];

        if (!colGroups.has(pos.col)) {
            colGroups.set(pos.col, []);
        }
        colGroups.get(pos.col)!.push({ node, row: pos.row });
    }

    // 2. Real Layout Creation with Vertical Alignment
    // ---------------------------------------------
    const positions = new Map<string, Position>();

    // Calculate column dimensions
    let maxNodeWidth = CARD.WIDTH;
    sortedNodes.forEach(node => {
        const size = nodeDims.get(node.id)!;
        maxNodeWidth = Math.max(maxNodeWidth, size.width);
    });

    const colWidth = maxNodeWidth + SPACING.GRID_GAP + 40; // Wider gap as requested

    // Calculate X offsets to center the whole grid around 0
    const layoutWidth = cols * colWidth;
    const globalStartX = -layoutWidth / 2 + colWidth / 2;

    // Process each column independently
    colGroups.forEach((items, colIndex) => {
        // Sort items by Row index (Top to Bottom)
        items.sort((a, b) => a.row - b.row);

        // Find the "Middle" item in this column to anchor at Y=0
        // "Middle" is index length/2 roughly?
        // User wants "Middle card aligned". 
        // Ideally, the item with row closest to global center row? NO, just visual middle of the column stack.
        const middleIdx = Math.floor((items.length - 1) / 2);
        const middleItem = items[middleIdx];

        const currentX = globalStartX + colIndex * colWidth;

        // Place middle item at Y=0 (centered on its own height)
        const midH = nodeDims.get(middleItem.node.id)!.height;
        positions.set(middleItem.node.id, { x: currentX, y: -midH / 2 });

        // Stack items ABOVE middle (going up)
        let currentTopY = -midH / 2 - SPACING.GRID_GAP;
        for (let i = middleIdx - 1; i >= 0; i--) {
            const item = items[i];
            const h = nodeDims.get(item.node.id)!.height;

            positions.set(item.node.id, { x: currentX, y: currentTopY - h });
            currentTopY -= (h + SPACING.GRID_GAP);
        }

        // Stack items BELOW middle (going down)
        let currentBottomY = midH / 2 + SPACING.GRID_GAP;
        for (let i = middleIdx + 1; i < items.length; i++) {
            const item = items[i];
            const h = nodeDims.get(item.node.id)!.height;

            positions.set(item.node.id, { x: currentX, y: currentBottomY });
            currentBottomY += (h + SPACING.GRID_GAP);
        }
    });

    return centerArrangement(positions, center);
};
