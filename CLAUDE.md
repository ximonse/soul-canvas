# Soul Canvas - Projektinstruktioner för AI-assistenter

Detta dokument gäller för alla AI-assistenter (Claude, Gemini, ChatGPT, etc.) som hjälper till med kodning i detta projekt.

## Slutvision

**En digital canvas för tusentals kort med AI-driven förståelse och organisation.**

## Kärnprinciper

### 1. Skalbarhet
- Måste fungera smidigt med **tusentals kort**
- Viewport culling - rendera bara synliga kort
- Effektiv state-hantering med Zustand
- Undvik O(n²) operationer

### 2. Canvas-baserat (Konva)
- **Allt renderas på canvas** - inga DOM-element per kort
- Ingen HTML-overlay per kort (skalar inte)
- Konva Text, Rect, Group för kortinnehåll
- Sortering efter Y-position för z-ordning

### 3. Snabb navigering
- Kortkommandon för alla vanliga operationer
- Arrangemang: `v` (vertikal), `h` (horisontell), `g+v` (grid vertikal), `g+h` (grid horisontell), `g+t` (kanban), `q` (cirkel)
- Sök, zoom, pan

### 4. AI-integration
AI ska kunna:
- **Läsa** - Förstå kortinnehåll (OCR, textanalys)
- **Förstå** - Hitta samband, teman, kluster mellan kort
- **Arrangera** - Automatiskt gruppera/sortera baserat på innehåll
- **Generera** - Taggar, sammanfattningar, kopplingsförslag

## Utvärdering av nya features

Innan implementation, ställ dessa frågor:

1. **Skalar det till tusentals kort?**
   - Undvik DOM-element per kort
   - Undvik tunga beräkningar per kort vid render

2. **Kan det göras på canvas?**
   - Om inte, finns det ett canvas-kompatibelt alternativ?

3. **Hur kan AI använda/förbättra detta?**
   - Exponera data för AI-analys
   - Gör funktioner triggbara programmatiskt

4. **Passar det arkitekturen?**
   - Zustand för state
   - Konva för rendering
   - Hooks för logik

## Teknisk stack

- **React** - UI-ramverk
- **Konva/react-konva** - Canvas-rendering
- **Zustand** - State management
- **TypeScript** - Typsäkerhet

## Filstruktur

```
src/
  components/     # React/Konva-komponenter
  hooks/          # Custom hooks (useKeyboard, useArrangement, etc.)
  store/          # Zustand store (useBrainStore)
  utils/          # Hjälpfunktioner (arrangement, markdownParser, etc.)
  types/          # TypeScript-typer
  themes/         # Teman
```

## Viktigt för AI-assistenter

- **Fråga inte om allt** - utvärdera själv mot kärnprinciperna
- **Säg ifrån** om ett förslag strider mot visionen
- **Föreslå alternativ** som passar bättre
- Håll filer under 300 rader
- En fil = ett ansvar

---

## Sessionslogg 2025-12-13

### Implementerat idag:

**1. Zotero-import förbättrad**
- Highlight-text → `content` (huvudtext)
- Kommentar efter "(pdf)" → `caption` (synlig under kortet)
- Författare/år → `tags`
- PDF-länk → `comment` (tooltip vid hover)
- Highlight-färg → `accentColor` (färgad stripe på vänster kant)

**2. Auto-taggning via högerklicksmeny**
- Högerklick → "Auto-tagga" knapp
- Claude API genererar två typer av taggar:
  - **Praktiska taggar** → `tags`: typ (lista, reflektion, möte, todo), veckonummer (YYvWW), personnamn, "forskning"/"zotero"
  - **Fördolda taggar** → `semanticTags`: tematiska, kontemplerande insikter ("det undermedvetna")
- Pulserande ljusanimation under taggning (mjukt färgskiftande cirkel)

**3. CardEditor uppdaterad**
- Expanderbar "🌀 Fördolda"-sektion för semanticTags (hopfälld som standard)
- Taggar visas som chips med möjlighet att ta bort

**4. Accentstripe för färgade kort**
- 12px bred färgad stripe på vänster kant
- Följer kortets rundade hörn (clip-funktion)
- Text indragen 8px extra för att ge luft

**5. Claude API uppdaterad**
- Modell ändrad från `claude-3-5-sonnet-20240620` till `claude-sonnet-4-20250514`

