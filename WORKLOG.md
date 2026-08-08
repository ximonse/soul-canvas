# WORKLOG

Detaljerad logg. Håll "Aktuell status" i `CLAUDE.md` kort; lägg detaljer här.

## 2026-08-07
- **Vercel GitHub-autodeploy var trasig sedan länge, nu fixad.** `useBrainStore.ts` importerade statiskt från `trailSlice.ts`/`useWandering.ts`/`trailPathfinding.ts`, men de var gitignorade som "lokala WIP-filer" och fanns aldrig i git. En ren `git clone` (som Vercels GitHub-integration gör) kunde därför inte lösa importen, vilket kollapsade typinferensen för hela `BrainStore` och gav hundratals TS-fel. Alla GitHub-triggade production-builds hade failat historiskt; bara manuella `vercel deploy --prod` från CLI (som packar det som faktiskt ligger på disk) hade lyckats — vilket är varför produktion råkade peka på en feature-branch. Fix: `trailSlice.ts` m.fl. spåras nu i git, bakom samma `enableWanderingTrails`-flagga (av som standard) som `TrailPanel.tsx` redan hade. Se `git log` commit `8d54ec6`.
- **Verifieringsrutin för build-ändringar:** eftersom lokala byggen kan lyckas med filer som saknas i git, verifieras riskabla ändringar nu via `git clone --local` till en temp-mapp + `npm install` + `npm run build`/`test` innan push — inte bara lokalt läge.
- **Omnical: `done`/`archived`/`område`/`remindAt` synkas nu** (utöver `body`/`tags` sedan tidigare), läs+skriv, tre-vägs-merge med bundlat `meta`-konfliktfält. `trackId`/`activityId`/`sources` rörs fortfarande inte (Omnicals interna länk-ID:n). Se `src/utils/omnicalNotes.ts`, `src/utils/omnicalSync.ts`.
- **Bundle-splittning:** `konva`/`react-konva` fick en egen chunk (huvudchunk 756→432 kB gzip). OBS: en tidigare variant som *också* splittade `react`/`react-dom` i en `react-vendor`-chunk orsakade en chunk-cykel i produktion (commit `7211ba1` reverterade den delen) — rör inte react-splittningen utan att verifiera med `vite preview` (riktig produktionsbundle) i webbläsare, inte bara build/lint.
- **Nytt canvas-läge:** "Dölj klara/arkiverade Omnical-kort" i Inställningar (av som standard), filtrerar bort `done`/`archived`-kort i canvas/kolumnvy/minimap.
- Feature-branchen `codex/omnical-shared-notes` är mergad till `main` och borttagen.

## 2026-01-04
- Dokumentation: bantade `CLAUDE.md` till principer + status, flyttade historik hit.
- README: omskriven för vision, praktisk användning och korrekt setup.
- Kortkommandon: flyttade full lista till `docs/SHORTCUTS.md`.
- Legacy: `Vision and guidelines.md` sparad som historiskt manifest.
- Huvudsessions: meny för separata huvudsessioner (egna mappar/data.json) + snabb växling.
- Nästa: bekräfta fokus/roadmap och uppdatera statusraden i `CLAUDE.md`.

## 2025-12-25
- Setup: lade till "Aktuell status" i `CLAUDE.md` och skapade denna logg.
- Kontext: optimeringsarbete pågick; mål och mål-filer ej bekräftade.
- Optimeringsspår (senaste 5 commits):
  - 2497dd2 Batch update embeddings in store -> `src/hooks/useIntelligence.ts`, `src/store/useBrainStore.ts`
  - 7567197 Batch embeddings and tune wheel damping -> `src/components/KonvaCanvas.tsx`, `src/utils/embeddings.ts`
  - 50b6b80 Optimize grid arrangement and fix rate limiter types -> `src/utils/arrangement.ts`, `src/utils/rateLimiter.ts`
  - c9bc7ef Smooth wheel pan/zoom with damping -> `src/components/KonvaCanvas.tsx`
  - 214cf55 Smooth wheel zoom scaling -> `src/components/KonvaCanvas.tsx`
- Snabbfixar:
  - Image assets re-triggar load när assets ändras (`src/components/KonvaNode.tsx`).
  - Select-all använder bulk-selection (`src/hooks/useKeyboardHandlers.ts`).
  - Drag-select respekterar filtrerade noder (`src/components/KonvaCanvas.tsx`).
  - Textkorts-höjd clamping justerad så captions inte klipps (`src/components/KonvaNode.tsx`).
- AI batch:
  - AI-actions prioriterar valda noder och körs sekventiellt (`src/hooks/useIntelligence.ts`, `src/App.tsx`, `src/hooks/useAIPanelActions.ts`, `src/components/CommandPalette.tsx`).
- AI selection consistency:
  - OCR i context-menu föredrar valda bilder (`src/components/overlays/ContextMenu.tsx`).
  - Summarize/title visar antal valda (`src/components/overlays/ContextMenu.tsx`).
