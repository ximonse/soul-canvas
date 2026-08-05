# Stable Local V1 Plan

Datum: 2026-06-21  
Mal: skapa en lokal guldversion av Soul Canvas innan webbappsombyggnad.

## Definition Av Klar

Soul Canvas lokal v1 ar klar nar appen kan anvandas som trygg referensversion:

- Oppna en arbetsmapp och ladda `data.json` + `assets`.
- Skapa, redigera, flytta, kopiera, importera och radera kort utan datatapp.
- Autospara och manuell spara fungerar konsekvent.
- Misslyckad save syns tydligt och behaller dirty state.
- Export/import kan anvandas som backup och migration.
- Alla `keep`-funktioner i `FEATURE_AUDIT.md` har smoke-testats.
- Experiment ar dokumenterade, gomda eller tydligt markerade.

## Prioritet 1: Datasakerhet

### Dirty state och autosave

Alla mutationer som andrar sparad data ska ga genom ett tydligt kontrakt:

- Node CRUD, positions, tags, pinning, crop, OCR, AI metadata.
- Synapses, sequences, trails.
- Sessions och session membership.
- Conversations.
- Settings som sparas i `data.json` om de tillhor dokumentet.

Implementation:

- Skapa en intern helper eller store-konvention som alltid satter `pendingSave: true` vid persistenta andringar.
- Lagga tester for representativa actions:
  - add/update/delete node.
  - duplicate/copy-paste.
  - pin/unpin.
  - add/remove tag.
  - session create/rename/delete/add/remove cards.
  - sequence delete/split/remove waypoint.

### Save failure handling

`saveFile` far inte svalja fel.

Krav:

- Vid fel: logga tekniskt fel, visa notification, behall `pendingSave: true`.
- UI ska skilja pa `waiting`, `saving`, `saved`, `error`.
- Manual save ska returnera success/failure till caller.
- Autosave ska inte visa "saved" om skrivningen misslyckas.

### Asset roundtrip

Krav:

- Asset references ska verifieras vid load.
- `assets/` och relevanta subdirs ska hanteras konsekvent.
- Importerade original ska inte blandas ihop med renderbara assets.
- Missing asset ska ge synlig placeholder och audit-varning, inte tyst blankt kort.

## Prioritet 2: Backup Och Migration

### Full workspace export

Skapa en tydlig exportfunktion i appen:

- Exporterar `data.json`.
- Exporterar renderbara assets.
- Exporterar asset manifest.
- Inkluderar metadata: appversion, exportdatum, antal kort/assets.

Acceptanskriterium:

- Exporten ska kunna importeras i en tom lokal workspace och ge samma noder, synapser, sessioner och bildreferenser.

### Legacy import

JSON-import ska behandlas som migration/backup, inte bara "lagg till kort".

Krav:

- Validera format.
- Visa antal noder/synapser/sessioner innan import nar mojligt.
- Undvik id-krockar eller hantera dem explicit.
- Skriv tester for dagens sample-data och en minimal export.

## Prioritet 3: Stabil Kärnupplevelse

### Canvas

Smoke-testa och fixa:

- Zoom/pan utan wobble.
- Fit all pa synliga kort.
- Minimap bounds och click/drag pan.
- Selection, drag-select, multi-select.
- Copy/paste inom session.
- Delete i session vs permanent delete.
- Card editor for text, image och zotero.

### Organisation

Smoke-testa och fixa:

- Session create/switch/rename/delete.
- Add/remove cards from session.
- Tag include/exclude.
- Search overlay och outside-session search.
- Column view sort/toggles.
- Selection Scope Panel.

### Import

Smoke-testa och fixa:

- Image drag/drop.
- PDF import med flera sidor.
- Zotero HTML/plaintext.
- RIS + PDF metadata.
- Obsidian markdown utan AI.
- Obsidian smart import med saknad Claude-nyckel och med mockad/aktiv nyckel.
- Mass import.

### AI

Smoke-testa och fixa:

- Saknad API-nyckel ska ge begriplig UI-signal.
- OCR pa bildkort.
- Generate tags.
- Suggest title.
- Summarize to comment.
- Embeddings och semantic search.
- Auto-link.
- Batch cancel/clear.
- AI-arrange via chat endast om den kan verifieras: valda kort ska faktiskt flyttas, och resultattexten ska inte overdriva vad AI:n gjorde.

## Prioritet 4: Produktbeslut Och Städning

### Markera experiment

Foljande ska inte blockera lokal v1:

- Wandering/trails: isoleras och ska inte inga i lokal v1.
- Gravity/physics controls: isoleras eftersom nuvarande beteende kan skicka kort for langt bort.
- Week view.
- Eternal view.
- Cluster analysis.
- Reflection chat.
- Quote extractor om den inte ar central i faktisk anvandning.
- AI chat tool-actions som pastar sig arrangera/sortera kort utan verifierbar effekt.

Atgard:

- Wandering/trails ar default-off bakom `enableWanderingTrails`.
- Graph gravity/layout ar default-off bakom `enableGraphGravityControls`, inklusive `Ctrl+scroll` och AI-panelens `Graf`-layout.
- Dokumentera exakt vad som kravs for att flytta fran `isolate`/`defer` till `keep`.
- Om en isolerad funktion fortfarande finns i kod ska QA bara verifiera att den inte stor karnflodet.
- AI-arrangering ska beskrivas snavt: den kan anropa befintliga layoutfunktioner pa markerade kort; den ar inte automatiskt semantisk sortering.

### Dokumentation

Uppdatera:

- `README.md`: lokal guldversion, data/backup, AI-nycklar.
- `docs/SHORTCUTS.md`: ta bort eller markera ofardiga genvagar.
- `docs/QA_CHECKLIST.md`: lagg till save/load/import/export checks.
- `CLAUDE.md`: aktuell status och fokus.

## Testplan

Automatiska tester:

- Unit: parsers, filters, sorting, dirty state, export/import serialization.
- Integration-light: store action -> dirty state -> serialized document.
- Regression: sample data load/save roundtrip.

Manuell QA:

1. Oppna tom workspace.
2. Skapa textkort, bildkort och importera PDF.
3. Skapa session, flytta in/ut kort, filtrera pa taggar.
4. Kor OCR/tag/title/summary pa minst ett kort.
5. Skapa embeddings och auto-link.
6. Spara, reload, verifiera datan.
7. Exportera, importera i ny workspace, verifiera datan.
8. Kor `npm run sanity`.

## Icke-Mål För Lokal V1

- Ingen ny webbapp.
- Ingen multi-user auth.
- Ingen molndatabas.
- Ingen realtidssync.
- Ingen stor UI-redesign.
- Inga nya AI-funktioner innan befintliga ar stabila.
- Ingen aterupplivning av wandering/trails i lokal v1.
- Ingen vidareutveckling av gravity/physics controls i lokal v1.

## Rekommenderad Arbetsordning

1. Dirty state + save error handling.
2. Asset manifest och missing asset UI.
3. Export/import roundtrip.
4. Store- och parser-tester.
5. Smoke-fixa keep-funktioner.
6. Dokumentera/gom experiment.
7. Tagga lokal guldversion.
