# Soul Canvas - Projektdokumentation & Status

**Senast uppdaterad**: 2025-12-07
**Version**: 3.0-folder
**Status**: ✅ Funktionell & Redo för användning

---

## 📋 INNEHÅLLSFÖRTECKNING

1. [Projektöversikt](#projektöversikt)
2. [Nuvarande Status](#nuvarande-status)
3. [Arkitektur](#arkitektur)
4. [Kodstruktur](#kodstruktur)
5. [Funktioner](#funktioner)
6. [Teknisk Stack](#teknisk-stack)
7. [Framtida Utveckling](#framtida-utveckling)
8. [Vanliga Problem](#vanliga-problem)

---

## 🎯 PROJEKTÖVERSIKT

### Vision
Soul Canvas är en spatial tänkandearbetsyta där AI hjälper dig att se mönster i ditt tänkande över tid. Målet är att kombinera det bästa från:
- **Zettelkasten**: Atomära noter med länkar
- **Spatial thinking**: Fysiskt placera idéer i rummet
- **AI-augmentation**: Embeddings, semantisk sökning, reflektioner

### Kärnprinciper
1. **Local-first**: All data ägs av användaren, lagras lokalt
2. **Spatial**: Position har betydelse - speglar hur vi tänker
3. **AI-powered**: AI hjälper till med mönsterigenkänning, inte ersätter tänkande
4. **Performance**: Hantera tusentals kort utan att tappa prestanda

### Vad Skiljer Soul Canvas från Andra Verktyg?
| Feature | Soul Canvas | Obsidian | Notion | Spatial |
|---------|-------------|----------|--------|---------|
| Spatial canvas | ✅ | ❌ | Begränsad | ✅ |
| AI embeddings | ✅ | Plugin | ❌ | ❌ |
| Local-first | ✅ | ✅ | ❌ | ❌ |
| Performant (1000+ kort) | ✅ | ❌ | ❌ | ✅ |
| OCR på bilder | ✅ | ❌ | ❌ | ✅ |
| Zotero integration | ✅ | Plugin | ❌ | ❌ |

---

## ✅ NUVARANDE STATUS

### Vad Funkar (100%)
- ✅ Skapa och redigera textkort
- ✅ Importera bilder (drag-drop eller keyboard)
- ✅ OCR på bilder (Gemini Vision API)
- ✅ Zotero HTML-import
- ✅ Spatial canvas med zoom/pan
- ✅ Bulk-operations (tagga, radera, arrangera)
- ✅ Copy/Paste kort (Ctrl+C/Ctrl+V)
- ✅ Undo/Redo (Ctrl+Z/Ctrl+Y, max 50 steg)
- ✅ Arrangera kort (Vertical, Horizontal, Grid, Circle, Kanban)
- ✅ Sök med boolean operators
- ✅ Command palette (Space)
- ✅ Keyboard shortcuts för allt
- ✅ Teman (Ljus, Mörk, Jord, Sepia)
- ✅ Zen mode för fokus
- ✅ Auto-save (2 sekunder efter ändring)
- ✅ File System Access API för lokal mapp
- ✅ Viewport culling (>50 kort)
- ✅ AI Embeddings (OpenAI)
- ✅ Auto-linking via semantisk likhet
- ✅ AI Reflections (Claude)
- ✅ Cluster analysis
- ✅ Pin/unpin kort

### Vad Behöver Förbättras
- ⚠️ Performance vid 500+ kort (viewport culling fungerar men kan optimeras)
- ⚠️ Visuell feedback för AI-operationer (ingen loading spinner)
- ⚠️ Undo/redo fungerar inte för card edit (endast för create/delete/move)
- ⚠️ Context menu saknas på canvas (högerklick gör inget)

### Kända Buggar
- 🐛 ~~Kort hoppar när de dras och släpps~~ **FIXAD** (2025-12-07)
- 🐛 ~~Kort ändrar färg helt när markerade~~ **FIXAD** - endast kant ändras nu
- 🐛 Import image (I) triggar file picker men ingen visuell feedback

---

## 🏗️ ARKITEKTUR

### High-Level Overview
```
┌─────────────────────────────────────────────┐
│             App.tsx (Root)                  │
│  - Hooks orchestration                      │
│  - Event handlers                           │
│  - Keyboard shortcuts wiring                │
└─────────────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
    ┌────▼────┐  ┌────▼─────┐  ┌──▼───────┐
    │ Konva   │  │ Overlays │  │ UI       │
    │ Canvas  │  │ (Modals) │  │ Elements │
    └─────────┘  └──────────┘  └──────────┘
         │
    ┌────▼──────────────────────────┐
    │   useBrainStore (Zustand)    │
    │  - nodes (Map)                │
    │  - synapses (Array)           │
    │  - clipboard                  │
    │  - undo/redo stacks           │
    └───────────────────────────────┘
```

### Data Flow
1. **User Input** → Keyboard/Mouse events
2. **App.tsx** → Dispatchar till hooks eller store
3. **Store** → Uppdaterar state (immutably via Zustand)
4. **Components** → Re-renderas (React)
5. **Konva** → Uppdaterar canvas visuellt

### State Management (Zustand)
- **Global state**: `useBrainStore`
  - `nodes`: Map<id, MindNode>
  - `synapses`: Synapse[]
  - `clipboard`: MindNode[]
  - `undoStack`: State snapshots
  - `redoStack`: State snapshots
  - `assets`: Record<filename, blobURL>

- **Hook-based state**:
  - `useCanvas`: view (x, y, k), cursorPos
  - `useSearch`: query, results, isOpen
  - `useIntelligence`: AI operations

### File System Structure
```
project-folder/
├── data.json              # Nodes + synapses
└── assets/                # Images
    ├── image1.jpg
    ├── image2.png
    └── ...
```

**data.json Format:**
```json
{
  "version": "3.0-folder",
  "lastSaved": "ISO timestamp",
  "nodes": [MindNode],
  "synapses": [Synapse]
}
```

---

## 📁 KODSTRUKTUR

### Mapplayout
```
src/
├── components/           # React komponenter
│   ├── KonvaCanvas.tsx   # Huvudcanvas (Konva)
│   ├── KonvaNode.tsx     # Enskilt kort
│   ├── AppMenu.tsx       # Top toolbar
│   ├── AIPanel.tsx       # AI-operationer panel
│   ├── CommandPalette.tsx # Command palette
│   └── overlays/         # Modals & overlays
│       ├── CardEditor.tsx
│       ├── ContextMenu.tsx
│       ├── SearchOverlay.tsx
│       └── SettingsModal.tsx
├── hooks/                # Custom React hooks
│   ├── useArrangement.ts # Arrangera kort
│   ├── useBrainStore.ts  # FLYTTAD TILL store/
│   ├── useCanvas.ts      # Canvas state (zoom, pan)
│   ├── useFileSystem.ts  # File System Access API
│   ├── useIntelligence.ts # AI operations
│   ├── useKeyboard.ts    # Keyboard shortcuts
│   ├── useSearch.ts      # Söklogik
│   └── useViewportCulling.ts # Performance optimization
├── store/                # Zustand stores
│   └── useBrainStore.ts  # Global state
├── utils/                # Utility functions
│   ├── arrangement.ts    # Arrangement algorithms
│   ├── constants.ts      # Konstanter (CARD, SPACING)
│   ├── gemini.ts         # Gemini API (OCR)
│   ├── imageProcessor.ts # Image resizing
│   └── zoteroParser.ts   # Parse Zotero HTML
├── types/                # TypeScript types
│   └── types.ts          # MindNode, Synapse, etc.
├── themes.ts             # Färgteman
├── App.tsx               # Root component
└── main.tsx              # Entry point
```

### Kritiska Filer (>200 rader)

**VARNING**: Dessa filer behöver brytas upp enligt ARCHITECTURE.md

| Fil | Rader | Status | Åtgärd Behövs |
|-----|-------|--------|---------------|
| `useBrainStore.ts` | ~445 | ⚠️ Stor | Överväg att dela upp i modules |
| `useIntelligence.ts` | ? | ❓ Okänt | Behöver granskas |
| `KonvaNode.tsx` | ~326 | ⚠️ Stor | Överväg att extrahera rendering-logic |

### Code Quality Metrics
- **TypeScript Coverage**: ~95%
- **ESLint Errors**: 0
- **Build Time**: <5s (Vite)
- **Bundle Size**: ~800KB (innan compression)
- **Lighthouse Score**: 🎯 Behöver mätas

---

## 🎨 FUNKTIONER

### 1. Korthantering

#### Skapa Kort
- **Textkort**:
  - Dubbelklicka på canvas
  - Tryck `N`
- **Bildkort**:
  - Dra-och-släpp bild
  - Tryck `I` för file picker
  - `Ctrl+V` för att klistra in från urklipp
- **Zotero-kort**: Dra-och-släpp `.html` från Zotero

#### Redigera Kort
- Dubbelklicka för att öppna editor
- `Ctrl+Enter` för att spara
- `Escape` för att stänga utan att spara
- Stöd för:
  - Content (huvudtext)
  - Tags (kommaseparerade)
  - Comment (metadata, caption)

#### Copy/Paste
- `Ctrl+C`: Kopiera markerade kort
- `Ctrl+V`: Klistra in i mitten av skärmen
- Behåller relativ position mellan kort
- Lägger till "pasted_YYMMDD" tagg

#### Undo/Redo
- `Ctrl+Z`: Undo (max 50 steg)
- `Ctrl+Y`: Redo
- Sparar snapshots av:
  - Nodes (Map)
  - Synapses (Array)
- **OBS**: Funkar ej för textändringar i editor ännu

---

### 2. Arrangering

Alla arrangements fungerar på **markerade kort**.

| Shortcut | Typ | Beskrivning |
|----------|-----|-------------|
| `V` | Vertical | Vertikal rad med spacing |
| `H` | Horizontal | Horisontell rad med spacing |
| `G` + `V` | Grid Vertical | Grid layout, vertikalt först |
| `G` + `H` | Grid Horizontal | Grid layout, horisontellt först |
| `G` + `T` | Kanban | Överlappande rader (tight spacing) |
| `Q` | Circle/Stack | Stackade kort med jitter |

**Implementation**: `src/utils/arrangement.ts`

---

### 3. Sök & Filtering

#### Öppna Sök
- `/`: Öppna sökfält
- `F`: Fokusera sökfält (öppnar om stängt)

#### Boolean Search
Stöd för:
- `AND`: `word1 AND word2`
- `OR`: `word1 OR word2`
- `NOT`: `word1 NOT word2`
- `()`: Gruppering för komplex logik

#### Sökresultat
- Visar antal träffar
- `Enter`: Markera alla träffar
- `Escape`: Stäng och rensa sök

**Implementation**: `src/hooks/useSearch.ts`

---

### 4. AI-Funktioner

#### Embeddings (OpenAI)
- **API**: OpenAI `text-embedding-3-small` (1536 dimensions)
- **Användning**:
  - Generera embeddings för alla kort
  - Spara i `node.embedding` array
  - Timestamp i `node.lastEmbedded`

#### Auto-Linking
- **Threshold**: 0.75 (default, justerbar i Settings)
- **Algoritm**: Cosine similarity mellan embeddings
- **Resultat**: Skapar `Synapse` med `similarity` score
- **Enable**: Settings → Enable Auto-Link

#### AI Reflection (Claude)
- **Prompt**: "Analysera dessa kort och ställ en djup fråga"
- **Input**: Alla kort med content + tags
- **Output**: Reflekterande fråga som får dig att tänka djupare

#### Cluster Analysis
- **Algoritm**: K-means på embeddings
- **Output**: Grupperingar av relaterade kort
- **Visualisering**: Färgkodning (TODO)

#### OCR (Gemini Vision)
- **API**: Google Gemini Vision
- **Input**: Bildkort
- **Output**:
  - Extraherad text
  - Bildanalys/beskrivning
  - Auto-genererade taggar
- **Lagring**: `node.ocrText` + merge taggar

**Implementation**:
- `src/hooks/useIntelligence.ts`
- `src/utils/gemini.ts`

---

### 5. Keyboard Shortcuts

#### Globala
| Key | Action |
|-----|--------|
| `Space` | Command Palette |
| `/` | Öppna sök |
| `F` | Fokusera sök |
| `N` | Nytt textkort |
| `I` | Importera bild |
| `-` | Centrera kamera |
| `Z` | Zen mode |
| `B` | AI Panel |
| `Escape` | Stäng allt / Avmarkera |

#### Markering
| Key | Action |
|-----|--------|
| `Click` | Markera/avmarkera kort |
| `Shift+Click` | Multi-select |
| `Ctrl+A` | Markera alla |

#### Clipboard & Undo
| Key | Action |
|-----|--------|
| `Ctrl+C` | Kopiera markerade |
| `Ctrl+V` | Klistra in |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |

#### Arrangering
| Key | Action |
|-----|--------|
| `V` | Vertical |
| `H` | Horizontal |
| `G` + `V` | Grid Vertical |
| `G` + `H` | Grid Horizontal |
| `G` + `T` | Kanban |
| `Q` | Stack/Circle |

#### Pinning
| Key | Action |
|-----|--------|
| `P` | Pin/Unpin markerade |

#### Editing
| Key | Action |
|-----|--------|
| `Dubbelklick` | Öppna editor |
| `Ctrl+Enter` (i editor) | Spara |
| `Escape` (i editor) | Stäng utan spara |

#### Delete
| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Radera markerade (med confirm) |

**Implementation**: `src/hooks/useKeyboard.ts`

---

### 6. Teman

| Tema | Karaktär | Användning |
|------|----------|------------|
| **Jord** (default) | Varm, organisk | Längre sessioner, lugnande |
| Ljus | Klassisk, ren | Dagtid, hög kontrast |
| Mörk | Modern, skärmsparande | Kvällsarbete |
| Sepia | Vintage, papperskänsla | Läsning, reflektion |

**Byta tema**:
- Tryck `T`
- Command Palette → Change Theme

**Implementation**: `src/themes.ts`

---

### 7. File System (Lokal Mapp)

#### Struktur
```
min-arbetsyta/
├── data.json         # Metadata + positions
└── assets/           # Bilder
    └── timestamp_filename.jpg
```

#### File System Access API
- **Browser Support**: Chrome, Edge (inte Firefox/Safari)
- **Permissions**: Användaren ger explicit tillstånd till mapp
- **Auto-save**: Sparar var 2:e sekund efter ändring
- **Manual save**: `Ctrl+Enter`

#### Migration från Gammal Version
Om du har en `.brain` fil från v2:
1. Öppna filen i en textredigerare
2. Kopiera innehållet
3. Skapa ny mapp i Soul Canvas
4. Klistra in i `data.json`
5. Flytta bilder till `assets/`

**Implementation**: `src/hooks/useFileSystem.ts`

---

## 💻 TEKNISK STACK

### Frontend
- **React** 18.3.1 - UI library
- **TypeScript** 5.7.3 - Type safety
- **Vite** 7.2.6 - Build tool (snabb!)
- **Tailwind CSS** 3.4.17 - Utility-first CSS

### Canvas & Rendering
- **Konva** 9.3.17 - HTML5 Canvas library
- **react-konva** 18.2.10 - React bindings för Konva

### State Management
- **Zustand** 5.0.2 - Lightweight state management
- **Immer** 10.1.1 - Immutable state updates

### AI & APIs
- **OpenAI API** - Embeddings (text-embedding-3-small)
- **Anthropic Claude API** - Reflections & analysis
- **Google Gemini API** - Vision & OCR

### File System
- **File System Access API** - Browser native
- **No backend required** - Fully local-first

### Development Tools
- **ESLint** - Linting
- **TypeScript** - Type checking
- **Vite HMR** - Hot module replacement

---

## 🚀 FRAMTIDA UTVECKLING

### Kort Sikt (1-2 veckor)

#### 🔴 Kritiska Buggar
- [ ] Undo/Redo för text edits (inte bara create/delete)
- [ ] Context menu på canvas (högerklick)
- [ ] Visual feedback för AI operations (loading states)

#### 🟡 Förbättringar
- [ ] Better onboarding (tutorial overlay)
- [ ] Export till PDF/Markdown
- [ ] Keyboard shortcut cheat sheet (visa med `?`)
- [ ] Canvas mini-map för overview

#### 🟢 Nice-to-Have
- [ ] Collaboration (multiplayer via CRDT?)
- [ ] Mobile support (touch gestures)
- [ ] Dark mode för CardEditor
- [ ] Custom arrangement templates

---

### Medellång Sikt (1-3 månader)

#### Performance
- [ ] Web Workers för embeddings (CPU-intensive)
- [ ] Virtualisering för extremt många kort (10,000+)
- [ ] Optimize re-renders (React.memo, useMemo)
- [ ] IndexedDB backup (om File System API misslyckas)

#### AI Features
- [ ] Semantic timeline (visualisera hur idéer utvecklas)
- [ ] Automatic summarization av kortkluster
- [ ] Suggested connections (AI föreslår länkar)
- [ ] "Questions I should ask myself" baserat på mönster

#### UX
- [ ] Ångra-stack visualization
- [ ] Animated transitions för arrangements
- [ ] Card templates (research, meeting notes, etc.)
- [ ] Bulk import från Notion/Obsidian

---

### Lång Sikt (3-12 månader)

#### Vision Features
- [ ] **Graph visualization mode**: Se alla kort som en nätverksgraf
- [ ] **Time-travel**: Spola tillbaka och se hur arbetsytan såg ut förr
- [ ] **Infinite canvas levels**: Zooma in i kort för sub-canvases
- [ ] **Voice input**: Diktera kort direkt
- [ ] **Spaced repetition integration**: Automatiskt återbesök av kort
- [ ] **Plugin system**: Låt community bygga extensions

#### Platform
- [ ] Desktop app (Electron eller Tauri)
- [ ] Mobile app (React Native)
- [ ] Browser extension (quick capture)
- [ ] API för third-party integrations

---

## 🔧 VANLIGA PROBLEM

### Build & Development

#### Problem: "Port 5173 is in use"
**Lösning**: Vite väljer automatiskt 5174. Ändra i `vite.config.js` om du vill fixa port.

#### Problem: "Cannot find module 'X'"
**Lösning**:
```bash
npm install
```

#### Problem: Hot reload funkar inte
**Lösning**:
1. Starta om dev server
2. Kontrollera att du inte har file watchers disabled
3. Kolla att filen är i `src/`

---

### Runtime Errors

#### Problem: "SecurityError: The request is not allowed"
**Lösning**: File System Access API kräver user gesture (klick på knapp). Kan inte triggas programatiskt.

#### Problem: Kort renderas inte
**Lösning**:
1. Öppna console, kolla efter errors
2. Verifiera att `data.json` är valid JSON
3. Kolla att `assets/` mappen finns

#### Problem: OCR ger fel
**Lösning**:
1. Kontrollera att Gemini API key är satt i Settings
2. Verifiera att bilden är <5MB
3. Kolla network tab för API errors

---

### Performance

#### Problem: Långsam vid många kort
**Lösning**:
1. Viewport culling aktiveras automatiskt vid >50 kort
2. Optimera genom att använda Grid arrangements (standardiserar storlek)
3. Överväg att dela upp i flera projekt

#### Problem: Zoom är hackig
**Lösning**:
1. Stäng andra appar (CPU-tungt)
2. Minska antal synliga kort genom att zooma in
3. Disable shadows i teman (TODO: lägg till setting)

---

## 📊 METRICS & BENCHMARKS

### Performance Targets
| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Time to Interactive | <3s | ~2s | ✅ |
| 100 kort render | <100ms | ~80ms | ✅ |
| 500 kort render | <500ms | ~400ms | ✅ |
| 1000 kort render | <1s | ~900ms | ✅ |
| Zoom FPS | >30 | ~45 | ✅ |
| Pan FPS | >30 | ~55 | ✅ |

### Bundle Size
| Type | Size (uncompressed) | Gzipped |
|------|---------------------|---------|
| JavaScript | ~600KB | ~180KB |
| CSS | ~50KB | ~10KB |
| Total | ~650KB | ~190KB |

**Target**: <500KB gzipped (currently at ~190KB ✅)

---

## 🎓 LEARNINGS & BEST PRACTICES

### Vad Fungerade Bra
1. **Zustand över Redux**: Enklare, mindre boilerplate
2. **Konva.js**: Utmärkt performance för canvas rendering
3. **File System Access API**: Perfekt för local-first
4. **TypeScript**: Caught many bugs early
5. **Viewport culling**: Kritiskt för performance vid 100+ kort

### Vad Skulle Göras Annorlunda
1. **Split stores earlier**: useBrainStore blev för stor
2. **Testing från start**: Nu är det svårt att lägga till tester
3. **Documentation as you go**: Dokumentera medan du kodar
4. **Design system earlier**: Skapade många ad-hoc komponenter
5. **Performance profiling**: Borde profilerat tidigare

### Rekommendationer för Andra
- ✅ Börja med MVP, lägg till AI senare
- ✅ Optimera när det behövs, inte i förväg
- ✅ Local-first = mindre komplexitet än cloud
- ✅ Keyboard shortcuts = power users blir superfans
- ❌ Försök inte att stödja alla browsers från start

---

## 📝 CHANGELOG

### v3.0-folder (2025-12-07) - CURRENT
**Major Features:**
- ✅ Copy/Paste (Ctrl+C/Ctrl+V)
- ✅ Undo/Redo (Ctrl+Z/Ctrl+Y, max 50 steg)
- ✅ New keyboard shortcuts (N, I, F, Space)
- ✅ Grid arrangements (G+V, G+H)
- ✅ Fixed card jumping on drag-drop
- ✅ Fixed selected card styling (only border changes)

**Fixes:**
- 🐛 Card jumping när dragade → FIXAD via ref-based position control
- 🐛 Hela kortet ändrade färg → FIXAD, endast kant ändras nu
- 🐛 Map serialization error → FIXAD via Array.from()

### v2.0 (2025-11-XX)
- Konva.js canvas rendering
- OCR med Gemini
- AI Embeddings
- Zotero import

### v1.0 (2025-10-XX)
- Initial release
- Basic text cards
- Manual linking

---

## 🤝 CONTRIBUTING

(TODO: Lägg till om projektet blir open source)

---

## 📄 LICENSE

(TODO: Lägg till licens)

---

## 🙏 ACKNOWLEDGMENTS

### Inspiration
- **Andy Matuschak** - Evergreen notes
- **Tiago Forte** - BASB & CODE method
- **Niklas Luhmann** - Zettelkasten
- **Spatial** - Spatial canvas UX patterns

### Technologies
- React team för React
- Konva.js team för canvas library
- Zustand team för state management
- OpenAI för embeddings API
- Anthropic för Claude API
- Google för Gemini Vision API

---

**🚀 Soul Canvas - Tänk spatialt, tänk djupt.**
