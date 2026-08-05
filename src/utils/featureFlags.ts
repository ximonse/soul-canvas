// src/utils/featureFlags.ts
// Central place to track optional behavior toggles and experiments.

export type FeatureFlags = {
  viewCommitDelayMs: number;
  useCursorRaf: boolean;
  logChatTokens: boolean;
  logChatPayload: boolean;
  enableWanderingTrails: boolean;
  enableGraphGravityControls: boolean;
  enableOmnicalSharedNotes: boolean;
};

const STORAGE_KEY = 'soul-canvas-feature-flags';
export const FEATURE_FLAGS_EVENT = 'soul-canvas-feature-flags-changed';

const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Set to 0 to disable delayed view commits (useful if zoom/pan feels wobbly).
  viewCommitDelayMs: 0,
  // Set to false to update cursor position on every mousemove (no RAF batching).
  useCursorRaf: true,
  // Log AI token estimates and payloads in the browser console.
  logChatTokens: true,
  logChatPayload: true,
  // Experimental navigation/path feature. Keep isolated from stable local v1.
  enableWanderingTrails: false,
  // Experimental force-layout graph controls and layout.
  enableGraphGravityControls: false,
  // Experimental local-folder interoperability with Omnical.
  enableOmnicalSharedNotes: false,
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
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(FEATURE_FLAGS_EVENT, { detail: { key, value } }));
};
