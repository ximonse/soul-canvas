// src/utils/featureFlags.ts
// Central place to track optional behavior toggles and experiments.

export const FEATURE_FLAGS = {
  // Set to 0 to disable delayed view commits (useful if zoom/pan feels wobbly).
  viewCommitDelayMs: 250,
  // Set to false to update cursor position on every mousemove (no RAF batching).
  useCursorRaf: true,
} as const;
