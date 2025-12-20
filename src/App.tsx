// src/App.tsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type Konva from 'konva';
import { useFileSystem } from './hooks/useFileSystem';
import { useBrainStore } from './store/useBrainStore';
import { useIntelligence } from './hooks/useIntelligence';
import { useCanvas } from './hooks/useCanvas';
import { useSearch } from './hooks/useSearch';
import { useAIChat } from './hooks/useAIChat';
import { useArrangement } from './hooks/useArrangement';
import { useImportHandlers } from './hooks/useImportHandlers';
import { useNodeActions } from './hooks/useNodeActions';
import { useKeyboardHandlers } from './hooks/useKeyboardHandlers';
import { useSelectionScope } from './hooks/useSelectionScope';
import { THEMES } from './themes';
import { AUTOSAVE_DELAY_MS } from './utils/constants';

// Komponenter
import { AppMenu } from './components/AppMenu';
import { BulkActionsToolbar } from './components/BulkActionsToolbar';
import { ModalManager } from './components/ModalManager';
import KonvaCanvas from './components/KonvaCanvas';
import { SelectionScopePanel } from './components/overlays/SelectionScopePanel';
import MassImportOverlay from './components/overlays/MassImportOverlay';
import type { ContextMenuState } from './components/overlays/ContextMenu';

const THEME_KEYS = Object.keys(THEMES);

