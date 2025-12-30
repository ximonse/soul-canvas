// components/ModalManager.tsx
// Centraliserad rendering av alla modaler och overlays

import React, { Suspense, lazy } from 'react';
import { type CanvasAPI } from '../hooks/useCanvas';
import { type SearchAPI } from '../hooks/useSearch';
import { type Theme } from '../themes';
import type { ChatProvider, ChatMessage } from '../utils/chatProviders';
import type { Conversation } from '../types/types';
import { type ContextMenuState } from './overlays/ContextMenu';

// Lazy loaded modals
const SettingsModal = lazy(() => import('./overlays/SettingsModal').then(m => ({ default: m.SettingsModal })));
const ContextMenu = lazy(() => import('./overlays/ContextMenu').then(m => ({ default: m.ContextMenu })));
const SearchOverlay = lazy(() => import('./overlays/SearchOverlay').then(m => ({ default: m.SearchOverlay })));
const AIChatOverlay = lazy(() => import('./overlays/AIChatOverlay').then(m => ({ default: m.AIChatOverlay })));
const ReflectionChatOverlay = lazy(() => import('./overlays/ReflectionChatOverlay').then(m => ({ default: m.ReflectionChatOverlay })));
const CardEditor = lazy(() => import('./overlays/CardEditor').then(m => ({ default: m.CardEditor })));
const AIPanel = lazy(() => import('./AIPanel').then(m => ({ default: m.AIPanel })));
const CommandPalette = lazy(() => import('./CommandPalette').then(m => ({ default: m.CommandPalette })));


interface ModalManagerProps {
  // Modal visibility states
  showSettings: boolean;
  showAIPanel: boolean;
  showCommandPalette: boolean;
  showAIChat: boolean;
  isChatMinimized: boolean;
  contextMenu: ContextMenuState | null;
  editingCardId: string | null;
  searchIsOpen: boolean;

  // Search
  search: SearchAPI;
  onSearchConfirm: () => void;

  // Canvas
  canvas: CanvasAPI;

  // Actions
  onRunOCR: (id: string) => void;
  onRunOCROnSelected?: () => void;
  onAutoTag?: (id: string) => void;
  onTagSelected?: () => void;
  onAttractSimilar?: () => void;
  handleManualSave: () => void;
  centerCamera: () => void;
  handleDrop: (e: React.DragEvent) => void;
  onSummarizeToComment?: (id: string) => void;
  onSuggestTitle?: (id: string) => void;
  onResetZoom: () => void;
  onTogglePin: () => void;
  chatMessages: ChatMessage[];
  chatProvider: ChatProvider;
  setChatProvider: (p: ChatProvider) => void;
  openaiChatModel: string;
  setOpenaiChatModel: (model: string) => void;
  geminiChatModel: string;
  setGeminiChatModel: (model: string) => void;
  sendChat: (text: string, provider?: ChatProvider) => Promise<void>;
  isChatSending: boolean;
  chatError?: string | null;
  chatTheme: Theme;
  setIsChatMinimized: (v: boolean) => void;
  isReflectionChat: boolean;
  onDiscussReflection: (reflection: string) => void;
  onSaveChatAsCard?: () => Promise<void>;
  isSavingChat?: boolean;
  // Conversation history
  conversations?: Conversation[];
  currentConversationId?: string | null;
  onLoadConversation?: (id: string) => void;
  onNewConversation?: () => void;
  // Pinned nodes (associativ kontext)
  pinnedNodes?: import('../types/types').MindNode[];
  onRemoveNodeFromContext?: (id: string) => void;
  onAddSelectedToContext?: () => void;
  onClearPinnedNodes?: () => void;
  onAddNodeToContext?: (id: string) => void;

  // Arrangements
  arrangeVertical: () => void;
  arrangeHorizontal: () => void;
  arrangeGridVertical: () => void;
  arrangeGridHorizontal: () => void;
  arrangeCircle: () => void;
  arrangeKanban: () => void;
  arrangeCentrality: () => void;
  onExpandScopeDegree?: (degree: number) => void;

  // Clipboard & state
  copySelectedNodes: () => void;
  undo: () => void;
  redo: () => void;

  // UI state setters
  setShowSettings: (show: boolean) => void;
  setShowAIPanel: (show: boolean) => void;
  setShowCommandPalette: (show: boolean) => void;
  setShowAIChat: (show: boolean) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  setEditingCardId: (id: string | null) => void;
  setThemeIndex: (fn: (i: number) => number) => void;
  setZenMode: (fn: (prev: boolean) => boolean) => void;