### Kvarstående (TODO):
- **Tooltip-positionering**: Ska vara centrerad under kortet med lite omlott, och länken ska vara klickbar. Nuvarande implementation borttagen pga problem med zoom-skalning.

---

## Sessionslogg 2025-12-14

### Implementerat idag:

**1. D+Klick Sekvenskedja**
- Håll `D` och klicka på kort för att kedja ihop dem i ordning
- Orange pilar ritas mellan kort i kedjan (kant-till-kant)
- `V`/`H` arrangemang respekterar sekvensordningen
- `Esc` på markerade kort i sekvens → tar bort dem ur kedjan (kedjan sys ihop)
- Sekvenser är separata från semantiska synapser

**Filer:**
- `src/types/types.ts` - Sequence interface
- `src/store/useBrainStore.ts` - sequences state och actions
- `src/hooks/useKeyboard.ts` - dKeyState tracking
- `src/components/KonvaNode.tsx` - D+klick handling
- `src/components/KonvaCanvas.tsx` - Arrow-rendering (kant-till-kant)
- `src/hooks/useArrangement.ts` - sekvensordning vid V/H
- `src/hooks/useKeyboardHandlers.ts` - Esc tar bort från sekvens

**2. Selection Scope Panel**
- Expandera urval till kopplade kort efter grad (1:a, 2:a, 3:e hand)
- Diskret panel på vänster sida
- Konfigurerbart om scope-valda kort ska inkluderas i "riktigt" urval
- `Ctrl+§` toggle

**Filer:**
- `src/utils/graphTraversal.ts` - BFS-traversering efter grad
- `src/hooks/useSelectionScope.ts` - scope state och logik
- `src/components/overlays/SelectionScopePanel.tsx` - UI-panel

**3. G+Scroll Gravity för markerade kort**
- Om kort är markerade: G+scroll påverkar bara dem och deras direkta grannar
- Utan markering: påverkar alla kort som tidigare
- Använder `synapseVisibilityThreshold` för att filtrera kopplingar

**4. Synapse Visibility Threshold**
- Ny slider i AI-panelen: "Visa kopplingar ≥ X%"
- Filtrera befintliga kopplingar baserat på similarity-värde
- 0% = visa alla (default)
- Påverkar både linjevisning (L) och G+scroll gravity
- Separat från "Nya kopplingar"-tröskeln

**Filer:**
- `src/store/useBrainStore.ts` - synapseVisibilityThreshold state
- `src/components/KonvaCanvas.tsx` - filtrering av synapse-linjer
- `src/components/AIPanel.tsx` - ny slider
- `src/hooks/useKeyboardHandlers.ts` - filtrering i gravity

**5. Zoom-indikator**
- Subtil procentsiffra (ex "25%") i nedre vänstra hörnet
- Monospace font, 40% opacity
- Uppdateras vid scroll-zoom

**6. Fit All (-) och Reset Zoom (0) fixade**
- Synkar nu korrekt med canvas.view
- Min-zoom 10% för att undvika oändligt liten vy

### Erfarenheter och lärdomar:

**Stage vs canvas.view synkronisering:**
- Konva Stage är sin egen källa till sanning under interaktion
- `canvas.view` används för screenToWorld-beräkningar och viewport culling
- Synka INTE canvas.view från useNodeActions - det orsakar "hoppa runt"-buggar
- Stage uppdaterar canvas.view vid dragEnd och wheel events
- Zoom-indikator behöver egen state som uppdateras via callback från KonvaCanvas

**Kortkommandon-process:**
1. Kolla vilka som är upptagna
2. Föreslå kortkommando
3. Koda det som bestäms
- Fråga alltid innan nya kortkommandon skapas!

### Fixade TypeScript-fel:
- `src/hooks/useAIPanelActions.ts` - Property 'length' on tags object → fixat (använd `.practical.length + .hidden.length`)
- `src/hooks/useSearch.ts` - Token type mismatch → fixat (explicit union type)
- `src/utils/chatProviders.ts` - MessageParam role type → fixat (explicit cast + system message extraction)

### Borttagna oanvända filer:
- `src/hooks/useAppShortcuts.ts` - ingen import hittades

