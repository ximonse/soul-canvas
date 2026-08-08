// src/components/CommandPalette.tsx
import { useState, useEffect, useRef } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { useIntelligence } from '../hooks/useIntelligence';
import { exportToCytoscape, exportToCSV } from '../utils/cytoscapeExport';
import type { Theme } from '../themes';
import type { MindNode } from '../types/types';

interface Command {
  id: string;
  name: string;
  description: string;
  shortcut: string;
  action: () => void | Promise<void>;
  category: 'ai' | 'view' | 'edit' | 'file';
}

interface CommandPaletteProps {
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenAIPanel: () => void;
  onOpenAIChat: () => void;
  onOpenOcrPrompt: () => void;
  onSave: () => void;
  onToggleTheme: () => void;
  onCenterCamera: () => void;
  onToggleZen: () => void;
  onResetZoom: () => void;
  onTogglePin: () => void;
  onArrangeCircle: () => void;
  onArrangeKanban: () => void;
  onArrangeVertical: () => void;
  onArrangeHorizontal: () => void;
  onArrangeGridVertical: () => void;
  onArrangeGridHorizontal: () => void;
  onArrangeCentrality: () => void;
  onExpandScopeDegree?: (degree: number) => void;
  onCopy: () => void;
  onPaste: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onNewCard: () => void;
  onImport: () => void;
  onMassImport: () => void;
  onQuoteExtractor: () => void;
  onFocusSearch: () => void;
  onFitAllNodes: () => void;
  onToggleSessionPanel: () => void;
  onToggleWandering: () => void;
  enableWanderingTrails?: boolean;
  onDuplicate: () => void;
  onFlipToText: () => void;
  onFlipToImage: () => void;
  onToggleSynapseLines: () => void;
  onToggleViewMode: () => void;
  onToggleScopePanel: () => void;
  theme: Theme;
}

