# Soul Canvas Feature Audit

Datum: 2026-06-21  
Syfte: avgora vad som ska bevaras, fixas, designas om, skjutas upp eller tas bort innan Soul Canvas byggs om till webbapp.

## Statusnyckel

| Status | Betydelse |
| --- | --- |
| `keep` | Central funktion som ska vara med i stabil lokal v1 och senare webbapp. |
| `fix` | Ska vara kvar, men har stabilitets-, data- eller UX-risk innan v1. |
| `redesign` | Idén är värdefull men nuvarande form bör inte cementeras. |
| `isolate` | Behall bara avskilt/bakom flagga; ska inte inga i stabil v1 eller webb-v1. |
| `defer` | Lovande experiment som inte ska blockera lokal v1 eller webbapp-arkitektur. |
| `remove` | Bör tas bort eller döljas om den saknar tydligt syfte. |

## Samlad Bedömning

Soul Canvas har en stark kärna: local-first canvas, kort, sessioner, import, sök och AI som hjälper användaren att se mönster. Den största risken är inte en enskild bugg utan att appen har vuxit till många parallella experiment utan en tydlig stabilitetsgräns.

Kärnan för lokal guldversion bör vara:

- Trygg data: öppna, spara, autospara, exportera och ladda om utan datatapp.
- Canvas som huvudyta: kort, bilder, zoom/pan, selection, arrangemang, minimap.
- Organisation: sessioner, taggar, sök, kolumnvy.
- Import: bild, PDF, Zotero, markdown/Obsidian, JSON backup.
- AI: OCR, taggar, sammanfattning/titel, embeddings/sök, men med begriplig felhantering.

Funktioner som ska isoleras eller behandlas som experiment tills de har tydligare produktroll:

- Wandering/trails: iden ar stark men nuvarande funktion blev aldrig stabil nog.
- Gravity/physics controls: iden ar stark men nuvarande beteende kan skicka kort langt bort.
- Eternal/week canvas views.
- Reflection/chat som "terapeutisk" yta.
- Quote extractor och avancerade Zotero/RIS/COinS-varianter.
- AI-agentens verktyg i chatten, sarskilt arrangering som kan lata mer intelligent an den faktiskt ar.

## Data, Lagring Och System

| Funktion | Entry point | Data | Status | Beslut |
| --- | --- | --- | --- | --- |
| Folder open via File System Access API | Startknapp / `openFile` | Directory handle, `data.json`, `assets/` | Fungerar i Chromium, central | `keep` |
| Restore previous folder from IndexedDB | App start | Saved directory handle | Bra UX, men behorighet kan fallera tyst | `fix` |
| Manual save | `Ctrl+Enter`, NotificationSystem | `data.json` | Central | `fix` |
| Autosave | `pendingSave` effect | `data.json` | Risk: flera muterande actions satter inte dirty state | `fix` |
| Save failure handling | `useFileSystem.saveFile` | File write | Risk: sparfel svaljs tyst | `fix` |
| Asset write | Image/PDF import/crop | `assets/`, `assets/originals/` | Central | `fix` |
| Asset load | Folder load | Blob URLs | Risk: bara direktfiler under `assets/` laddas | `fix` |
| AI exports | 30-min interval | `ai-exports/` | Bra for extern AI/backup, men otydligt for anvandare | `redesign` |
| API keys in localStorage | Settings | Gemini/OpenAI/Claude keys | Rimligt for lokal app, ej webbapp-sakert | `fix` |
| Feature flags | Settings/localStorage | View/cursor/token logging | Bra felsokningsyta | `keep` |
| `clean_json.py` | CLI | `data.json` | Bra underhallsverktyg | `keep` |
| Backend folder | `backend/` | Oklar | Ingen aktiv egen kod upptackt | `remove`/`defer` efter kontroll |

Krav for stabil lokal v1:

- Alla store-actions som andrar sparad data ska markera dirty.
- Misslyckad save ska visa notification och behalla dirty state.
- Asset-referenser ska kunna verifieras vid load.
- Export ska finnas som anvandarens sista skydd mot datatapp.

