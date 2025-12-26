# Zotero Integration - Status 2025-12-26

## Branch
`feature/zotero-integration` (forked from main)

## Backend Status - ✅ KLAR (PHASE 1)

### Filer skapade (committade):
```
backend/
├── package.json          # Dependencies: express, ws, @modelcontextprotocol/sdk
├── tsconfig.json         # TypeScript config
├── .env.example          # Template för miljövariabler
├── .env                  # Lokal config (gitignored)
├── .gitignore            # node_modules, dist, .env
├── README.md             # Setup-instruktioner
└── src/
    ├── types.ts          # TypeScript types för WS messages
    ├── cache.ts          # In-memory cache med TTL (5 min)
    ├── mcpClient.ts      # MCP stdio client till zotero-mcp-server
    ├── messageRouter.ts  # Router för search, annotations, fullText
    └── server.ts         # WebSocket + Express server (port 3001)
```

### Backend körs:
```bash
cd backend
npm run dev
# Servern är uppe på http://localhost:3001
# Health check: curl http://localhost:3001/health
```

### Test:
- ✅ WebSocket server fungerar
- ✅ MCP connection till zotero-mcp-server OK
- ✅ Health endpoint svarar: `{"status":"ok","mcp":{"connected":true}}`

### Tekniska detaljer:
- **Port:** 3001
- **Zotero data:** `C:\Users\ximon\Zotero\storage`
- **MCP server:** Installerad globalt (`npm install -g zotero-mcp`)
- **Windows fix:** Använder `node` + full path till `zotero-mcp/build/index.js`

### Commit:
```
1a4b148 - feat: add Zotero MCP backend bridge (PHASE 1)
```

---

## Frontend Status - ⏳ PÅGÅENDE (PHASE 2)

### Filer skapade (ej committade än):
```
src/
├── types/
│   └── zotero.ts                    # ✅ ZoteroItem, ZoteroAnnotation, etc.
├── store/slices/
│   └── zoteroSlice.ts               # ✅ Zustand state för Zotero
└── utils/
    └── zoteroClient.ts              # ✅ WebSocket client wrapper
```

### Filer kvar att skapa:
```
src/
├── hooks/
│   ├── useZotero.ts                 # ⏳ Hook för WS connection (~220 lines)
│   └── useZoteroImport.ts           # ⏳ Import logic (PHASE 3)
├── components/
│   └── ZoteroPanel.tsx              # ⏳ Main UI panel (~280 lines)
└── utils/
    └── zoteroFormatter.ts           # ⏳ Format data → cards (PHASE 3)
```

### Filer att modifiera:
```
src/
├── App.tsx                          # ⏳ Add panel state, rendering, keyboard
├── hooks/useKeyboardHandlers.ts     # ⏳ Add 'Z' shortcut
└── store/useBrainStore.ts           # ⏳ Import zoteroSlice
```

---

## Nästa steg (när du fortsätter):

### 1. Skapa useZotero hook
```typescript
// src/hooks/useZotero.ts
// - Initialiserar ZoteroClient
// - Hanterar connection/reconnect
// - Wrapper-funktioner: search(), getAnnotations(), etc.
// - Uppdaterar Zustand state
```

### 2. Skapa ZoteroPanel komponent
```typescript
// src/components/ZoteroPanel.tsx
// - Expanderbar panel på VÄNSTER sida (user preference)
// - Tabs: Search, Library, Annotations, Settings
// - Search med debounce (300ms)
// - Toggle för full-text search
// - Results list med titel, författare, år
// - "Import highlights" button
// - Connection status indicator
```

### 3. Integrera i App.tsx
```typescript
// src/App.tsx
const [showZoteroPanel, setShowZoteroPanel] = useState(false);

// Render:
{showZoteroPanel && <ZoteroPanel onClose={() => setShowZoteroPanel(false)} />}
```

### 4. Lägg till kortkommando
```typescript
// src/hooks/useKeyboardHandlers.ts
// 'Z' → toggle ZoteroPanel
```

### 5. Uppdatera useBrainStore
```typescript
// src/store/useBrainStore.ts
import { createZoteroSlice } from './slices/zoteroSlice';
// Lägg till i store
```

### 6. Testa
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
npm start

# Browser: http://localhost:3000
# Tryck Z → ZoteroPanel ska öppnas
# Sök något → ska få resultat från Zotero
```

---

## PHASE 3-6 (Framtida)

### PHASE 3: Import Highlights (1 dag)
- useZoteroImport.ts
- zoteroFormatter.ts
- Button i ZoteroPanel för att importera highlights
- Skapar kort med content, tags, accentColor

### PHASE 4: Full-Text Search (1 dag)
- Toggle i ZoteroPanel
- Visa context snippets
- Highlight query terms

### PHASE 5: Högerklicksmeny (1 dag)
- "Find in Zotero" i ContextMenu
- "Link to Zotero item"
- Spara zoteroItemKey i MindNode

### PHASE 6: AI Chat Tool-Use (2 dagar)
- Modifiera chatProviders.ts för tools
- zoteroTools.ts med tool definitions
- AI kan söka Zotero automatiskt

---

## Konfiguration (user preferences från frågor):

- **Zotero version:** 7
- **OS:** Windows
- **Zotero data:** `C:\Users\ximon\Zotero\storage`
- **Backend port:** 3001
- **Panel position:** VÄNSTER sida (SessionPanel kan tryckas undan)
- **Import behavior:** Importerade kort → aktiv session
- **AI provider:** (ej specificerat ännu)

---

## Kommandon för att fortsätta:

```bash
# Starta backend (om inte redan igång)
cd backend && npm run dev

# Starta frontend (ny terminal)
npm start

# Kolla git status
git status

# När PHASE 2 är klar, committa:
git add src/
git commit -m "feat: add ZoteroPanel frontend (PHASE 2)"
```

---

## Viktiga anteckningar:

### Windows-specifika fixes:
- MCP server körs via: `node C:\Users\ximon\AppData\Roaming\npm\node_modules\zotero-mcp\build\index.js`
- Inte via `npx zotero-mcp` (ENOENT-fel)
- Använd `crypto.randomUUID()` istället för uuid-package

### Panel design:
- Följ SessionPanel-mönster
- 400px bred när expanderad
- Inforuta när collapsed
- Tema-följsamt UI (isDarkTheme check)

### State management:
- Zustand slice: zoteroSlice.ts
- Connection status: disconnected | connecting | connected | error
- Search state: query, results, isSearching, fullTextSearch
- Selected item: key, details, annotations

---

## Debug-info:

Backend-servern loggar till:
```
C:\Users\ximon\AppData\Local\Temp\claude\c--Users-ximon-Kodprojekt-soul-canvas\tasks\bc4465c.output
```

Health check response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-26T10:52:38.992Z",
  "mcp": {
    "connected": true,
    "reconnectAttempts": 0
  },
  "cache": {
    "size": 0,
    "keys": []
  },
  "clients": 0
}
```

---

**Senast uppdaterad:** 2025-12-26 12:00 (efter PHASE 1 klar)
**Nästa:** Skapa useZotero hook och ZoteroPanel
