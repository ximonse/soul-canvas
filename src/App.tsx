// src/App.tsx
import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import type { MindNode, Session } from './types/types';
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
import { useSessionSearch } from './hooks/useSessionSearch';
import { useWandering } from './hooks/useWandering';
import { THEMES } from './themes';
import { AUTOSAVE_DELAY_MS } from './utils/constants';

// Komponenter
import { NotificationSystem } from './components/NotificationSystem';
import { ModalManager } from './components/ModalManager';
import KonvaCanvas from './components/KonvaCanvas';
import { ColumnView } from './components/ColumnView';
import { CanvasWeekView } from './components/CanvasWeekView';
import { CanvasEternalView } from './components/CanvasEternalView';
import { MiniMap } from './components/overlays/MiniMap';
import { SessionPanel } from './components/SessionPanel';
import { AIBatchStatus } from './components/overlays/AIBatchStatus';
import type { ContextMenuState } from './components/overlays/ContextMenu';
import { filterNodesByTags, filterNodesBySession } from './utils/nodeFilters';
import { summarizeChatToCard } from './utils/claude';

// Lazy loaded overlays
const GuidanceOverlay = lazy(() => import('./components/overlays/GuidanceOverlay').then(m => ({ default: m.GuidanceOverlay })));
const SelectionScopePanel = lazy(() => import('./components/overlays/SelectionScopePanel').then(m => ({ default: m.SelectionScopePanel })));
const MassImportOverlay = lazy(() => import('./components/overlays/MassImportOverlay'));
const QuoteExtractorOverlay = lazy(() => import('./components/overlays/QuoteExtractorOverlay').then(m => ({ default: m.QuoteExtractorOverlay })));
const TrailPanel = lazy(() => import('./components/overlays/TrailPanel').then(m => ({ default: m.TrailPanel })));

const THEME_KEYS = Object.keys(THEMES);

