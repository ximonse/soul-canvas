# WORKLOG

Detailed progress log. Keep `CLAUDE.md` "Aktuell status" short; capture details here.

## 2025-12-26 - Zotero MCP Integration (PHASE 1-2 påbörjad)

**Branch:** `feature/zotero-integration` (fork från main)

**Mål:** Integrera Zotero via MCP för att söka, läsa och importera från forskningsbiblioteket.

**PHASE 1 - Backend Bridge: ✅ KLAR**
- Skapat `backend/` med Node.js + TypeScript
- WebSocket server på port 3001
- MCP client som pratar med zotero-mcp-server via stdio
- Message router för search, annotations, fullText, collections
- In-memory cache med TTL
- Health endpoint fungerar
- Windows-fix: använder `node` direkt med path till zotero-mcp
- Commit: `1a4b148`

**PHASE 2 - Frontend Panel: ⏳ PÅGÅENDE**
- ✅ Skapat `src/types/zotero.ts` (types för items, annotations, WS messages)
- ✅ Skapat `src/store/slices/zoteroSlice.ts` (Zustand state)
- ✅ Skapat `src/utils/zoteroClient.ts` (WebSocket wrapper med auto-reconnect)
- ⏳ Kvar: useZotero hook, ZoteroPanel UI, App.tsx integration, keyboard shortcuts

**Nästa:** Se ZOTERO_STATUS.md för full status och nästa steg.

---

## 2025-12-27 - Zotero Bridge Local Plugin + MCP Bring-up

**Work done (today):**
- Fixed Zotero plugin packaging so XPI uses forward slashes (src/bridge.js) and installs cleanly.
- Added required manifest update_url to satisfy Zotero 7 validation.
- Switched bridge endpoints to Zotero's Endpoint init() API (fixes 500s on /bridge/ping).
- Added delayed registration after Zotero init to avoid startup races.
- Rebuilt XPI and confirmed endpoints list in Zotero console.
- Verified /bridge/ping works once token matches.
- Added docs/MCP_SETUP.md with step-by-step MCP setup for Claude Desktop (local repo).

**Now (next action):**
- Build MCP server in zotero-bridge (npm install + npm run build).
- Add MCP server config to Claude Desktop (claude_desktop_config.json) with token + local bridge URL.
- Restart Claude Desktop and test tool list / zotero_list_collections.

**Next (after Claude Desktop works):**
- Wire Soul Canvas to use local zotero-bridge MCP server (env override for MCP path).
- Add a short Soul Canvas README note on local MCP path + env vars.
- Quick smoke tests: list collections, fetch item, get annotations, local PDF search tool.

---

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
