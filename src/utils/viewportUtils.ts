// src/utils/viewportUtils.ts
// Utilities för viewport-beräkningar och culling

import type { MindNode } from '../types/types';
import type { ViewState } from '../hooks/useCanvas';
import { CARD, SPACING } from './constants';

export interface Viewport {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

/**
 * Beräkna viewport i världskoordinater baserat på skärmstorlek och view state
 */
export function calculateViewport(
  view: ViewState,
  screenWidth: number,
  screenHeight: number
): Viewport {
  return {
    left: -view.x / view.k,
    top: -view.y / view.k,
    right: (screenWidth - view.x) / view.k,
    bottom: (screenHeight - view.y) / view.k,
  };
}

/**
 * Kontrollera om en nod är synlig inom viewport (med marginal)
 */
export function isNodeVisible(
  node: MindNode,
  viewport: Viewport,
  margin: number = SPACING.VIEWPORT_MARGIN
): boolean {
  const nodeWidth = node.width || (node.type === 'image' ? CARD.IMAGE_WIDTH : CARD.WIDTH);
  const nodeHeight = node.height || (node.type === 'image' ? CARD.IMAGE_HEIGHT : CARD.MIN_HEIGHT);

  const nodeRight = node.x + nodeWidth;
  const nodeBottom = node.y + nodeHeight;

  return (
    nodeRight >= viewport.left - margin &&
    node.x <= viewport.right + margin &&
    nodeBottom >= viewport.top - margin &&
    node.y <= viewport.bottom + margin
  );
}

/**
 * Filtrera ut synliga noder från en lista
 */
export function getVisibleNodes(
  nodes: MindNode[],
  viewport: Viewport,
  margin?: number
): MindNode[] {
  return nodes.filter(node => isNodeVisible(node, viewport, margin));
}

/**
 * Beräkna bounding box för en lista av noder
 */
export function getNodesBoundingBox(nodes: MindNode[]): Viewport | null {
  if (nodes.length === 0) return null;

  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const node of nodes) {
    const nodeWidth = node.width || (node.type === 'image' ? CARD.IMAGE_WIDTH : CARD.WIDTH);
    const nodeHeight = node.height || (node.type === 'image' ? CARD.IMAGE_HEIGHT : CARD.MIN_HEIGHT);

    left = Math.min(left, node.x);
    top = Math.min(top, node.y);
    right = Math.max(right, node.x + nodeWidth);
    bottom = Math.max(bottom, node.y + nodeHeight);
  }

  return { left, top, right, bottom };
}
