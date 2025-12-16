// src/utils/constants.ts
// Centraliserade konstanter för Soul Canvas

// Kortstorlekar (A7-liknande proportioner)
export const CARD = {
  WIDTH: 250, // Default card width, consistent with Spatial
  MIN_HEIGHT: 120, // Minimum height for a card
  MAX_HEIGHT: 600, // Maximum height for a card
  PADDING: 15, // Padding inside cards
  CORNER_RADIUS: 10, // Border radius for cards
  IMAGE_WIDTH: 280, // Keep existing image related
  IMAGE_HEIGHT: 200, // Keep existing image related
  // Font sizes
  FONT_SIZE: 16, // Main content text
  FONT_SIZE_SMALL: 14, // Flipped header
  FONT_SIZE_TINY: 12, // Flipped content, comments
  // Line heights for height calculations
  LINE_HEIGHT: 18, // Standard line height
  LINE_HEIGHT_TEXT: 20, // Text node line height estimate
} as const;

// Avstånd och spacing
export const SPACING = {
  GRID_GAP: 30, // Gap between cards in grid arrangements
  GRID_COLUMNS: 5,
  ARRANGEMENT_GAP: 40,
  VIEWPORT_MARGIN: 200, // Extra marginal för viewport culling
} as const;

// Zoom-gränser
export const ZOOM = {
  MIN: 0.02,
  MAX: 10,
  DEFAULT: 1,
} as const;

// Autosave
export const AUTOSAVE_DELAY_MS = 2000;

// Bildbearbetning
export const IMAGE = {
  MAX_SIZE: 900,
  QUALITY: 0.8,
} as const;
