# WORKLOG

Detailed progress log. Keep `CLAUDE.md` "Aktuell status" short; capture details here.

## 2025-12-25
- Setup: added the "Aktuell status" section in `CLAUDE.md` and created this log.
- Context: optimization work was in progress; goal and target files are not confirmed yet.
- Recent optimization artifacts (last 5 commits):
  - 2497dd2 Batch update embeddings in store -> `src/hooks/useIntelligence.ts`, `src/store/useBrainStore.ts`
  - 7567197 Batch embeddings and tune wheel damping -> `src/components/KonvaCanvas.tsx`, `src/utils/embeddings.ts`
  - 50b6b80 Optimize grid arrangement and fix rate limiter types -> `src/utils/arrangement.ts`, `src/utils/rateLimiter.ts`
  - c9bc7ef Smooth wheel pan/zoom with damping -> `src/components/KonvaCanvas.tsx`
  - 214cf55 Smooth wheel zoom scaling -> `src/components/KonvaCanvas.tsx`
- Quick fixes:
  - Image assets now re-trigger loads when assets change (`src/components/KonvaNode.tsx`).
  - Select-all uses bulk selection instead of per-node toggles (`src/hooks/useKeyboardHandlers.ts`).
  - Drag-select respects filtered nodes (session/tag filters) (`src/components/KonvaCanvas.tsx`).
- Fixes:
  - Adjusted text card height clamping so captions are no longer clipped (`src/components/KonvaNode.tsx`).
- AI batch:
  - AI actions now prioritize selected nodes and process them sequentially to avoid request bursts (`src/hooks/useIntelligence.ts`, `src/App.tsx`, `src/hooks/useAIPanelActions.ts`, `src/components/CommandPalette.tsx`).
- AI selection consistency:
  - OCR in the context menu now prefers selected images when any are selected (`src/components/overlays/ContextMenu.tsx`).
  - Summarize/title menu labels now show selection counts (`src/components/overlays/ContextMenu.tsx`).
- UX:
  - Added a minimap overlay for canvas view with viewport rectangle and click/drag pan (`src/components/overlays/MiniMap.tsx`, `src/App.tsx`).
  - Increased minimap contrast for better readability (`src/components/overlays/MiniMap.tsx`).
- UX:
  - Added AI batch status overlay with per-card status plus cancel/close controls (`src/components/overlays/AIBatchStatus.tsx`, `src/App.tsx`, `src/hooks/useIntelligence.ts`).
- UX:
  - Added compact/expand mode for AI batch overlay (`src/components/overlays/AIBatchStatus.tsx`).
- UX:
  - Tightened AI batch overlay layout and auto-expands on errors/cancel; moved to avoid zoom indicator (`src/components/overlays/AIBatchStatus.tsx`).
  - Standardized left panels (AI, Session, Wandering) with shared sizing and accent border colors (`src/components/AIPanel.tsx`, `src/components/SessionPanel.tsx`, `src/components/overlays/TrailPanel.tsx`).
- Repo hygiene:
  - Stopped ignoring `src/components/overlays/TrailPanel.tsx` and tracked it in git (keep personal trail data elsewhere).
- Next: confirm optimization goals and hotspots; review relevant diffs or profiling notes.
