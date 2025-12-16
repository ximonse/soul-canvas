# Refaktoreringsplan: App.tsx (502 rader → max 300 rader)

## Problem
App.tsx är **502 rader** - överstiger gränsen på 300 rader kraftigt.

## Analys av App.tsx

### Nuvarande struktur:
1. **Imports** (1-24) - 24 rader
2. **Helper funktioner** (26-35) - 10 rader
3. **App Component** (37-502) - 465 rader
   - Hooks & state (38-69) - ~30 rader
   - Callbacks (71-242) - ~170 rader
     - handleManualSave
     - centerCamera
     - runOCR
     - deleteSelected
     - handleJSONImport (64 rader!)
     - handleDrop (38 rader!)
     - handleSearchConfirm
   - Effects (244-374) - ~130 rader
     - Paste handler (27 rader)
     - Auto-link (8 rader)
     - Keyboard shortcuts (70 rader!)
     - Autosave (11 rader)
   - addBulkTag helper (382) - 1 rad
   - Rendering/JSX (384-499) - ~115 rader

---

## Uppdelningsplan

### 🎯 Mål: Bryt ut logik i custom hooks och komponenter

### Steg 1: Skapa `hooks/useImportHandlers.ts` (~100 rader)
**Ansvar**: Hantera alla import-operationer (drag-drop, paste, JSON, Zotero, bilder)

**Innehåll**:
- `handleJSONImport` - 64 rader
- `handleDrop` - 38 rader
- Paste event listener logic
- Helper: `dataURLtoBlob` (flytta från App.tsx)

**Export**:
```ts
export function useImportHandlers() {
  return {
    handleDrop,
    handleJSONImport,
    // Paste handler sätts upp via useEffect i hooken
  }
}
```

**Reducering**: ~127 rader från App.tsx

---

### Steg 2: Skapa `hooks/useNodeActions.ts` (~80 rader)
**Ansvar**: Alla åtgärder på noder (radera, OCR, center camera)

**Innehåll**:
- `deleteSelected` - 8 rader
- `runOCR` - 23 rader
- `centerCamera` - 25 rader
- `addBulkTag` - 1 rad

**Export**:
```ts
export function useNodeActions(stageRef: React.RefObject<any>) {
  return {
    deleteSelected,
    runOCR,
    centerCamera,
    addBulkTag,
  }
}
```

**Reducering**: ~57 rader från App.tsx

---

### Steg 3: Skapa `hooks/useKeyboardHandlers.ts` (~120 rader)
**Ansvar**: Samla all keyboard shortcut-logik

**Flytta från**:
- Nuvarande `useKeyboard` hook-anrop med alla callbacks (rad 292-361)

**Ny struktur**:
- Ta emot dependencies (store, canvas, search, arrangements, etc.)
- Bygga upp keyboard handler objekt internt
- Anropa `useKeyboard` med färdiga handlers

**Export**:
```ts
export function useKeyboardHandlers({
  store, canvas, search, arrangements,
  centerCamera, deleteSelected, handleManualSave,
  setShowAIPanel, setZenMode, setShowCommandPalette,
  hasFile, selectedNodesCount
}) {
  // Build all handlers
  // Call useKeyboard internally
}
```

**Reducering**: ~70 rader från App.tsx

---

### Steg 4: Skapa `components/BulkActionsToolbar.tsx` (~50 rader)
**Ansvar**: UI för bulk-operationer på markerade kort

**Innehåll**:
- Allt från rad 409-421 (bulk selection toolbar)
- Props: `selectedCount`, `tagInput`, `onTagChange`, `onAddTag`, `onDelete`, `onClear`

**Reducering**: ~12 rader från App.tsx (ersätts med `<BulkActionsToolbar .../>`)

---

### Steg 5: Skapa `components/ModalManager.tsx` (~80 rader)
**Ansvar**: Rendera alla modaler och overlays

**Innehåll**:
- SettingsModal
- ContextMenu
- AIPanel
- CardEditor
- CommandPalette
- SearchOverlay