  // Helpers
  hasFile: boolean;
  pasteNodes: (x: number, y: number) => void;
  saveStateForUndo: () => void;
  addNode: (content: string, x: number, y: number, type: 'text' | 'image' | 'zotero') => void;
  duplicateSelectedNodes: () => void;
  flipAllImageCardsToText: () => void;
  flipAllImageCardsToImage: () => void;
  fitAllNodes: () => void;
  onOpenMassImport: () => void;
  onOpenQuoteExtractor: () => void;
  onToggleSessionPanel: () => void;
  onToggleWandering: () => void;
  onToggleSynapseLines: () => void;
  onToggleViewMode: () => void;
  onToggleScopePanel: () => void;

  // Theme
  theme: Theme;
}

export const ModalManager: React.FC<ModalManagerProps> = ({
  showSettings,
  showAIPanel,
  showCommandPalette,
  showAIChat,
  isChatMinimized,
  contextMenu,
  editingCardId,
  searchIsOpen,
  search,
  onSearchConfirm,
  canvas,
  onRunOCR,
  onRunOCROnSelected,
  onAutoTag,
  onTagSelected,
  onAttractSimilar,
  handleManualSave,
  centerCamera,
  handleDrop,
  onSummarizeToComment,
  onSuggestTitle,
  onResetZoom,
  onTogglePin,
  chatMessages,
  chatProvider,
  setChatProvider,
  openaiChatModel,
  setOpenaiChatModel,
  geminiChatModel,
  setGeminiChatModel,
  sendChat,
  isChatSending,
  chatError,
  chatTheme,
  isReflectionChat,
  onDiscussReflection,
  onSaveChatAsCard,
  isSavingChat,
  conversations,
  currentConversationId,
  onLoadConversation,
  onNewConversation,
  pinnedNodes,
  onRemoveNodeFromContext,
  onAddSelectedToContext,
  onClearPinnedNodes,
  onAddNodeToContext,
  arrangeVertical,
  arrangeHorizontal,
  arrangeGridVertical,
  arrangeGridHorizontal,
  arrangeCircle,
  arrangeKanban,
  arrangeCentrality,
  onExpandScopeDegree,
  copySelectedNodes,
  undo,
  redo,
  setShowSettings,
  setShowAIPanel,
  setShowCommandPalette,
  setShowAIChat,
  setIsChatMinimized,
  setContextMenu,
  setEditingCardId,
  setThemeIndex,
  setZenMode,
  hasFile,
  pasteNodes,
  saveStateForUndo,
  addNode,
  duplicateSelectedNodes,
  flipAllImageCardsToText,
  flipAllImageCardsToImage,
  fitAllNodes,
  onOpenMassImport,
  onOpenQuoteExtractor,
  onToggleSessionPanel,
  onToggleWandering,
  onToggleSynapseLines,
  onToggleViewMode,
  onToggleScopePanel,
  theme,
}) => {
  return (
    <Suspense fallback={null}>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} theme={theme} />}

      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onRunOCR={onRunOCR}
          onRunOCROnSelected={onRunOCROnSelected}
          onAutoTag={onAutoTag}
          onTagSelected={onTagSelected}
          onAttractSimilar={onAttractSimilar}
          onOpenAIChat={() => setShowAIChat(true)}
          onSummarize={onSummarizeToComment}
          onSuggestTitle={onSuggestTitle}
          onAddToChat={onAddNodeToContext}
        />
      )}

      {showAIPanel && (
        <AIPanel
          theme={theme}
          onClose={() => setShowAIPanel(false)}
          onDiscussReflection={onDiscussReflection}
        />
      )}

      {editingCardId && (
        <CardEditor cardId={editingCardId} onClose={() => setEditingCardId(null)} theme={theme} />
      )}

      {showCommandPalette && (
        <CommandPalette
          onClose={() => setShowCommandPalette(false)}
          onOpenSettings={() => {
            setShowCommandPalette(false);
            setShowSettings(true);
          }}
          onOpenAIPanel={() => {
            setShowCommandPalette(false);
            setShowAIPanel(true);
          }}
          onOpenAIChat={() => {
            setShowCommandPalette(false);
            setShowAIChat(true);
          }}
          onSave={handleManualSave}
          onToggleTheme={() => setThemeIndex((i) => (i + 1) % 4)} // Assumes 4 themes
          onCenterCamera={centerCamera}
          onToggleZen={() => setZenMode((prev) => !prev)}
          onResetZoom={onResetZoom}
          onTogglePin={onTogglePin}
          onArrangeCircle={arrangeCircle}
          onArrangeKanban={arrangeKanban}
          onArrangeVertical={arrangeVertical}
          onArrangeHorizontal={arrangeHorizontal}
          onArrangeGridVertical={arrangeGridVertical}
          onArrangeGridHorizontal={arrangeGridHorizontal}
          onArrangeCentrality={arrangeCentrality}
          onExpandScopeDegree={onExpandScopeDegree}
          onCopy={copySelectedNodes}
          onPaste={() => {
            saveStateForUndo();
            const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            pasteNodes(centerPos.x, centerPos.y);
          }}
          onUndo={undo}
          onRedo={redo}
          onNewCard={() => {
            if (!hasFile) return;
            saveStateForUndo();
            const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            addNode('', centerPos.x, centerPos.y, 'text');
          }}
          onImport={async () => {
            if (!hasFile) return;
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*,.json,.html';
            input.multiple = true;
            input.onchange = async (e) => {
              const files = (e.target as HTMLInputElement).files;
              if (!files) return;
              const fakeEvent = {
                preventDefault: () => { },
                stopPropagation: () => { },
                clientX: window.innerWidth / 2,
                clientY: window.innerHeight / 2,
                dataTransfer: { files: Array.from(files) },
              } as unknown as React.DragEvent;
              await handleDrop(fakeEvent);
            };
            input.click();
          }}
          onMassImport={onOpenMassImport}
          onQuoteExtractor={onOpenQuoteExtractor}
          onFocusSearch={() => {
            const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
              searchInput.select();
            } else {
              search.openSearch();
            }
          }}
          onFitAllNodes={fitAllNodes}
          onToggleSessionPanel={onToggleSessionPanel}
          onToggleWandering={onToggleWandering}
          onDuplicate={duplicateSelectedNodes}
          onFlipToText={flipAllImageCardsToText}
          onFlipToImage={flipAllImageCardsToImage}
          onToggleSynapseLines={onToggleSynapseLines}
          onToggleViewMode={onToggleViewMode}
          onToggleScopePanel={onToggleScopePanel}
          theme={theme}
        />
      )}

      {showAIChat && !isChatMinimized && (
        isReflectionChat ? (
          <ReflectionChatOverlay
            messages={chatMessages}
            provider={chatProvider}
            setProvider={setChatProvider}
            openaiModel={openaiChatModel}
            setOpenaiModel={setOpenaiChatModel}
            geminiModel={geminiChatModel}
            setGeminiModel={setGeminiChatModel}
            onSend={sendChat}
            onClose={() => { setShowAIChat(false); setIsChatMinimized(false); }}
            onMinimize={() => setIsChatMinimized(true)}
            onSaveAsCard={onSaveChatAsCard}
            isSending={isChatSending}
            isSaving={isSavingChat}
          />
        ) : (
          <AIChatOverlay
            messages={chatMessages}
            provider={chatProvider}
            setProvider={setChatProvider}
            openaiModel={openaiChatModel}
            setOpenaiModel={setOpenaiChatModel}
            geminiModel={geminiChatModel}
            setGeminiModel={setGeminiChatModel}
            onSend={sendChat}
            onClose={() => { setShowAIChat(false); setIsChatMinimized(false); }}
            onMinimize={() => setIsChatMinimized(true)}
            onSaveAsCard={onSaveChatAsCard}
            isSending={isChatSending}
            isSaving={isSavingChat}
            error={chatError}
            theme={chatTheme}
            conversations={conversations}
            currentConversationId={currentConversationId}
            onLoadConversation={onLoadConversation}
            onNewConversation={onNewConversation}
            pinnedNodes={pinnedNodes}
            onRemoveNodeFromContext={onRemoveNodeFromContext}
            onAddSelectedToContext={onAddSelectedToContext}
            onClearPinnedNodes={onClearPinnedNodes}
          />
        )
      )}

      {showAIChat && isChatMinimized && (
        <div className="fixed bottom-4 right-4 z-[170] flex items-center gap-2 font-serif">
          <button
            className="px-3 py-2 rounded-lg shadow"
            style={{
              backgroundColor: chatTheme.node.bg,
              color: chatTheme.node.text,
              border: `1px solid ${chatTheme.node.border}`,
            }}
            onClick={() => setIsChatMinimized(false)}
          >
            💬 Återöppna chat
          </button>
          <button
            className="px-3 py-2 rounded-lg shadow"
            style={{
              backgroundColor: chatTheme.node.bg,
              color: chatTheme.node.text,
              border: `1px solid ${chatTheme.node.border}`,
            }}
            onClick={() => { setIsChatMinimized(false); setShowAIChat(false); }}
          >
            ✕
          </button>
        </div>
      )}

      {searchIsOpen && (
        <SearchOverlay
          query={search.query}
          results={search.results}
          onQueryChange={search.setQuery}
          onConfirm={onSearchConfirm}
          onClose={search.closeSearch}
          theme={theme}
        />
      )}
    </Suspense>
  );
};
