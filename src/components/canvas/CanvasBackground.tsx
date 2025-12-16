// src/components/canvas/CanvasBackground.tsx
// Renderar bakgrunden baserat på tema (grid, dots, stars, none)

import { memo } from 'react';
import type { Theme } from '../../themes';
import type { ViewState } from '../../hooks/useCanvas';

interface CanvasBackgroundProps {
  theme: Theme;
  view: ViewState;
}

export const CanvasBackground = memo(function CanvasBackground({
  theme,
  view,
}: CanvasBackgroundProps) {
  const getBackgroundStyle = () => {
    const transform = `translate(${view.x}px, ${view.y}px) scale(${view.k})`;

    switch (theme.bgType) {
      case 'grid':
        return {
          backgroundImage: 'linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          transform,
          color: '#9ca3af',
        };
      case 'dots':
        return {
          backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          transform,
          color: '#6b7280',
        };
      case 'stars':
        // Stars hanteras med CSS animation i App
        return {
          transform,
        };
      case 'none':
      default:
        return {
          transform,
        };
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none opacity-40"
      style={getBackgroundStyle()}
    />
  );
});
