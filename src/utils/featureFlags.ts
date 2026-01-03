// src/utils/featureFlags.ts
// Central place to track optional behavior toggles and experiments.

type FeatureFlags = {
  viewCommitDelayMs: number;
  useCursorRaf: boolean;
  logChatTokens: boolean;
  logChatPayload: boolean;
};

const STORAGE_KEY = 'soul-canvas-feature-flags';

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Set to 0 to disable delayed view commits (useful if zoom/pan feels wobbly).
  viewCommitDelayMs: 250,
  // Set to false to update cursor position on every mousemove (no RAF batching).
  useCursorRaf: true,
  // Log AI token estimates and payloads in the browser console.
  logChatTokens: true,
  logChatPayload: true,
};

const readStoredFlags = (): Partial<FeatureFlags> => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<FeatureFlags>;
  } catch {
    return {};
  }
};

export const FEATURE_FLAGS: FeatureFlags = {
  ...DEFAULT_FEATURE_FLAGS,
  ...readStoredFlags(),
};

const persistFlags = () => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(FEATURE_FLAGS));
};

export const setFeatureFlag = <K extends keyof FeatureFlags>(key: K, value: FeatureFlags[K]) => {
  FEATURE_FLAGS[key] = value;
  persistFlags();
};
