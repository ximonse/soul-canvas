// Hanterar canvas-interaktioner: pan, zoom, view state, node dragging

import React, { useState, useCallback, useEffect } from 'react';

const VIEW_STORAGE_KEY = 'soul-canvas-view';

function loadViewFromStorage(): ViewState {
  try {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (typeof parsed.x === 'number' && typeof parsed.y === 'number' && typeof parsed.k === 'number') {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return { x: 0, y: 0, k: 1 };
}

export interface ViewState {
  x: number;
  y: number;
  k: number; // scale/zoom
}

export interface CanvasAPI {
  view: ViewState;
  setView: React.Dispatch<React.SetStateAction<ViewState>>;
  cursorPos: { x: number; y: number };
  setCursorPos: React.Dispatch<React.SetStateAction<{ x: number; y: number }>>;
  centerOnNodes: (nodes: { x: number; y: number }[]) => void;
  screenToWorld: (screenX: number, screenY: number) => { x: number; y: number };
  worldToScreen: (worldX: number, worldY: number) => { x: number; y: number };
}

export function useCanvas(): CanvasAPI {
  const [view, setView] = useState<ViewState>(loadViewFromStorage);

  // Spara view till localStorage när det ändras
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(view));
  }, [view]);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 }); // World coordinates
  
  // Konvertera skärmkoordinater till världskoordinater
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    return {
      x: (screenX - view.x) / view.k,
      y: (screenY - view.y) / view.k,
    };
  }, [view]);

  // Konvertera världskoordinater till skärmkoordinater
  const worldToScreen = useCallback((worldX: number, worldY: number) => {
    return {
      x: worldX * view.k + view.x,
      y: worldY * view.k + view.y,
    };
  }, [view]);

  // Centrera kameran på specifika noder
  const centerOnNodes = useCallback((nodes: { x: number; y: number }[]) => {
    if (nodes.length === 0) {
      setView({ x: 0, y: 0, k: 1 });
      return;
    }

    let sumX = 0, sumY = 0;
    nodes.forEach(n => {
      sumX += n.x;
      sumY += n.y;
    });

    const centerX = sumX / nodes.length;
    const centerY = sumY / nodes.length;

    setView(prev => ({
      ...prev,
      x: (window.innerWidth / 2) - (centerX * prev.k),
      y: (window.innerHeight / 2) - (centerY * prev.k),
    }));
  }, []);

  return {
    view,
    setView,
    cursorPos,
    setCursorPos,
    centerOnNodes,
    screenToWorld,
    worldToScreen,
  };
}
