// src/hooks/useViewportCulling.ts
// Hook för att beräkna vilka noder som är synliga i viewport

import { useMemo, useState, useEffect, useRef } from 'react';
import type { MindNode } from '../types/types';
import type { ViewState } from './useCanvas';
import { calculateViewport, getVisibleNodes } from '../utils/viewportUtils';

// Only recalculate visible nodes if viewport changed significantly
const VIEWPORT_CHANGE_THRESHOLD = 100; // pixels

interface UseViewportCullingOptions {
  nodes: MindNode[];
  view: ViewState;
  enabled?: boolean;
}

interface UseViewportCullingResult {
  visibleNodes: MindNode[];
  totalNodes: number;
  visibleCount: number;
  viewport: { left: number; top: number; right: number; bottom: number };
}

export function useViewportCulling({
  nodes,
  view,
  enabled = true,
}: UseViewportCullingOptions): UseViewportCullingResult {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Cache for stable viewport reference
  const lastViewportRef = useRef<{ left: number; top: number; right: number; bottom: number } | null>(null);
  const lastVisibleNodesRef = useRef<MindNode[]>([]);

  // Uppdatera skärmstorlek vid resize
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

  // Beräkna viewport med stabilitet
  const viewport = useMemo(() => {
    const newViewport = calculateViewport(view, screenSize.width, screenSize.height);
    const last = lastViewportRef.current;

    // If viewport changed less than threshold, return cached reference
    if (last) {
      const deltaLeft = Math.abs(newViewport.left - last.left);
      const deltaTop = Math.abs(newViewport.top - last.top);
      const deltaRight = Math.abs(newViewport.right - last.right);
      const deltaBottom = Math.abs(newViewport.bottom - last.bottom);

      if (deltaLeft < VIEWPORT_CHANGE_THRESHOLD &&
          deltaTop < VIEWPORT_CHANGE_THRESHOLD &&
          deltaRight < VIEWPORT_CHANGE_THRESHOLD &&
          deltaBottom < VIEWPORT_CHANGE_THRESHOLD) {
        return last; // Return stable reference
      }
    }

    lastViewportRef.current = newViewport;
    return newViewport;
  }, [view, screenSize]);

  // Filtrera synliga noder
  const visibleNodes = useMemo(() => {
    if (!enabled) return nodes;

    // Check if viewport reference changed (means significant change)
    if (viewport === lastViewportRef.current && lastVisibleNodesRef.current.length > 0) {
      // Viewport didn't change significantly, but check if nodes changed
      const lastIds = new Set(lastVisibleNodesRef.current.map(n => n.id));
      const currentIds = new Set(nodes.map(n => n.id));
      if (lastIds.size === currentIds.size && [...lastIds].every(id => currentIds.has(id))) {
        return lastVisibleNodesRef.current;
      }
    }

    const visible = getVisibleNodes(nodes, viewport);
    lastVisibleNodesRef.current = visible;
    return visible;
  }, [nodes, viewport, enabled]);

  return {
    visibleNodes,
    totalNodes: nodes.length,
    visibleCount: visibleNodes.length,
    viewport,
  };
}