### Refaktorerade filer (2025-12-14):
| Fil | Före | Efter | Åtgärd |
|-----|------|-------|--------|
| `KonvaCanvas.tsx` | ~455 | ~284 | Extraherat `SynapseLines`, `SequenceArrows` till `components/canvas/` |
| `KonvaNode.tsx` | ~469 | ~288 | Extraherat `getScopeColor`, `getNodeStyles` till `utils/nodeStyles.ts` |
| `AIPanel.tsx` | ~340 | ~251 | Extraherat `ActionSection`, `KeyWarning`, etc. till `components/ai/` |
| `useIntelligence.ts` | ~356 | ~356 | Kvar som är (sammanhängande ansvar) |
| `useBrainStore.ts` | ~310 | ~310 | Kvar som är (redan har slices) |

### Nya filer skapade:
- `src/components/canvas/SynapseLines.tsx` - Renderar synapse-linjer
- `src/components/canvas/SequenceArrows.tsx` - Renderar sekvenspilar
- `src/components/ai/ActionSection.tsx` - UI-komponenter för AI-panelen
- `src/utils/nodeStyles.ts` - Nodstil-beräkningar
- `src/hooks/useNodeDrag.ts` - Drag-logik (ej använd ännu, förberett)

---

## Sessionslogg 2025-12-15

### Implementerat idag:

**1. Förbättrad PDF-länk-parsing i zoteroParser**
- Stöd för både `zotero://open-pdf` och `file:///` länkar
- Söker nu efter länken med text "pdf" istället för URL-prefix
- Fungerar med olika Zotero-exportformat

**Filer:**
- `src/utils/zoteroParser.ts` - Uppdaterad länk-extraktion (rad 65-72)

**2. Klickbar länk-ikon på kort (🔗)**
- Visas i övre högra hörnet på kort med PDF-länk
- Extraherar URL från markdown-format i `comment`-fältet
- Pointer-cursor vid hover
- Flyttas åt vänster om kortet är pinnat
- Döljs på baksidan (flipped)

**3. file:// → zotero:// konvertering**
- Webbläsare blockerar `file:///` URLs av säkerhetsskäl
- Konverterar automatiskt till `zotero://open-pdf/library/items/{storageId}?page={page}`
- Extraherar storage folder ID från sökvägen (t.ex. `BH6LCAYP`)
- Extraherar sidnummer från `#page=X`

**Filer:**
- `src/components/KonvaNode.tsx` - `extractLinkUrl()` helper + länk-ikon med onClick

**4. Mass-import funktion (`M`)**
- Öppnar overlay med textarea för att klistra in text
- Dubbla radbrytningar (`\n\n`) = nytt kort
- Om sista raden börjar med `#taggar` → blir taggar (visas ej på framsidan)
- Visar live-räknare på antal kort som kommer skapas
- Ctrl+Enter för att importera

**Filer:**
- `src/components/overlays/MassImportOverlay.tsx` - Ny komponent
- `src/hooks/useKeyboard.ts` - `M` kortkommando
- `src/hooks/useKeyboardHandlers.ts` - onMassImport handler
- `src/App.tsx` - State och rendering av overlay

### Erfarenheter och lärdomar:

**Zotero HTML-exportformat:**
- Olika verktyg genererar olika HTML-struktur
- Radbrytningar INUTI `<span class="highlight">` blir `\n` i textContent
- Detta orsakar fel höjdberäkning i arrangement (kort överlappar)
- Lösning: Normalisera whitespace i exportverktyget, eller i parsern

**Zotero storage och item-ID:**
- Storage folder-namnet (t.ex. `BH6LCAYP` i `/Zotero/storage/BH6LCAYP/`) ÄR attachment item-ID
- Kan användas direkt för att bygga `zotero://open-pdf/library/items/{id}?page={page}`
- Detta hack fungerar för att öppna rätt PDF på rätt sida från webbappen

**Webbläsarbegränsningar:**
- `window.open('file:///...')` blockeras av säkerhetsskäl
- `zotero://` protokoll fungerar om Zotero är installerat som protokoll-handler

---

## Nya funktioner (tidigare uppdateringar)

- **AI Chat (manuell provider)**: Chat-overlay med valbar provider (Claude/OpenAI/Gemini), ingen autofallback. Kontext hämtar markerade kort (annars senaste 30, trunkerade). Öppnas via Command Palette (snabbkommando `a`) eller högerklick "Chatta om valda". `Esc` minimerar, krysset stänger. Minimerad chatt kan återöppnas via knapp nere till höger.
- **Tema-följsamt UI**: Command Palette, Settings-modal och AI Chat följer valt tema, använder serif och större text.
- **Högerklicksmeny**: Extra val "Chatta om valda" för att starta chatt med aktuellt urval.
- **Raderingsbekräftelse**: Bekräftelseruta visas bara vid ≥10 markerade kort.

