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
    case 5: return '#eab308'; // Gul
    case 6: return '#22c55e'; // Grön
    default: return '#eab308'; // Gul
  }
};

// Färger för graviterade kort baserat på similarity (gradient mode)
export const getGravitatingColor = (similarity: number): string => {
  // Interpolera från dämpad grön (låg) till ljus cyan (hög)
  const hue = 160 + (similarity * 20); // 160-180 (grön till cyan)
  const saturation = 60 + (similarity * 30); // 60-90%
  const lightness = 40 + (similarity * 20); // 40-60%
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// Färger för semantiska teman (AI-klassade)
export const SEMANTIC_THEME_COLORS: Record<string, string> = {
  existential: '#9b59b6',   // Lila - existentiellt/filosofiskt
  practical: '#27ae60',     // Grön - praktiskt/handling
  creative: '#e74c3c',      // Röd - kreativt/konstnärligt
  analytical: '#3498db',    // Blå - analytiskt/logiskt
  emotional: '#f39c12',     // Orange - emotionellt/personligt
  neutral: '#95a5a6',       // Grå - neutralt/informativt
};

// Hämta färg för semantiskt tema
export const getSemanticThemeColor = (theme?: string): string => {
  if (!theme) return SEMANTIC_THEME_COLORS.neutral;
  return SEMANTIC_THEME_COLORS[theme.toLowerCase()] || SEMANTIC_THEME_COLORS.neutral;
};

// Beräkna glow-opacitet baserat på similarity
export const getGravitatingGlowOpacity = (similarity: number): number => {
  // 0.3 - 0.8 opacity baserat på similarity
  return 0.3 + (similarity * 0.5);
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

  // Override for selected state - change border, shadow, text AND background if specified in theme
  if (isSelected) {
    // Only override background if the theme has a specific selectedBg different from the base node bg
    // This allows themes like E-Ink to invert colors, while others keep the original background
    if (theme.node.selectedBg !== theme.node.bg) {
        currentBg = theme.node.selectedBg;
    }
    currentBorder = theme.node.selectedBorder;
    currentShadow = theme.node.selectedShadow;
    currentText = theme.node.selectedText;
  }

  return {
    bg: currentBg,
    border: currentBorder,
    text: currentText,
    shadow: currentShadow,
  };
}
