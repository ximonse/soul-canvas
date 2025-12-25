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
- Next: confirm optimization goals and hotspots; review relevant diffs or profiling notes.