## Canvas Och Kort

| Funktion | Entry point | Data | Status | Beslut |
| --- | --- | --- | --- | --- |
| Textkort | `N`, canvas/context | `MindNode type=text` | Central | `keep` |
| Bildkort | Image/PDF import | `MindNode type=image`, `imageRef/assets` | Central | `keep` |
| Zotero-kort | Zotero HTML/plaintext | `MindNode type=zotero`, metadata | Viktig men formatkanslig | `fix` |
| Card editor | Dubbelklick/kortedit | Node fields | Central men stor komponent | `fix` |
| Markdown rendering | Card/comment display | content/comment | Viktig for anteckningar | `keep` |
| Image cropper | Card editor | Cropped image asset | Nyttig, men kontrollera asset-kontrakt | `fix` |
| Drag/move cards | Canvas | Node x/y | Central | `keep` |
| Pin/unpin | `P`, palette/context | `pinned` | Nyttig | `fix` dirty state |
| Select/multi-select | Click/shift/drag | `selectedNodeIds` | Central | `keep` |
| Drag-select | Canvas | selection | Central for stora ytor | `keep` |
| Copy/paste | `Ctrl+C/V` | clipboard, nodes, sessions | Central | `fix` session/dirty/undo-kontrakt |
| Duplicate selected | `C` | nodes | Nyttig | `fix` dirty state |
| Undo/redo | `Ctrl+Z/Y` | nodes/synapses/selection | Central, men tackar inte sessions/trails | `redesign` |
| Delete session-aware | Delete/Backspace | session cardIds eller nodes | Central | `fix` tydligare anvandarsignal |
| Permanent delete | Ctrl+Delete/Backspace | nodes/synapses/sequences/sessions | Central riskfunktion | `keep` med skydd |
| Context menu | Right-click | node actions | Central | `keep` |

## Navigering, Vy Och Layout

| Funktion | Entry point | Data | Status | Beslut |
| --- | --- | --- | --- | --- |
| Zoom/pan | wheel/drag/Alt-scroll | canvas view | Central | `keep` |
| Fit all | `-` | visible nodes | Central | `keep` |
| Reset zoom | `0` | canvas view | Central | `keep` |
| Minimap | Bottom/right overlay | nodes/view | Mycket viktig for stora canvases | `keep` |
| Zen mode | `Z` | UI state | Bra for fokus | `keep` |
| Themes | Palette/settings | localStorage | Trevligt, ej kritiskt | `keep` |
| Column view | `K` | visible nodes/sort | Viktig lasvy | `keep` |
| Week canvas view | `Alt+L` | dates/events | Lovande men inte karnflode | `defer` tills anvandning verifierats |
| Eternal view | `Alt+E` | dates/events | Lovande men oklar produktroll | `defer` |
| Arrangements vertical/horizontal | `V`, `H` | node positions | Central | `keep` |
| Grid arrangements | `G+V`, `G+H` | node positions | Central | `keep` |
| Kanban/overlapping rows | `G+T` | node positions/tags | Bra men namn och syfte otydligt | `redesign` |
| Centrality layout | `G+C` | synapses | Vardefull for graph | `keep` |
| Stack/circle | `Q` | node positions | Nyttig men terminologi skiljer | `fix` naming |
| Gravity scroll | Ctrl-scroll | graphGravity | Kraftfull ide men nuvarande beteende kan skicka kort sa langt att de tappas bort | `isolate` |

## Organisation Och Sök

| Funktion | Entry point | Data | Status | Beslut |
| --- | --- | --- | --- | --- |
| Sessions/workspaces | Session panel | sessions, activeSessionId | Central | `keep` |
| Main sessions via separate folders | App menu/folder open | separate `data.json` | Bra local-first modell | `keep` |
| Add/remove cards from session | Session panel/context/delete | session cardIds | Central | `fix` dirty state |
| Tag include/exclude filters | Session panel chips | includeTags/excludeTags | Central for navigering | `keep` |
| Outside-session search | Session panel | all nodes/session cardIds | Mycket bra workflow | `keep` |
| Search overlay | `/`, `F` | filtered nodes | Central | `keep` |
| Search field syntax | Search overlay help | content/title/tags/etc. | Kraftfullt | `keep` med docs |
| Semantic search | AI panel | embeddings | Central AI-nytta | `keep` |
| Select today/week/next week | `Alt+D/W/N` | date fields | Nyttig for planering men smal | `defer` |
| Selection Scope Panel | Ctrl+Ö/backquote | graph traversal/synapses | Vardefull relationell funktion | `keep` |