**Props**: All state och handlers

**Reducering**: ~80 rader från App.tsx

---

### Steg 6: Förenkla App.tsx
**Efter refactoring ska App.tsx innehålla**:

```tsx
function App() {
  // 1. Core hooks (20 rader)
  const fileSystem = useFileSystem();
  const store = useBrainStore();
  const canvas = useCanvas();
  const stageRef = useRef<any>(null);
  const intelligence = useIntelligence();
  const search = useSearch({ nodes: store.nodes });
  const arrangements = useArrangement(canvas.cursorPos);

  // 2. UI State (15 rader)
  const [themeIndex, setThemeIndex] = useState(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [zenMode, setZenMode] = useState(false);
  // ... modal states

  // 3. Computed (5 rader)
  const selectedNodesCount = useMemo(...);
  const theme = THEMES[currentThemeKey];

  // 4. Custom hooks (15 rader)
  const { handleDrop } = useImportHandlers({ store, canvas, fileSystem });
  const { deleteSelected, runOCR, centerCamera, addBulkTag } = useNodeActions(stageRef);
  useKeyboardHandlers({ store, canvas, search, arrangements, ... });

  // 5. Simple callbacks (20 rader)
  const handleManualSave = useCallback(...);
  const handleSearchConfirm = useCallback(...);

  // 6. Auto-save effect (15 rader)
  useEffect(() => { /* autosave */ }, [store.nodes, store.synapses]);

  // 7. Auto-link effect (10 rader)
  useEffect(() => { /* auto-link */ }, [store.enableAutoLink]);

  // 8. Rendering (100 rader)
  return (
    <div ...>
      <KonvaCanvas ... />
      {isDraggingFile && <DragDropOverlay />}
      <AppMenu ... />
      {zenMode && <ZenModeHint />}
      <BulkActionsToolbar ... />
      <ModalManager ... />
    </div>
  );
}
```

**Totalt**: ~200 rader ✅

---

## Implementationsordning

1. ✅ **Steg 1**: Skapa `hooks/useImportHandlers.ts`
2. ✅ **Steg 2**: Skapa `hooks/useNodeActions.ts`
3. ✅ **Steg 3**: Skapa `hooks/useKeyboardHandlers.ts`
4. ✅ **Steg 4**: Skapa `components/BulkActionsToolbar.tsx`
5. ✅ **Steg 5**: Skapa `components/ModalManager.tsx`
6. ✅ **Steg 6**: Refactorera App.tsx - ersätt med nya hooks/komponenter
7. ✅ **Steg 7**: Testa att allt fungerar
8. ✅ **Steg 8**: Radera gammal kod

---

## Fördelar

✅ **Single Responsibility**: Varje fil har ett tydligt ansvar
✅ **Testbarhet**: Enklare att testa isolerade hooks
✅ **Läsbarhet**: App.tsx blir en översikt, inte implementation
✅ **Återanvändbarhet**: Hooks kan användas i andra komponenter
✅ **Följer arkitekturriktlinjer**: Ingen fil > 300 rader

---

## Risker & Mitigering

⚠️ **Risk**: Bryta befintlig funktionalitet
✅ **Mitigering**: Testa varje steg, bygg/kör efter varje ändring

⚠️ **Risk**: Skapa cirkulära dependencies
✅ **Mitigering**: Hooks får bara bero på store/primitives, inte på varandra

⚠️ **Risk**: För många props mellan komponenter
✅ **Mitigering**: Använd context eller composition där det behövs

---

## Framtida förbättringar (ej i denna refactoring)

- [ ] Bryt ut theme-hantering till `useTheme` hook
- [ ] Centralisera modal state med `useModals` hook
- [ ] Överväg Context API för global state istället för prop drilling
- [ ] Lägg till unit tests för nya hooks

---

**Estimerad tid**: 2-3 timmar
**Radreducering**: 502 → ~200 rader (60% reducering)
