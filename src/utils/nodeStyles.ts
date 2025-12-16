// src/utils/nodeStyles.ts
// Utility för nodstil-beräkningar

import type { Theme } from '../themes';

// Färger för scope-grader
export const getScopeColor = (degree: number | undefined): string => {
  if (!degree) return '#4a4a4a';
  switch (degree) {
    case 1: return '#06b6d4'; // Cyan
    case 2: return '#8b5cf6'; // Lila
    case 3: return '#ec4899'; // Rosa
    case 4: return '#f97316'; // Orange
    default: return '#eab308'; // Gul
  }
};

interface NodeStyleResult {
  bg: string;
  border: string;
  text: string;
  shadow: string;
}

// Beräkna nodstil baserat på ålder och selection
export function getNodeStyles(
  theme: Theme,
  createdAt: string,
  isSelected: boolean,
  customBgColor?: string
): NodeStyleResult {
  const ageInHours = (new Date().getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60);

  let currentBg = theme.node.bg;
  let currentBorder = theme.node.border;
  let currentText = theme.node.text;
  let currentShadow = theme.node.shadow;

  if (ageInHours < 1) { // Hot
    currentBg = theme.node.hotBg || currentBg;
    currentBorder = theme.node.hotBorder || currentBorder;
    currentShadow = theme.node.hotShadow || currentShadow;
    currentText = theme.node.hotText || currentText;
  } else if (ageInHours < 24) { // Active
    currentBg = theme.node.activeBg || currentBg;
    currentBorder = theme.node.activeBorder || currentBorder;
    currentShadow = theme.node.activeShadow || currentShadow;
    currentText = theme.node.activeText || currentText;
  }

  // Override with custom background color from node if present
  if (customBgColor) {
    currentBg = customBgColor;
  }

  // Override for selected state - only change border, not background
  if (isSelected) {
    currentBorder = theme.node.selectedBorder;
    currentShadow = theme.node.selectedShadow;
  }

  return {
    bg: currentBg,
    border: currentBorder,
    text: currentText,
    shadow: currentShadow,
  };
}