function App() {
  // Core hooks
  const { openFile, saveFile, saveAsset, hasFile } = useFileSystem();
  const store = useBrainStore();
  const { pendingSave, setPendingSave } = store;
  const intelligence = useIntelligence();
  const aiChat = useAIChat();
  const canvas = useCanvas();
  const stageRef = useRef<Konva.Stage>(null);
  const search = useSearch({ nodes: store.nodes });
  const { arrangeVertical, arrangeHorizontal, arrangeGridHorizontal, arrangeGridVertical, arrangeCircle, arrangeKanban } = useArrangement(canvas.cursorPos);
  const selectionScope = useSelectionScope();

  // UI State
  const [themeIndex, setThemeIndex] = useState(() => {
    const saved = localStorage.getItem('soul-canvas-theme');
    if (saved) {
      const savedIndex = THEME_KEYS.indexOf(saved);
      if (savedIndex !== -1) return savedIndex;
    }
    const paperIndex = THEME_KEYS.indexOf('paper');
    return paperIndex !== -1 ? paperIndex : 0;
  });
  const currentThemeKey = THEME_KEYS[themeIndex];
  const theme = THEMES[currentThemeKey];

  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showAIChat, setShowAIChat] = useState(false);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [showMassImport, setShowMassImport] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'waiting' | 'saving' | 'saved'>('idle');
  const [zenMode, setZenMode] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);

  // Computed
  const selectedNodesCount = useMemo(() =>
    Array.from(store.nodes.values()).filter(n => n.selected).length,
    [store.nodes]
  );

  // Import handlers
  const { handleDrop } = useImportHandlers({ canvas, hasFile, saveAsset });

  // Node actions
  const { centerCamera, fitAllNodes, resetZoom, runOCR, deleteSelected, addBulkTag } = useNodeActions({
    stageRef,
    setShowSettings,
    setContextMenu,
  });

  const handleAutoTag = useCallback(async (id: string) => {
    const selected = Array.from(store.nodes.values()).filter(n => n.selected);
    const targets = selected.length > 0 ? selected : [store.nodes.get(id)].filter(Boolean) as typeof selected;
    if (targets.length === 0) return;
    store.saveStateForUndo();
    for (const node of targets) {
      await intelligence.generateTags(node.id);
    }
  }, [store, intelligence]);

  // Simple callbacks
  const handleManualSave = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTimeout(() => {
      saveFile();
      setPendingSave(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 100);
  }, [saveFile, setPendingSave]);

  const handleSearchConfirm = useCallback(() => {
    const ids = search.confirmSearch();
    store.clearSelection();
    ids.forEach(id => store.toggleSelection(id, true));
  }, [search, store]);

  const handleAddBulkTag = useCallback(() => {
    if (tagInput.trim()) {
      addBulkTag(tagInput);
      setTagInput('');
    }
  }, [tagInput, addBulkTag]);

  // Keyboard shortcuts
  useKeyboardHandlers({
    canvas,
    search,
    hasFile,
    selectedNodesCount,
    centerCamera,
    fitAllNodes,
    resetZoom,
    deleteSelected,
    handleManualSave,
    handleDrop,
    arrangeVertical,
    arrangeHorizontal,
    arrangeGridVertical,
    arrangeGridHorizontal,
    arrangeCircle,
    arrangeKanban,
    setShowCommandPalette,
    setShowAIPanel,
    onOpenAIChat: () => { setShowAIChat(true); setIsChatMinimized(false); },
    onOpenMassImport: () => setShowMassImport(true),
    setZenMode,
    setShowSettings,
    setContextMenu,
    setEditingCardId,
    onToggleScopePanel: selectionScope.toggleVisibility,
  });

  // Auto-save effect
  useEffect(() => {
    if (!hasFile || !pendingSave) return;
    setSaveStatus('waiting');
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      await saveFile();
      setPendingSave(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, AUTOSAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pendingSave, hasFile, saveFile, setPendingSave]);

  // Auto-link effect
  useEffect(() => {
    if (store.enableAutoLink) {
      const nodesWithNewEmbeddings = Array.from(store.nodes.values()).filter(
        n => n.embedding && n.lastEmbedded && new Date(n.lastEmbedded).getTime() > Date.now() - 5000
      );
      if (nodesWithNewEmbeddings.length > 0) intelligence.autoLinkSimilarNodes();
    }
  }, [store.nodes, store.enableAutoLink, intelligence]);

  return (
    <div
      className={`w-screen h-screen overflow-hidden relative font-sans cursor-move transition-colors duration-700 ${theme.bg} ${theme.text}`}
      onDragOver={(e) => { e.preventDefault(); if (hasFile) setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => { setIsDraggingFile(false); handleDrop(e); }}
    >
      <KonvaCanvas
        currentThemeKey={currentThemeKey}
        onEditCard={setEditingCardId}
        canvas={canvas}
        stageRef={stageRef}
        onContextMenu={(nodeId, pos) => setContextMenu({ nodeId, x: pos.x, y: pos.y })}
        onZoomChange={setCurrentZoom}
      />

      {isDraggingFile && hasFile && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-blue-400 border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none">
          <p className="text-3xl font-bold text-white drop-shadow-lg">Släpp filen här!</p>
        </div>
      )}

      <AppMenu
        hasFile={hasFile}
        saveStatus={saveStatus}
        theme={theme}
        themeName={theme.name}
        zenMode={zenMode}
        onConnect={openFile}
        onSave={handleManualSave}
        onToggleTheme={() => setThemeIndex((i) => {
          const newIndex = (i + 1) % THEME_KEYS.length;
          localStorage.setItem('soul-canvas-theme', THEME_KEYS[newIndex]);
          return newIndex;
        })}
        onOpenSettings={() => setShowSettings(true)}
      />

      {zenMode && (
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-gray-500 text-xs opacity-50 pointer-events-none">
          Tryck 'Z' eller 'Esc' för verktyg
        </div>
      )}

      {/* Zoom indicator */}
      <div
        className="absolute bottom-4 left-4 text-xs font-mono pointer-events-none select-none"
        style={{ color: theme.node.text, opacity: 0.4 }}
      >
        {Math.round(currentZoom * 100)}%
      </div>

      <BulkActionsToolbar
        selectedCount={selectedNodesCount}
        tagInput={tagInput}
        onTagInputChange={setTagInput}
        onAddTag={handleAddBulkTag}
        onDelete={deleteSelected}
        onClear={store.clearSelection}
        zenMode={zenMode}
      />

      {/* Selection Scope Panel - vänster sida */}
      {selectionScope.hasConnections && (
        <SelectionScopePanel
          theme={theme}
          isVisible={selectionScope.isVisible}
          baseCount={selectionScope.baseCount}
          currentDegree={selectionScope.currentDegree}
          includeInSelection={selectionScope.includeInSelection}
          degreeCounts={selectionScope.degreeCounts}
          totalWithScope={selectionScope.totalWithScope}
          onExpandToScope={selectionScope.expandToScope}
          onToggleInclude={selectionScope.toggleIncludeInSelection}
          onPreview={selectionScope.setPreviewDegree}
          onClose={selectionScope.close}
        />
      )}

      {/* Mass Import Overlay */}
      {showMassImport && (
        <MassImportOverlay
          theme={theme}
          onClose={() => setShowMassImport(false)}
          centerX={canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2).x}
          centerY={canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2).y}
        />
      )}

      <ModalManager
        showSettings={showSettings}
        showAIPanel={showAIPanel}
        showCommandPalette={showCommandPalette}
        showAIChat={showAIChat}
        contextMenu={contextMenu}
        editingCardId={editingCardId}
        searchIsOpen={search.isOpen}
        search={search}
        onSearchConfirm={handleSearchConfirm}
        canvas={canvas}
        onRunOCR={runOCR}
        onAutoTag={handleAutoTag}
        onAttractSimilar={intelligence.attractSimilarNodes}
        handleManualSave={handleManualSave}
        centerCamera={centerCamera}
        handleDrop={handleDrop}
        chatMessages={aiChat.messages}
        chatProvider={aiChat.provider}
        setChatProvider={aiChat.setProvider}
        sendChat={aiChat.sendMessage}
        isChatSending={aiChat.isSending}
        chatTheme={theme}
        setIsChatMinimized={setIsChatMinimized}
        isChatMinimized={isChatMinimized}
        arrangeVertical={arrangeVertical}
        arrangeHorizontal={arrangeHorizontal}
        arrangeGridVertical={arrangeGridVertical}
        arrangeGridHorizontal={arrangeGridHorizontal}
        arrangeCircle={arrangeCircle}
        arrangeKanban={arrangeKanban}
        copySelectedNodes={store.copySelectedNodes}
        undo={store.undo}
        redo={store.redo}
        setShowSettings={setShowSettings}
        setShowAIPanel={setShowAIPanel}
        setShowCommandPalette={setShowCommandPalette}
        setShowAIChat={setShowAIChat}
        setContextMenu={setContextMenu}
        setEditingCardId={setEditingCardId}
        setThemeIndex={setThemeIndex}
        setZenMode={setZenMode}
        hasFile={hasFile}
        pasteNodes={store.pasteNodes}
        saveStateForUndo={store.saveStateForUndo}
        addNode={store.addNode}
        theme={theme}
      />
    </div>
  );
}

export default App;