- UX:
  - Minimap overlay med viewport och click/drag pan (`src/components/overlays/MiniMap.tsx`, `src/App.tsx`).
  - Ökad kontrast i minimap (`src/components/overlays/MiniMap.tsx`).
  - AI batch status overlay med per-kort status + cancel/close (`src/components/overlays/AIBatchStatus.tsx`, `src/App.tsx`, `src/hooks/useIntelligence.ts`).
  - Compact/expand för AI batch overlay (`src/components/overlays/AIBatchStatus.tsx`).
  - Tightare layout, auto-expand vid fel, flyttad för att undvika zoom-indikator.
  - Standardiserade vänsterpaneler (AI, Session, Wandering) med gemensam sizing/accents.
- Repo hygiene:
  - `src/components/overlays/TrailPanel.tsx` spåras i git (trail-data hålls separat).
- Nästa: bekräfta optimeringsmål och hotspots.

## 2025-12-22 (lokalt, ej i repo)
- Wandering-system (trail navigation) med pathfinding via synapser.
- TrailPanel UI för aktuell trail.
- State-slice för trails + utils för pathfinding.
- ColumnView-komponent och `sortNodes`-utility tillagda lokalt.
- Personlig data (`my_eternal_mind/`, `.claude/`) borttagen från git tracking.

## 2025-12-21
- Sessions/arbetsytor: skapa, byta, byta namn, ta bort; "Alla kort" som all-inclusive.
- Nya kort hamnar i aktiv session; "Ta bort från session" i högerklick.
- Granulär taggfiltrering: klick cyklar neutral/includera/exkludera; visar antal; sortering A-Ö/#.
- Sök utanför session: boolean query + "Lägg till alla".
- SessionPanel: infosammanfattning, expanderbar panel, följer tema.
- Filterbeteende: `Ctrl+A` markerar synliga, `-` fit all zoomar synliga, arrangemang påverkar synliga.
- Ny/ändrad kod: `src/components/SessionPanel.tsx`, `src/hooks/useSessionSearch.ts`, `src/utils/nodeFilters.ts`, `src/hooks/useFileSystem.ts`, `src/App.tsx`.

## 2025-12-15
- Zotero-parser: bättre PDF-länk-extraktion (`src/utils/zoteroParser.ts`).
- Klickbar länk-ikon på kort med PDF-länk (`src/components/KonvaNode.tsx`).
- file:// konverteras till zotero:// för öppning i Zotero.
- Mass-import (`M`): overlay för text, dubbla radbrytningar => nya kort, live-räknare.
- Lärdomar:
  - Zotero HTML-format varierar; whitespace i spans påverkar layout.
  - Storage item-ID kan användas för `zotero://open-pdf/...`.
  - `window.open('file:///')` blockeras i webbläsare.

## 2025-12-14
- D + klick: sekvenskedja med pilar, respekt i V/H-arrangemang, Esc tar bort ur kedja.
- Selection Scope Panel: BFS per grad, `Ctrl+Ö` toggle.
- G + scroll gravity: påverkar markerade + grannar; globalt annars.
- Synapse visibility threshold: slider i AI-panelen för filtrering av linjer/gravity.
- Zoom-indikator och fixar för fit/reset zoom.
- Lärdomar:
  - Konva Stage är sanningskälla under interaktion; synca `canvas.view` vid drag/wheel.
  - Process för nya kortkommandon: kolla upptagna -> föreslå -> fråga -> implementera.
- Fixade TS-fel: `src/hooks/useAIPanelActions.ts`, `src/hooks/useSearch.ts`, `src/utils/chatProviders.ts`.
- Refaktorering: `KonvaCanvas.tsx`, `KonvaNode.tsx`, `AIPanel.tsx` (extraherade delkomponenter).
- Nya filer: `src/components/canvas/SynapseLines.tsx`, `src/components/canvas/SequenceArrows.tsx`, `src/components/ai/ActionSection.tsx`, `src/utils/nodeStyles.ts`, `src/hooks/useNodeDrag.ts`.

## 2025-12-13
- Zotero-import: highlight -> content, caption efter (pdf), författare/år som tags, pdf-länk i comment, accentfärg som stripe.
- Auto-tag via högerklick: Claude genererar praktiska + semantiska taggar.
- CardEditor: expanderbar sektion för semanticTags, tag-chips med remove.
- Accentstripe på färgade kort (12px, klippta hörn, extra padding).
- Claude-modell uppdaterad till `claude-sonnet-4-20250514`.
- TODO: tooltip-positionering under kortet med korrekt zoom-skalning.

## Pre-2025-12-13 highlights
- AI Chat med valbar provider, kontext från markerade kort eller senaste 30.
- Tema-följsamt UI (Command Palette, Settings, AI Chat).
- Högerklicksmeny: "Chatta om valda".
- Raderingsbekräftelse endast vid >=10 markerade kort.