## Import Och Export

| Funktion | Entry point | Data | Status | Beslut |
| --- | --- | --- | --- | --- |
| Image import | drag/drop/import/paste | assets + image nodes | Central | `keep` |
| JSON import | import | legacy nodes/synapses | Viktig backup/migration | `fix` tests/roundtrip |
| PDF import all pages | import/drag | assets + image nodes + pdfId | Central for research | `keep` |
| PDF Zotero preview import | Zotero drag payload | single preview + PDF link | Bra workflow, komplex | `fix` |
| PDF originals backup | import | `assets/originals` | Bra skydd | `keep` |
| Zotero HTML import | drag/import | zotero nodes/tags/pdf links | Central for research | `keep` |
| Zotero plaintext merge | clipboard payload | links/metadata | Vardefull men formatkanslig | `fix` |
| RIS import | RIS/PDF pair | source metadata | Bra for akademiskt arbete | `keep` |
| COinS metadata | HTML payload | source metadata | Smalt men billigt om stabilt | `defer` |
| Obsidian markdown import | `.md` import | cards/synapses/tags | Viktig for kunskapsbas | `keep` |
| AI smart markdown import | import options + Claude | split cards/tags | Lovande men ska vara valfritt | `fix` |
| Mass import text | `M` | many text nodes | Central capture workflow | `keep` |
| Cytoscape SIF/CSV export | Command Palette | nodes/synapses | Bra specialistverktyg | `keep` |
| Full workspace export | Saknas som tydlig funktion | data + assets | Måste finnas fore webbapp | `fix` |

## AI Och Intelligence

| Funktion | Entry point | Data | Status | Beslut |
| --- | --- | --- | --- | --- |
| OCR for image cards | context/keyboard | Gemini + image asset | Central for bild/PDF | `keep` |
| OCR prompt editor/model | Settings/palette | localStorage | Viktigt for kvalitet | `keep` |
| Embeddings | AI panel/palette | OpenAI vectors | Central for semantic search/links | `keep` |
| Auto-link similar nodes | AI panel/palette | embeddings/synapses | Central graphfunktion | `keep` |
| Semantic search | AI panel | query embedding | Central | `keep` |
| Generate practical/hidden tags | AI panel/context | Claude, tags/semanticTags | Central AI-nytta | `keep` |
| Summarize to comment | context | Claude, comment | Nyttig | `keep` |
| Suggest title | context | Claude, title | Nyttig | `keep` |
| Cluster analysis | AI panel | selected nodes | Bra men behöver klar UI-roll | `redesign` |
| Reflection | AI panel/chat | selected/scoped nodes | Visionärt men tonalitet/roll oklar | `redesign` |
| AI chat | `A` | conversations, selected context | Vardefull men stor yta | `fix` |
| AI arrange cards | AI chat local tool | selected nodes + deterministic arrange functions | AI kan trigga layout, men sorterar inte semantiskt av sig sjalv | `fix`/`redesign` |
| Chat tools/actions | AI chat | nodes/layout/selection | Kraftfullt men riskabelt inför webb | `redesign`/`isolate` |
| Conversation history | chat overlay | conversations | Bra om chat behålls | `keep` |
| Save chat as cards | AI chat action | new nodes | Bra capture | `keep` |
| Quote extractor | `E` | Claude + text/PDF notes | Vardefull for research, smal | `defer` eller `keep` om ofta använd |
| Batch status/cancel | AI batch | processing state | Viktigt for trygghet | `keep` |
| Token/payload logging | feature flags | console logs | Bra dev-verktyg, risk for privacy | `fix` default off for webb |