export const CommandPalette = ({
  onClose,
  onOpenSettings,
  onOpenAIPanel,
  onOpenAIChat,
  onOpenOcrPrompt,
  onSave,
  onToggleTheme,
  onCenterCamera,
  onToggleZen,
  onResetZoom,
  onFitAllNodes,
  onTogglePin,
  onArrangeCircle,
  onArrangeKanban,
  onArrangeVertical,
  onArrangeHorizontal,
  onArrangeGridVertical,
  onArrangeGridHorizontal,
  onArrangeCentrality,
  onExpandScopeDegree,
  onCopy,
  onPaste,
  onUndo,
  onRedo,
  onNewCard,
  onImport,
  onMassImport,
  onQuoteExtractor,
  onFocusSearch,
  onToggleSessionPanel,
  onToggleWandering,
  enableWanderingTrails = false,
  onDuplicate,
  onFlipToText,
  onFlipToImage,
  onToggleSynapseLines,
  onToggleViewMode,
  onToggleScopePanel,
  theme,
}: CommandPaletteProps) => {
  const nodes = useBrainStore((state) => state.nodes);
  const synapses = useBrainStore((state) => state.synapses);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const enableAutoLink = useBrainStore((state) => state.enableAutoLink);
  const selectAll = useBrainStore((state) => state.selectAll);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const intelligence = useIntelligence();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleToggleEternalView = () => {
    const state = useBrainStore.getState();
    const nextEnabled = state.viewMode !== 'canvas' || !state.canvasEternalView;
    state.setViewMode('canvas');
    state.setCanvasWeekView(false);
    state.setCanvasEternalView(nextEnabled);
    onClose();
  };

  const scopeCommands: Command[] = onExpandScopeDegree
    ? [1, 2, 3, 4, 5, 6].map((degree) => ({
      id: `scope-${degree}`,
      name: `Scope +${degree}`,
      description: `Expands the selection scope by ${degree} connection degree${degree > 1 ? 's' : ''}.`,
      shortcut: '',
      action: () => { onExpandScopeDegree(degree); onClose(); },
      category: 'view',
    }))
    : [];

  const wanderingCommands: Command[] = enableWanderingTrails
    ? [
      { id: 'wandering', name: 'Toggle Wandering Mode', description: 'Toggles autonomous wandering through linked cards.', shortcut: 'w', action: () => { onToggleWandering(); onClose(); }, category: 'view' },
    ]
    : [];

  const commands: Command[] = [
    // AI Commands
    { id: 'ai-panel', name: 'Open AI Panel', description: 'Opens the AI panel for embeddings, tagging, and reflection tools.', shortcut: 'b', action: () => { onOpenAIPanel(); onClose(); }, category: 'ai' },
    { id: 'ai-chat', name: 'AI Chat (manual provider)', description: 'Starts a manual AI chat session using your chosen provider.', shortcut: 'a', action: () => { onOpenAIChat(); onClose(); }, category: 'ai' },
    { id: 'quote-extractor', name: 'AI Quote Extractor', description: 'Extracts quotable passages from selected notes using AI.', shortcut: 'e', action: () => { onQuoteExtractor(); onClose(); }, category: 'ai' },
    { id: 'ocr-prompt', name: 'Edit OCR Prompt', description: 'Edits the prompt used for OCR text extraction from images.', shortcut: 'ocr', action: () => { onOpenOcrPrompt(); onClose(); }, category: 'ai' },
    { id: 'embed', name: 'Generate Embeddings', description: 'Generates AI embeddings for all cards to enable similarity search.', shortcut: 'emb', action: async () => { await intelligence.embedAllNodes(); onClose(); }, category: 'ai' },
    ...(enableAutoLink ? [{ id: 'link', name: 'Auto-Link Similar', description: 'Automatically creates links between semantically similar cards.', shortcut: 'link', action: async () => { await intelligence.autoLinkSimilarNodes(); onClose(); }, category: 'ai' as const }] : []),
    { id: 'reflect', name: 'AI Reflection', description: 'Runs an AI reflection pass over your notes to surface insights.', shortcut: 'ref', action: async () => { await intelligence.reflect(); onClose(); }, category: 'ai' },
    { id: 'tags', name: 'Generate Tags', description: 'Generates AI tags for the selected cards.', shortcut: 'tag', action: async () => { await intelligence.generateTagsForSelection(); onClose(); }, category: 'ai' },

    // View Commands
    { id: 'canvas-eternal', name: 'Eternal Canvas View', description: 'Switches to a continuous, session-independent canvas view.', shortcut: 'alt+e', action: () => { handleToggleEternalView(); }, category: 'view' },
    { id: 'center', name: 'Center Camera (0,0)', description: 'Moves the camera back to the canvas origin.', shortcut: '', action: () => { onCenterCamera(); onClose(); }, category: 'view' },
    { id: 'fit-all', name: 'Fit All Nodes', description: 'Zooms and pans to fit every card on screen.', shortcut: '-', action: () => { onFitAllNodes(); onClose(); }, category: 'view' },
    { id: 'zen', name: 'Toggle Zen Mode', description: 'Hides UI chrome for a distraction-free view.', shortcut: 'z', action: () => { onToggleZen(); onClose(); }, category: 'view' },
    { id: 'theme', name: 'Change Theme', description: 'Cycles to the next visual theme.', shortcut: 'theme', action: () => { onToggleTheme(); onClose(); }, category: 'view' },
    { id: 'reset-zoom', name: 'Reset Zoom', description: 'Resets the zoom level to 100%.', shortcut: '0', action: () => { onResetZoom(); onClose(); }, category: 'view' },
    { id: 'view-mode', name: 'Toggle View Mode (Canvas/Column)', description: 'Switches between the canvas and column layouts.', shortcut: 'k', action: () => { onToggleViewMode(); onClose(); }, category: 'view' },
    { id: 'session-panel', name: 'Toggle Session Panel', description: 'Shows or hides the session panel.', shortcut: 's', action: () => { onToggleSessionPanel(); onClose(); }, category: 'view' },
    { id: 'scope-panel', name: 'Toggle Scope Panel', description: 'Shows or hides the selection scope panel.', shortcut: 'ctrl+`', action: () => { onToggleScopePanel(); onClose(); }, category: 'view' },
    ...wanderingCommands,
    { id: 'synapse-lines', name: 'Toggle Synapse Lines', description: 'Shows or hides connection lines between linked cards.', shortcut: 'l', action: () => { onToggleSynapseLines(); onClose(); }, category: 'view' },

    // Create Commands
    { id: 'new-card', name: 'New Card', description: 'Creates a new empty card on the canvas.', shortcut: 'n', action: () => { onNewCard(); onClose(); }, category: 'edit' },
    { id: 'import', name: 'Import (Images, JSON, Zotero, Markdown)', description: 'Imports cards from images, JSON, Zotero, or Markdown files.', shortcut: 'i', action: () => { onImport(); onClose(); }, category: 'edit' },
    { id: 'mass-import', name: 'Mass Import (Text)', description: 'Bulk-creates cards from pasted text.', shortcut: 'm', action: () => { onMassImport(); onClose(); }, category: 'edit' },
    { id: 'focus-search', name: 'Focus Search', description: 'Moves keyboard focus to the search field.', shortcut: 'f', action: () => { onFocusSearch(); onClose(); }, category: 'edit' },

    // Arrangement Commands
    { id: 'arrange-vertical', name: 'Arrange Vertical', description: 'Lines up the selected cards in a vertical column.', shortcut: 'v', action: () => { onArrangeVertical(); onClose(); }, category: 'edit' },
    { id: 'arrange-horizontal', name: 'Arrange Horizontal', description: 'Lines up the selected cards in a horizontal row.', shortcut: 'h', action: () => { onArrangeHorizontal(); onClose(); }, category: 'edit' },
    { id: 'arrange-circle', name: 'Arrange Stack', description: 'Stacks the selected cards on top of each other.', shortcut: 'q', action: () => { onArrangeCircle(); onClose(); }, category: 'edit' },
    { id: 'arrange-grid-vertical', name: 'Arrange Grid Vertical', description: 'Arranges the selected cards in a vertical grid.', shortcut: 'g+v', action: () => { onArrangeGridVertical(); onClose(); }, category: 'edit' },
    { id: 'arrange-grid-horizontal', name: 'Arrange Grid Horizontal', description: 'Arranges the selected cards in a horizontal grid.', shortcut: 'g+h', action: () => { onArrangeGridHorizontal(); onClose(); }, category: 'edit' },
    { id: 'arrange-kanban', name: 'Arrange Overlapping Rows', description: 'Arranges cards in overlapping rows, kanban-style.', shortcut: 'g+t', action: () => { onArrangeKanban(); onClose(); }, category: 'edit' },
    { id: 'arrange-centrality', name: 'Arrange Grid Centrality', description: 'Arranges cards in a grid ordered by network centrality.', shortcut: 'g+c', action: () => { onArrangeCentrality(); onClose(); }, category: 'edit' },

    ...scopeCommands,

    // Edit Commands
    { id: 'copy', name: 'Copy Selected', description: 'Copies the selected cards to the clipboard.', shortcut: 'ctrl+c', action: () => { onCopy(); onClose(); }, category: 'edit' },
    { id: 'duplicate', name: 'Duplicate Selected', description: 'Creates a duplicate of the selected cards.', shortcut: 'c', action: () => { onDuplicate(); onClose(); }, category: 'edit' },
    { id: 'paste', name: 'Paste', description: 'Pastes cards from the clipboard onto the canvas.', shortcut: 'ctrl+v', action: () => { onPaste(); onClose(); }, category: 'edit' },
    { id: 'undo', name: 'Undo', description: 'Reverts the last action.', shortcut: 'ctrl+z', action: () => { onUndo(); onClose(); }, category: 'edit' },
    { id: 'redo', name: 'Redo', description: 'Re-applies the last undone action.', shortcut: 'ctrl+y', action: () => { onRedo(); onClose(); }, category: 'edit' },
    { id: 'select-all', name: 'Select All', description: 'Selects every card on the canvas.', shortcut: 'ctrl+a', action: () => { selectAll(); onClose(); }, category: 'edit' },
    { id: 'clear', name: 'Clear Selection', description: 'Deselects all currently selected cards.', shortcut: 'esc', action: () => { clearSelection(); onClose(); }, category: 'edit' },
    {
      id: 'remove-from-session',
      name: 'Remove from Session',
      description: 'Removes the selected cards from the active session without deleting them.',
      shortcut: 'del',
      action: () => {
        const activeSessionId = useBrainStore.getState().activeSessionId;
        if (activeSessionId) {
          const removeCardsFromSession = useBrainStore.getState().removeCardsFromSession;
          removeCardsFromSession(activeSessionId, Array.from(selectedNodeIds));
        }
        onClose();
      },
      category: 'edit',
    },
    {
      id: 'delete-permanent',
      name: 'Delete Permanently',
      description: 'Permanently deletes the selected cards from all sessions. Cannot be undone.',
      shortcut: 'ctrl+del',
      action: () => {
        if (!confirm(`Permanently delete ${selectedNodeIds.size} card(s) from all sessions?`)) return;
        const deleteNodesPermanently = useBrainStore.getState().deleteNodesPermanently;
        deleteNodesPermanently(Array.from(selectedNodeIds));
        onClose();
      },
      category: 'edit',
    },
    { id: 'pin', name: 'Pin/Unpin Selected', description: 'Toggles the pinned state of the selected cards.', shortcut: 'p', action: () => { onTogglePin(); onClose(); }, category: 'edit' },
    { id: 'flip-text', name: 'Flip Images to Text (Selected/All)', description: 'Converts image cards to text cards.', shortcut: 'o+o', action: () => { onFlipToText(); onClose(); }, category: 'edit' },
    { id: 'flip-image', name: 'Flip Images to Image (Selected/All)', description: 'Converts text cards to image cards.', shortcut: 'o', action: () => { onFlipToImage(); onClose(); }, category: 'edit' },

    // File Commands
    { id: 'save', name: 'Save', description: 'Saves the current state to disk.', shortcut: 'ctrl+enter', action: () => { onSave(); onClose(); }, category: 'file' },
    {
      id: 'export-sif', name: 'Export to Cytoscape (SIF)', description: 'Exports the graph as a Cytoscape SIF file.', shortcut: 'sif', action: () => {
        const nodesArray = Array.from(nodes.values()) as MindNode[];
        exportToCytoscape(nodesArray, synapses);
        onClose();
      }, category: 'file'
    },
    {
      id: 'export-csv', name: 'Export to Cytoscape (CSV)', description: 'Exports the graph as a Cytoscape CSV file.', shortcut: 'csv', action: () => {
        const nodesArray = Array.from(nodes.values()) as MindNode[];
        exportToCSV(nodesArray, synapses);
        onClose();
      }, category: 'file'
    },
    { id: 'settings', name: 'Settings', description: 'Opens the app settings.', shortcut: '', action: () => { onOpenSettings(); onClose(); }, category: 'file' },
  ];

  const filteredCommands = commands.filter(cmd =>
    cmd.name.toLowerCase().includes(query.toLowerCase()) ||
    cmd.shortcut.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        filteredCommands[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-32 bg-black/60 backdrop-blur-sm font-serif text-base"
      onClick={onClose}
    >
      <div
        className="w-[600px] rounded-2xl shadow-2xl overflow-hidden"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div
          className="p-4"
          style={{ borderBottom: `1px solid ${theme.node.border}` }}
        >
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            className="w-full bg-transparent outline-none placeholder-opacity-60 text-lg"
            style={{ color: theme.node.text }}
          />
        </div>

        {/* Commands List */}
        <div className="max-h-[400px] overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="p-8 text-center opacity-70">
              No commands found
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <button
                key={cmd.id}
                onClick={() => cmd.action()}
                className={`w-full px-4 py-3 flex items-center justify-between gap-4 text-left transition-colors ${index === selectedIndex
                  ? 'bg-purple-600/30 border-l-2 border-purple-500'
                  : 'hover:bg-gray-800/50'
                  }`}
                style={
                  index === selectedIndex
                    ? { backgroundColor: theme.node.selectedBg, borderLeft: `2px solid ${theme.node.selectedBorder}` }
                    : {}
                }
              >
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="font-bold font-heading">{cmd.name}</span>
                  <span className="text-xs opacity-60">{cmd.description}</span>
                </div>
                <span
                  className="shrink-0 text-xs font-mono px-2 py-1 rounded"
                  style={{ backgroundColor: `${theme.node.border}1A`, color: theme.node.text }}
                >
                  {cmd.shortcut}
                </span>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div
          className="p-3 flex items-center justify-between text-xs"
          style={{ borderTop: `1px solid ${theme.node.border}`, color: theme.node.text }}
        >
          <div className="flex gap-4">
            <span><kbd className="px-2 py-1 rounded bg-black/20">↑↓</kbd> Navigate</span>
            <span><kbd className="px-2 py-1 rounded bg-black/20">Enter</kbd> Execute</span>
            <span><kbd className="px-2 py-1 rounded bg-black/20">Esc</kbd> Close</span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
};


