// src/hooks/useViewportCulling.ts
// Hook för att beräkna vilka noder som är synliga i viewport

import { useMemo, useState, useEffect } from 'react';
import type { MindNode } from '../types/types';
import type { ViewState } from './useCanvas';
import { calculateViewport, getVisibleNodes } from '../utils/viewportUtils';

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

  // Beräkna viewport
  const viewport = useMemo(() => (
    calculateViewport(view, screenSize.width, screenSize.height)
  ), [view, screenSize.width, screenSize.height]);

  // Filtrera synliga noder
  const visibleNodes = useMemo(() => {
    if (!enabled) return nodes;
    return getVisibleNodes(nodes, viewport);
  }, [nodes, viewport, enabled]);

  return {
    visibleNodes,
    totalNodes: nodes.length,
    visibleCount: visibleNodes.length,
    viewport,
  };
}