Webbappskrav senare:

- AI-nycklar ska flyttas server-side.
- Provider-klienter i browsern ska ersattas av appens egna AI endpoints.
- AI-funktioner ska kunna misslyckas per kort utan att batchen tappar allt.

## Trails, Wandering Och Kontemplation

| Funktion | Entry point | Data | Status | Beslut |
| --- | --- | --- | --- | --- |
| Wandering mode | `W` | currentNode, gravitatingNodes | Visionärt, men nuvarande version blev aldrig riktigt bra | `isolate` |
| Trail panel | `W`/overlay | trails/waypoints | Lovande ide, men ska inte folja med i v1 | `isolate` |
| Start/save/resume/delete trail | Trail panel | trails | Bra om wandering senare blir produkt | `isolate` |
| Branch trail | Trail panel | parentTrail/branch index | Avancerat och ej kärnflode | `isolate` |
| Backtrack | `[` | active trail | Delvis färdigt, men bundet till isolerat flode | `isolate` |
| Forward trail | `]` | saknas | Dokumenterat men inte implementerat | `remove` från docs eller `fix` |
| Show multiple trails | Trail panel | selectedTrailIds | Avancerat visuellt lager | `isolate` |
| Surface difference/color mode | Trail panel | similarity/themes | Intressant men experimentellt | `isolate` |
| Contemplation ideas | docs | inga runtime-data | Bra produktspår | `keep` som roadmap, ej v1 |

Beslut: Wandering/trails ska inte inga i lokal guldversion eller webb-v1. Koden ar default-off bakom `enableWanderingTrails` och ska inte paverka shortcuts, graph rendering eller vanlig navigation nar flaggan ar av. For att ateruppta sparet kravs en separat design: tydlig anvandarberattelse, trygg undo, positionsskydd och visuell recover-funktion om kort flyttas langt bort.

## Settings, UI Och Dokumentation

| Funktion | Entry point | Data | Status | Beslut |
| --- | --- | --- | --- | --- |
| Settings modal | Palette/menu | API keys, OCR, flags | Central | `keep` |
| Notification system | Top UI | save status/connect | Central | `fix` för error states |
| Guidance overlay | Toggle/help | no persisted data | Bra onboarding | `keep` |
| Command palette | Space | commands | Central | `keep` |
| App menu | Top-left | app actions/theme/import | Central | `keep` |
| Keyboard shortcuts doc | docs | docs only | Central | `fix` mot faktisk implementation |
| QA checklist | docs | docs only | Bra | `keep` |

## Beslut Innan Stabil Lokal V1

1. Kalla v1-kärnan "Capture, Organize, Read, Connect, Reflect" och mappa varje keep-funktion till en av dessa.
2. Isolera experiment: Wandering/trails och gravity ska inte inga i v1. Week/eternal views, cluster/reflection och AI tool-actions ska gommas, markeras eller testas innan de betraktas som produkt.
3. Gör full workspace export/import till en förstaklass säkerhetsfunktion.
4. Sätt server/webbapp-planen på paus tills lokal guldversion har passerat smoke-test.
5. Sluta lägga till nya importformat eller AI-lägen innan import/AI-koden har tydliga adapters.

## Kritiska Fixar Som Blockerar Lokal Guldversion

1. Dirty/autosave-kontrakt för alla sparade mutationer.
2. Synlig save error-handling.
3. Asset manifest/roundtrip.
4. Save/load/export/import regressionstester.
5. Kortkommandon och dokumentation synkade med faktisk implementation.
6. AI-felhantering utan nyckel och vid providerfel.
7. Ta bort eller märk dokumenterat ofärdiga funktioner, särskilt forward trail.
8. Verifiera AI-arrangering manuellt och tekniskt: AI far bara pastas arrangera nar markerade kort faktiskt flyttas av deterministiska arrange-funktioner. Den ska inte beskrivas som semantisk sortering om den inte forst valjer kort och lagger dem enligt ett verifierbart kriterium.