## Nuvarande snabbkommandon (komplett)
| Tangent | Funktion |
|---------|----------|
| `Space` | Command Palette |
| `/` | Sökoverlay |
| `a` | AI Chat |
| `b` | AI Panel (Intelligent Motor) |
| `z` | Zen mode |
| `-` | Fit all (zooma ut så alla kort syns) |
| `0` | Reset zoom till 100% |
| `L` | Toggle synapse-linjer |
| `P` | Pin/unpin kort |
| `S` | Session-panel (öppna/stäng) |
| `N` | Nytt kort |
| `I` | Import (bild/JSON/HTML) |
| `M` | Mass-import (text med dubbla radbrytningar) |
| `F` | Fokus på sök |
| `C` | Duplicera markerade |
| `Delete/Backspace` | Radera (bekräftelse vid ≥10) |
| `Esc` | Stäng/avmarkera/ta bort ur sekvens |
| `Ctrl+Enter` | Spara |
| `Ctrl+C/V` | Kopiera/Klistra kort |
| `Ctrl+Z/Y` | Undo/Redo |
| `Ctrl+A` | Markera alla |
| `Ctrl+§` | Toggle Selection Scope Panel |
| `V` | Arrangera vertikalt (respekterar sekvens) |
| `H` | Arrangera horisontellt (respekterar sekvens) |
| `Q` | Stack/cirkel |
| `G+V` | Grid vertikal |
| `G+H` | Grid horisontell |
| `G+T` | Kanban |
| `G+C` | Centralitet (16:9 rektangel, mest kopplade i mitten) |
| `G+scroll` | Justera graph gravity (markerade eller alla) |
| `D` (håll) + klick | Skapa sekvenskedja |

---

## Sessionslogg 2025-12-21

### Implementerat idag:

**1. Sessions-funktion (arbetsytor)**
- Skapa namngivna sessioner för att gruppera kort
- "Alla kort" som all-inclusive alternativ
- Byta mellan sessioner med dropdown
- Byt namn och ta bort sessioner
- Nya kort läggs automatiskt till i aktiv session
- Högerklick → "Ta bort från session"
- Persistens: sessions sparas med filen

**Filer:**
- `src/types/types.ts` - Session interface
- `src/store/useBrainStore.ts` - sessions state och actions
- `src/components/SessionPanel.tsx` - **NY** huvudkomponent
- `src/hooks/useSessionSearch.ts` - **NY** sök utanför session
- `src/utils/nodeFilters.ts` - filterNodesBySession, filterNodesOutsideSession
- `src/hooks/useFileSystem.ts` - sessions persistens

**2. Granulär taggfiltrering**
- Klicka på tagg för att cykla: neutral → inkludera (+grön) → exkludera (-röd) → neutral
- Visa antal kort per tagg
- Sortera taggar: A-Ö eller efter antal (#)
- Oberoende include/exclude per tagg (inte globalt läge)

**3. Sök utanför session**
- Booleansk sökning (AND/OR/NOT, wildcards, parenteser)
- Söker bland kort som INTE är i aktiv session
- "Lägg till alla" knapp för sökresultat
- Klicka på enskilt kort för att lägga till

**4. SessionPanel UI**
- Inforuta i toppen (alltid synlig): session, markerade, sökterm, taggar, antal kort
- Expanderad panel till vänster (som AIPanel) med `S`-tangent
- Följer aktuellt tema (alla paneler: SessionPanel, AIPanel)

**5. Förbättringar för session-filtrering**
- `Ctrl+A` markerar endast synliga kort (session + taggfilter)
- `-` (fit all) zoomar för synliga kort, inte dolda
- Arrangemang påverkar endast synliga/markerade kort

**Filer ändrade:**
- `src/App.tsx` - session-filtrering pipeline, visibleNodeIds
- `src/hooks/useKeyboardHandlers.ts` - visibleNodeIds för Ctrl+A
- `src/hooks/useNodeActions.ts` - visibleNodes för fitAllNodes
- `src/components/AIPanel.tsx` - theme-stöd
- `src/components/ModalManager.tsx` - theme till AIPanel

**Borttagna filer:**
- `src/components/TagFilterBar.tsx` - ersatt av SessionPanel
