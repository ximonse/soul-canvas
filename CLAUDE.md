# Soul Canvas - instruktioner för AI-assistenter

Detta dokument gäller alla AI-assistenter som hjälper till i repo:t. Håll det kort och praktiskt. För historik: se WORKLOG.md.

## Läs detta först
- AGENTS.md
- docs/SAFETY.md
- docs/QA_CHECKLIST.md
- src/utils/featureFlags.ts

## Vision (kort)
En lokal, canvas-baserad kunskapsyta för tusentals kort med AI-driven förståelse och organisation.

## Aktuell status (hålls kort)
- Fokus: dokumentationssynk + UX-polish.
- Blockers: inga kända.
- Senast uppdaterad: 2026-01-04
- Detaljer: WORKLOG.md

## Kärnprinciper
1. Skala till tusentals kort: viewport-culling, undvik per-kort DOM och tunga loopar.
2. Canvas-first: allt renderas i Konva, ingen HTML-overlay per kort.
3. Local-first: respektera data.json + assets/ och spara ofta.
4. Snabb navigering: kortkommandon är centrala - fråga innan nya läggs till.
5. En fil = ett ansvar. Håll filer under ~300 rader; föreslå uppdelning om större.

## Arkitektur
- React + TypeScript + Vite
- Zustand för state
- Konva/react-konva för canvas
- AI: Claude (taggning/reflektion/chat), OpenAI (embeddings), Gemini (OCR)

## Utvärdera nya features
- Skalar det till tusentals kort?
- Går det att göra i canvas?
- Höjer det AI-nyttan eller förståelsen?
- Passar det nuvarande arkitekturen och state-flödet?

## Arbetsflöde för AI
1. Läs AGENTS/SAFETY/QA och kontrollera feature flags.
2. Om filer blir stora: föreslå refaktor före ny logik.
3. Håll experiment bakom feature flags.
4. Kör `npm run sanity` och notera resultat.
5. Fråga innan git push.

## Referenser
- Historik och detaljer: WORKLOG.md
- Full lista av kortkommandon: docs/SHORTCUTS.md
- Legacy-manifest: Vision and guidelines.md