function App() {
  // Core hooks
  const { openFile, saveFile, saveAsset, saveAIExports, hasFile } = useFileSystem();
  const nodes = useBrainStore((state) => state.nodes);
  const synapses = useBrainStore((state) => state.synapses);
  const sessions = useBrainStore((state) => state.sessions);
  const activeSessionId = useBrainStore((state) => state.activeSessionId);
  const includeTags = useBrainStore((state) => state.includeTags);
  const excludeTags = useBrainStore((state) => state.excludeTags);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const claudeKey = useBrainStore((state) => state.claudeKey);
  const enableAutoLink = useBrainStore((state) => state.enableAutoLink);
  const viewMode = useBrainStore((state) => state.viewMode);
  const canvasWeekView = useBrainStore((state) => state.canvasWeekView);
  const canvasEternalView = useBrainStore((state) => state.canvasEternalView);
  const pendingSave = useBrainStore((state) => state.pendingSave);
  const setPendingSave = useBrainStore((state) => state.setPendingSave);
  const saveStateForUndo = useBrainStore((state) => state.saveStateForUndo);
  const addTagToSelected = useBrainStore((state) => state.addTagToSelected);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const selectNodes = useBrainStore((state) => state.selectNodes);
  const unpinSelected = useBrainStore((state) => state.unpinSelected);
  const pinSelected = useBrainStore((state) => state.pinSelected);
  const toggleSynapseLines = useBrainStore((state) => state.toggleSynapseLines);
  const duplicateSelectedNodes = useBrainStore((state) => state.duplicateSelectedNodes);
  const flipAllImageCardsToText = useBrainStore((state) => state.flipAllImageCardsToText);
  const flipAllImageCardsToImage = useBrainStore((state) => state.flipAllImageCardsToImage);
  const addNodeWithId = useBrainStore((state) => state.addNodeWithId);
  const updateNode = useBrainStore((state) => state.updateNode);
  const addNode = useBrainStore((state) => state.addNode);
  const toggleViewMode = useBrainStore((state) => state.toggleViewMode);
  const createSession = useBrainStore((state) => state.createSession);
  const deleteSession = useBrainStore((state) => state.deleteSession);
  const switchSession = useBrainStore((state) => state.switchSession);
  const renameSession = useBrainStore((state) => state.renameSession);
  const toggleTagFilter = useBrainStore((state) => state.toggleTagFilter);
  const clearTagFilter = useBrainStore((state) => state.clearTagFilter);
  const addCardsToSession = useBrainStore((state) => state.addCardsToSession);
  const copySelectedNodes = useBrainStore((state) => state.copySelectedNodes);
  const undo = useBrainStore((state) => state.undo);
  const redo = useBrainStore((state) => state.redo);
  const pasteNodes = useBrainStore((state) => state.pasteNodes);
  const intelligence = useIntelligence();
  const canvas = useCanvas();
  const stageRef = useRef<Konva.Stage>(null);
  const setSelectedNodeIds = useCallback((ids: Set<string>) => {
    useBrainStore.setState({ selectedNodeIds: ids });
  }, []);
  const {
    arrangeVertical: arrangeVerticalBase,
    arrangeHorizontal: arrangeHorizontalBase,
    arrangeGridHorizontal: arrangeGridHorizontalBase,
    arrangeGridVertical: arrangeGridVerticalBase,
    arrangeCircle: arrangeCircleBase,
    arrangeKanban: arrangeKanbanBase,
    arrangeCentrality: arrangeCentralityBase,
  } = useArrangement(canvas.cursorPos);
  const arrangeFromClipboard = useCallback((arrange: (center?: { x: number; y: number }) => void) => {
    const state = useBrainStore.getState();
    const clipboard = state.clipboard;
    if (clipboard.length === 0) {
      arrange();
      return;
    }

    const selectedIds = state.selectedNodeIds;
    const clipboardIds = new Set(clipboard.map((node) => node.id));
    const selectionMatches = selectedIds.size === 0
      || (selectedIds.size === clipboardIds.size && Array.from(selectedIds).every((id) => clipboardIds.has(id)));

    if (!selectionMatches) {
      arrange();
      return;
    }

    saveStateForUndo();
    const cursorPos = canvas.cursorPos;
    pasteNodes(cursorPos.x, cursorPos.y);
    arrange(cursorPos);
  }, [canvas, pasteNodes, saveStateForUndo]);
  const arrangeVertical = useCallback(() => arrangeFromClipboard(arrangeVerticalBase), [arrangeFromClipboard, arrangeVerticalBase]);
  const arrangeHorizontal = useCallback(() => arrangeFromClipboard(arrangeHorizontalBase), [arrangeFromClipboard, arrangeHorizontalBase]);
  const arrangeGridHorizontal = useCallback(() => arrangeFromClipboard(arrangeGridHorizontalBase), [arrangeFromClipboard, arrangeGridHorizontalBase]);
  const arrangeGridVertical = useCallback(() => arrangeFromClipboard(arrangeGridVerticalBase), [arrangeFromClipboard, arrangeGridVerticalBase]);
  const arrangeCircle = useCallback(() => arrangeFromClipboard(arrangeCircleBase), [arrangeFromClipboard, arrangeCircleBase]);
  const arrangeKanban = useCallback(() => arrangeFromClipboard(arrangeKanbanBase), [arrangeFromClipboard, arrangeKanbanBase]);
  const arrangeCentrality = useCallback(() => arrangeFromClipboard(arrangeCentralityBase), [arrangeFromClipboard, arrangeCentralityBase]);
  const aiChat = useAIChat({
    toolContext: useMemo(() => ({
      nodes,
      selectedNodeIds,
      selectNodes,
      setSelectedNodeIds,
      updateNode,
      addNode: (content: string, x: number, y: number, type: 'text' | 'image' | 'zotero') => {
        const id = crypto.randomUUID();
        addNodeWithId(id, content, x, y, type);
        return id;
      },
      arrangeVertical: arrangeVerticalBase,
      arrangeHorizontal: arrangeHorizontalBase,
      arrangeGridVertical: arrangeGridVerticalBase,
      arrangeGridHorizontal: arrangeGridHorizontalBase,
      arrangeCircle: arrangeCircleBase,
      arrangeKanban: arrangeKanbanBase,
      arrangeCentrality: arrangeCentralityBase,
      centerOnNodes: (ids: string[]) => {
        if (ids.length === 0) return;
        const nodeList = ids.map(id => nodes.get(id)).filter(Boolean) as MindNode[];
        if (nodeList.length === 0) return;
        const avgX = nodeList.reduce((sum, n) => sum + n.x, 0) / nodeList.length;
        const avgY = nodeList.reduce((sum, n) => sum + n.y, 0) / nodeList.length;
        const stage = stageRef.current;
        if (!stage) return;
        const k = stage.scaleX();
        const nextView = {
          x: (window.innerWidth / 2) - avgX * k,
          y: (window.innerHeight / 2) - avgY * k,
          k,
        };
        stage.position({ x: nextView.x, y: nextView.y });
        stage.batchDraw();
        canvas.setView(nextView);
      },
      saveStateForUndo,
    }), [nodes, selectedNodeIds, selectNodes, setSelectedNodeIds, updateNode, addNodeWithId, arrangeVerticalBase, arrangeHorizontalBase, arrangeGridVerticalBase, arrangeGridHorizontalBase, arrangeCircleBase, arrangeKanbanBase, arrangeCentralityBase, saveStateForUndo, canvas]),
  });

  // Session-filtrering: först session, sedan taggar
  const allNodesArray = useMemo(() => Array.from(nodes.values()) as MindNode[], [nodes]);
  const activeSession = useMemo(
    () => activeSessionId ? sessions.find((s: Session) => s.id === activeSessionId) || null : null,
    [activeSessionId, sessions]
  );
  const sessionFilteredNodes = useMemo(
    () => filterNodesBySession(allNodesArray, activeSession),
    [allNodesArray, activeSession]
  );
  const filteredNodesArray = useMemo(() =>
    filterNodesByTags(sessionFilteredNodes, includeTags, excludeTags),
    [sessionFilteredNodes, includeTags, excludeTags]
  );
  const filteredNodesMap = useMemo(
    () => new Map<string, MindNode>(filteredNodesArray.map((n: MindNode) => [n.id, n] as const)),
    [filteredNodesArray]
  );
  const search = useSearch({ nodes: filteredNodesMap });

  // Sök utanför session (för att lägga till kort)
  const sessionSearch = useSessionSearch({ allNodes: allNodesArray, activeSession });
  const selectionScope = useSelectionScope();
  const wandering = useWandering();

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
  const [isReflectionChat, setIsReflectionChat] = useState(false);
  const [showMassImport, setShowMassImport] = useState(false);
  const [showQuoteExtractor, setShowQuoteExtractor] = useState(false);
  const [showSessionPanel, setShowSessionPanel] = useState(false);
  const [showTrailPanel, setShowTrailPanel] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'waiting' | 'saving' | 'saved'>('idle');
  const [zenMode, setZenMode] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(1);
  const [isSavingChat, setIsSavingChat] = useState(false);
  const [showGuidance, setShowGuidance] = useState(false);
  const [hoveredLink, setHoveredLink] = useState<{ name: string; url: string; x: number; y: number } | null>(null);
  const showChrome = !zenMode;

  useEffect(() => {
    setCurrentZoom(canvas.view.k);
  }, [canvas.view.k]);

  // Computed
  const selectedNodesCount = useMemo(() =>
    selectedNodeIds.size,
    [selectedNodeIds]
  );
  const visibleNodeIds = useMemo(() =>
    new Set(filteredNodesArray.map((n: MindNode) => n.id)),
    [filteredNodesArray]
  );
  const firstSelectedNodeId = useMemo(() => {
    const first = selectedNodeIds.values().next();
    return first.done ? null : first.value;
  }, [selectedNodeIds]);

  // Import handlers
  const { handleDrop } = useImportHandlers({ canvas, hasFile, saveAsset });

  // Node actions
  const { centerCamera, fitAllNodes, resetZoom, runOCR, runOCROnSelected, deleteSelected } = useNodeActions({
    stageRef,
    canvas,
    setShowSettings,
    setContextMenu,
    visibleNodes: filteredNodesArray,
  });

  const handleAutoTag = useCallback(async (id: string) => {
    await intelligence.generateTagsForSelection(id);
  }, [intelligence]);

  const handleSummarizeToComment = useCallback((id: string) => {
    intelligence.summarizeToComment(id);
  }, [intelligence]);

  const handleSuggestTitle = useCallback((id: string) => {
    intelligence.suggestTitle(id);
  }, [intelligence]);

  const handleTagSelected = useCallback(() => {
    const tag = window.prompt('Ange tagg att lägga till på markerade kort:');
    if (tag && tag.trim()) {
      saveStateForUndo();
      addTagToSelected(tag.trim());
    }
  }, [addTagToSelected, saveStateForUndo]);

  const centerOnWorldPoint = useCallback((x: number, y: number) => {
    const stage = stageRef.current;
    if (!stage) return;
    const k = stage.scaleX();
    const nextView = {
      x: (window.innerWidth / 2) - x * k,
      y: (window.innerHeight / 2) - y * k,
      k,
    };
    stage.position({ x: nextView.x, y: nextView.y });
    stage.batchDraw();
    canvas.setView(nextView);
  }, [canvas, stageRef]);

  const handleTogglePin = useCallback(() => {
    const selected = Array.from(selectedNodeIds)
      .map(nodeId => nodes.get(nodeId))
      .filter(Boolean) as MindNode[];
    if (selected.length === 0) return;
    if (selected.some((n: MindNode) => n.pinned)) {
      unpinSelected();
    } else {
      pinSelected();
    }
  }, [selectedNodeIds, nodes, pinSelected, unpinSelected]);

  // Simple callbacks
  const handleManualSave = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    setTimeout(() => {
      saveFile();
      saveAIExports();
      setPendingSave(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 100);
  }, [saveFile, saveAIExports, setPendingSave]);

  const handleSearchConfirm = useCallback(() => {
    const ids = search.confirmSearch();
    clearSelection();
    ids.forEach(id => toggleSelection(id, true));
  }, [search, clearSelection, toggleSelection]);

  // Callback för att starta reflektionschat från AIPanel
  const handleDiscussReflection = useCallback((reflection: string) => {
    aiChat.startWithReflection(reflection);
    setIsReflectionChat(true);
    setShowAIChat(true);
    setIsChatMinimized(false);
  }, [aiChat]);

  const handleContextMenu = useCallback((nodeId: string, pos: { x: number; y: number }) => {
    setContextMenu({ nodeId, x: pos.x, y: pos.y });
  }, [setContextMenu]);

  // Callback för att spara chat som kort (ett eller flera beroende på innehåll)
  const handleSaveChatAsCard = useCallback(async () => {
    if (!claudeKey) {
      alert('Claude API-nyckel saknas för att sammanfatta chatten');
      return;
    }

    setIsSavingChat(true);
    try {
      // Sammanfatta chatten (AI bestämmer antal kort)
      const { cards } = await summarizeChatToCard(aiChat.messages, claudeKey);

      if (cards.length === 0) {
        alert('Kunde inte sammanfatta chatten');
        return;
      }

      // Formatera hela chatten som markdown för comment (delas av alla kort)
      const visibleMessages = aiChat.messages.filter(m => m.role !== 'system');
      const chatMarkdown = visibleMessages
        .map(m => `**${m.role === 'user' ? 'Du' : 'AI'}:**\n${m.content}`)
        .join('\n\n---\n\n');

      // Skapa kort i mitten av skärmen, arrangerade horisontellt
      saveStateForUndo();
      const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
      const cardWidth = 280;
      const gap = 40;
      const totalWidth = cards.length * cardWidth + (cards.length - 1) * gap;
      const startX = centerPos.x - totalWidth / 2;

      cards.forEach((card, index) => {
        const nodeId = crypto.randomUUID();
        const x = startX + index * (cardWidth + gap);
        addNodeWithId(nodeId, card.summary, x, centerPos.y, 'text');

        // Lägg till comment och tags
        updateNode(nodeId, {
          comment: cards.length > 1
            ? `[Del ${index + 1} av ${cards.length}]\n\n${chatMarkdown}`
            : chatMarkdown,
          tags: [...card.tags, 'chat'],
          semanticTags: ['chat-sammanfattning'],
        });
      });

    } catch (err) {
      console.error('Failed to save chat as card:', err);
      alert('Fel vid sparande av chat: ' + (err instanceof Error ? err.message : 'Okänt fel'));
    } finally {
      setIsSavingChat(false);
    }
  }, [aiChat.messages, claudeKey, saveStateForUndo, addNodeWithId, updateNode, canvas]);

  // Keyboard shortcuts
  const handleExpandScopeDegree = useCallback((degree: number) => {
    selectionScope.setIsVisible(true);
    selectionScope.expandToScope(degree);
  }, [selectionScope]);

  const handleToggleWandering = useCallback(() => {
    if (wandering.isWandering) {
      wandering.stopWandering();
      setShowTrailPanel(false);
    } else if (firstSelectedNodeId) {
      wandering.startWandering(firstSelectedNodeId);
      setShowTrailPanel(true);
    } else {
      setShowTrailPanel(prev => !prev);
    }
  }, [wandering, firstSelectedNodeId]);

  // Keyboard shortcuts
  useKeyboardHandlers({
    canvas,
    search,
    hasFile,
    selectedNodesCount,
    visibleNodeIds,
    contextMenu,
    editingCardId,
    showCommandPalette,
    showSettings,
    showAIPanel,
    showAIChat,
    isChatMinimized,
    showMassImport,
    showQuoteExtractor,
    showTrailPanel,
    showGuidance,
    isScopePanelOpen: selectionScope.isVisible,
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
    arrangeCentrality,
    setShowCommandPalette,
    setShowAIPanel,
    setShowAIChat,
    setIsChatMinimized,
    onOpenAIChat: () => { setShowAIChat(true); setIsChatMinimized(false); setIsReflectionChat(false); },
    onOpenMassImport: () => setShowMassImport(true),
    onOpenQuoteExtractor: () => setShowQuoteExtractor(true),
    onToggleSessionPanel: () => setShowSessionPanel(prev => !prev),
    isSessionPanelOpen: showSessionPanel,
    onCloseSessionPanel: () => setShowSessionPanel(false),
    onToggleViewMode: toggleViewMode,
    setZenMode,
    setShowSettings,
    setContextMenu,
    setEditingCardId,
    setShowMassImport,
    setShowQuoteExtractor,
    setShowTrailPanel,
    setShowGuidance,
    onToggleScopePanel: selectionScope.toggleVisibility,
    onCloseScopePanel: selectionScope.close,
    onExpandScopeDegree: handleExpandScopeDegree,
    onToggleWandering: handleToggleWandering,
    onBacktrackTrail: wandering.backtrack,
    onForwardTrail: () => { }, // Not implemented yet
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

  // AI Export auto-save (var 30:e minut)
  useEffect(() => {
    if (!hasFile) return;
    const interval = setInterval(() => {
      saveAIExports();
    }, 30 * 60 * 1000); // 30 minuter
    return () => clearInterval(interval);
  }, [hasFile, saveAIExports]);

  // Auto-link effect
  useEffect(() => {
    if (enableAutoLink) {
      const nodesWithNewEmbeddings = (Array.from(nodes.values()) as MindNode[]).filter(
        (n: MindNode) => n.embedding && n.lastEmbedded && new Date(n.lastEmbedded).getTime() > Date.now() - 5000
      );
      if (nodesWithNewEmbeddings.length > 0) intelligence.autoLinkSimilarNodes();
    }
  }, [nodes, enableAutoLink, intelligence]);

  return (
    <div
      className={`w-screen h-screen overflow-hidden relative font-sans cursor-move transition-colors duration-700 ${theme.bg} ${theme.text}`}
      onDragOver={(e) => { e.preventDefault(); if (hasFile) setIsDraggingFile(true); }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={(e) => { setIsDraggingFile(false); handleDrop(e); }}
    >
      {viewMode === 'canvas' ? (
        <>
          <KonvaCanvas
            currentThemeKey={currentThemeKey}
            onEditCard={setEditingCardId}
            canvas={canvas}
            stageRef={stageRef}
            nodes={filteredNodesArray}
            isWandering={wandering.isWandering}
            onWanderStep={wandering.stepTo}
            gravitatingNodes={wandering.gravitatingNodes}
            gravitatingColorMode={wandering.colorMode}
            wanderingCurrentNodeId={wandering.currentNodeId}
            activeTrail={wandering.activeTrail}
            selectedTrails={wandering.selectedTrails}
            showActiveTrailLine={wandering.showActiveTrailLine}
            onContextMenu={handleContextMenu}
            onZoomChange={setCurrentZoom}
            onLinkHover={setHoveredLink}
          />
          {canvasWeekView && !canvasEternalView && (
            <CanvasWeekView
              nodes={filteredNodesArray}
              theme={theme}
              onEditCard={setEditingCardId}
              onContextMenu={handleContextMenu}
            />
          )}
          {canvasEternalView && (
            <CanvasEternalView
              nodes={filteredNodesArray}
              theme={theme}
              onEditCard={setEditingCardId}
              onContextMenu={handleContextMenu}
            />
          )}
        </>
      ) : (
        <ColumnView
          nodes={filteredNodesArray}
          synapses={synapses}
          theme={theme}
          onEditCard={setEditingCardId}
          onContextMenu={handleContextMenu}
        />
      )}

      {/* Link tooltip for Zotero links */}
      {hoveredLink && (
        <div
          className="fixed z-50 px-3 py-1.5 rounded-lg shadow-lg pointer-events-none text-sm"
          style={{
            left: hoveredLink.x + 12,
            top: hoveredLink.y + 12,
            backgroundColor: theme.node.bg,
            color: theme.node.text,
            border: `1px solid ${theme.node.border}`,
          }}
        >
          {hoveredLink.name}
        </div>
      )}

      {showChrome && isDraggingFile && hasFile && (
        <div className="absolute inset-0 z-50 bg-blue-500/20 backdrop-blur-sm border-4 border-blue-400 border-dashed m-4 rounded-3xl flex items-center justify-center pointer-events-none">
          <p className="text-3xl font-bold text-white drop-shadow-lg">Släpp filen här!</p>
        </div>
      )}

      {showChrome && (
        <NotificationSystem
          hasFile={hasFile}
          saveStatus={saveStatus}
          theme={theme}
          zenMode={zenMode}
          onConnect={openFile}
          onSave={handleManualSave}
        />
      )}

      {showChrome && (
        <SessionPanel
          theme={theme}
          themeName={theme.name}
          onToggleTheme={() => setThemeIndex((i) => {
            const newIndex = (i + 1) % THEME_KEYS.length;
            localStorage.setItem('soul-canvas-theme', THEME_KEYS[newIndex]);
            return newIndex;
          })}
          sessions={sessions}
          activeSessionId={activeSessionId}
          onCreateSession={createSession}
          onDeleteSession={deleteSession}
          onSwitchSession={switchSession}
          onRenameSession={renameSession}
          includeTags={includeTags}
          excludeTags={excludeTags}
          onToggleTagFilter={toggleTagFilter}
          onClearTagFilter={clearTagFilter}
          allNodes={allNodesArray}
          outsideSearchQuery={sessionSearch.query}
          outsideSearchResults={sessionSearch.results}
          onOutsideSearchChange={sessionSearch.setQuery}
          onAddCardsToSession={(cardIds) => {
            if (activeSessionId) {
              addCardsToSession(activeSessionId, cardIds);
            }
          }}
          selectedCount={selectedNodesCount}
          sessionCardCount={activeSession?.cardIds.length ?? 0}
          visibleCardCount={filteredNodesArray.length}
          totalCardCount={allNodesArray.length}
          searchQuery={search.query}
          isExpanded={showSessionPanel}
          onToggleExpanded={() => setShowSessionPanel(prev => !prev)}
          onToggleGuidance={() => setShowGuidance(prev => !prev)}
          showGuidance={showGuidance}
        />
      )}

      {/* Zoom indicator */}
      {showChrome && (
        <div
          className="absolute bottom-4 left-4 text-xs font-mono pointer-events-none select-none"
          style={{ color: theme.node.text, opacity: 0.4 }}
        >
          {Math.round(currentZoom * 100)}%
        </div>
      )}



      <Suspense fallback={null}>
        {showChrome && intelligence.batch && (
          <AIBatchStatus
            theme={theme}
            batch={intelligence.batch}
            onCancel={intelligence.cancelBatch}
            onClear={intelligence.clearBatch}
          />
        )}

        {showChrome && viewMode === 'canvas' && (
          <MiniMap
            nodes={filteredNodesArray}
            selectedNodeIds={selectedNodeIds}
            view={canvas.view}
            theme={theme}
            onCenterPoint={centerOnWorldPoint}
          />
        )}

        {/* Selection Scope Panel - vänster sida */}
        {showChrome && selectionScope.hasConnections && (
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

        {/* Trail Panel - vandring */}
        {showChrome && (
          <TrailPanel
            theme={theme}
            isOpen={showTrailPanel}
            onClose={() => setShowTrailPanel(false)}
            isWandering={wandering.isWandering}
            currentNodeId={wandering.currentNodeId}
            gravitatingNodes={wandering.gravitatingNodes}
            visitedNodeIds={wandering.visitedNodeIds}
            activeTrail={wandering.activeTrail}
            trailHistory={wandering.trailHistory}
            minSimilarityThreshold={wandering.minSimilarityThreshold}
            showOnlyDifferentWords={wandering.showOnlyDifferentWords}
            colorMode={wandering.colorMode}
            onStartWandering={wandering.startWandering}
            onStartNewTrail={wandering.startNewTrail}
            onStopWandering={wandering.stopWandering}
            onStepTo={wandering.stepTo}
            onBacktrack={wandering.backtrack}
            onRemoveWaypoint={wandering.removeWaypointFromTrail}
            onMoveWaypoint={wandering.moveWaypointInTrail}
            onSaveTrail={wandering.saveCurrentTrail}
            onBranchHere={wandering.branchHere}
            onResumeTrail={wandering.resumeTrail}
            onDeleteTrail={wandering.deleteTrail}
            onSetThreshold={wandering.setThreshold}
            onToggleSurfaceDifference={wandering.toggleSurfaceDifference}
            onSetColorMode={wandering.setColorMode}
            selectedTrailIds={wandering.selectedTrailIds}
            onSelectTrailNodes={wandering.selectTrailNodes}
            onToggleTrailSelection={wandering.toggleTrailSelection}
            onClearTrailSelection={wandering.clearTrailSelection}
            onSetSelectedTrailIds={wandering.setSelectedTrailIds}
            showActiveTrailLine={wandering.showActiveTrailLine}
            onSetShowActiveTrailLine={wandering.setShowActiveTrailLine}
            getNode={(id) => nodes.get(id)}
            selectedNodeId={firstSelectedNodeId}
          />
        )}

        {/* Mass Import Overlay */}
        {showChrome && showMassImport && (
          <MassImportOverlay
            theme={theme}
            onClose={() => setShowMassImport(false)}
            centerX={canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2).x}
            centerY={canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2).y}
          />
        )}

        {/* Quote Extractor Overlay */}
        {showChrome && showQuoteExtractor && (
          <QuoteExtractorOverlay
            theme={theme}
            onClose={() => setShowQuoteExtractor(false)}
            centerX={canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2).x}
            centerY={canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2).y}
          />
        )}

        {showGuidance && (
          <GuidanceOverlay
            theme={theme}
            viewMode={viewMode}
            isWandering={wandering.isWandering}
            selectionCount={selectedNodesCount}
            showSessionPanel={showSessionPanel}
            showAIChat={showAIChat}
            onClose={() => setShowGuidance(false)}
          />
        )}
      </Suspense>

      {showChrome && (
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
          onRunOCROnSelected={runOCROnSelected}
          onAutoTag={handleAutoTag}
          onTagSelected={handleTagSelected}
          onAttractSimilar={intelligence.attractSimilarNodes}
          onSummarizeToComment={handleSummarizeToComment}
          onSuggestTitle={handleSuggestTitle}
          onResetZoom={resetZoom}
          onTogglePin={handleTogglePin}
          handleManualSave={handleManualSave}
          centerCamera={centerCamera}
          handleDrop={handleDrop}
          chatMessages={aiChat.messages}
          chatProvider={aiChat.provider}
          setChatProvider={aiChat.setProvider}
          openaiChatModel={aiChat.openaiModel}
          setOpenaiChatModel={aiChat.setOpenaiModel}
          geminiChatModel={aiChat.geminiModel}
          setGeminiChatModel={aiChat.setGeminiModel}
          sendChat={aiChat.sendMessage}
          isChatSending={aiChat.isSending}
          chatError={aiChat.error}
          chatTheme={theme}
          setIsChatMinimized={setIsChatMinimized}
          isReflectionChat={isReflectionChat}
          onDiscussReflection={handleDiscussReflection}
          onSaveChatAsCard={handleSaveChatAsCard}
          isSavingChat={isSavingChat}
          isChatMinimized={isChatMinimized}
          conversations={aiChat.listConversations}
          currentConversationId={aiChat.conversationId}
          onLoadConversation={aiChat.loadConversation}
          onNewConversation={aiChat.clearMessages}
          pinnedNodes={aiChat.pinnedNodes}
          onRemoveNodeFromContext={aiChat.removeNodeFromContext}
          onAddSelectedToContext={aiChat.addSelectedNodesToContext}
          onClearPinnedNodes={aiChat.clearPinnedNodes}
          onAddNodeToContext={aiChat.addNodeToContext}
          arrangeVertical={arrangeVertical}
          arrangeHorizontal={arrangeHorizontal}
          arrangeGridVertical={arrangeGridVertical}
          arrangeGridHorizontal={arrangeGridHorizontal}
          arrangeCircle={arrangeCircle}
          arrangeKanban={arrangeKanban}
          arrangeCentrality={arrangeCentrality}
          onExpandScopeDegree={handleExpandScopeDegree}
          copySelectedNodes={copySelectedNodes}
          undo={undo}
          redo={redo}
          setShowSettings={setShowSettings}
          setShowAIPanel={setShowAIPanel}
          setShowCommandPalette={setShowCommandPalette}
          setShowAIChat={setShowAIChat}
          setContextMenu={setContextMenu}
          setEditingCardId={setEditingCardId}
          setThemeIndex={setThemeIndex}
          setZenMode={setZenMode}
          hasFile={hasFile}
          pasteNodes={pasteNodes}
          saveStateForUndo={saveStateForUndo}
          addNode={addNode}
          duplicateSelectedNodes={duplicateSelectedNodes}
          flipAllImageCardsToText={flipAllImageCardsToText}
          flipAllImageCardsToImage={flipAllImageCardsToImage}
          fitAllNodes={fitAllNodes}
          onOpenMassImport={() => setShowMassImport(true)}
          onOpenQuoteExtractor={() => setShowQuoteExtractor(true)}
          onToggleSessionPanel={() => setShowSessionPanel(prev => !prev)}
          onToggleWandering={handleToggleWandering}
          onToggleSynapseLines={toggleSynapseLines}
          onToggleViewMode={toggleViewMode}
          onToggleScopePanel={selectionScope.toggleVisibility}
          theme={theme}
          onQuoteExtractor={() => setShowQuoteExtractor(true)}
          onMassImport={() => setShowMassImport(true)}
          onFocusSearch={() => search.setIsOpen(true)}
        />
      )}
    </div>
  );
}

export default App;

