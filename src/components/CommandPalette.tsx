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
  shortcut: string;
  action: () => void | Promise<void>;
  icon: string;
  category: 'ai' | 'view' | 'edit' | 'file';
}

interface CommandPaletteProps {
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenAIPanel: () => void;
  onOpenAIChat: () => void;
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
  const selectAll = useBrainStore((state) => state.selectAll);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const removeNode = useBrainStore((state) => state.removeNode);
  const intelligence = useIntelligence();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const scopeCommands: Command[] = onExpandScopeDegree
    ? [1, 2, 3, 4, 5, 6].map((degree) => ({
      id: `scope-${degree}`,
      name: `Scope +${degree}`,
      shortcut: `alt+${degree}`,
      action: () => { onExpandScopeDegree(degree); onClose(); },
      category: 'view',
      icon: '🧭',
    }))
    : [];

  const commands: Command[] = [
    // AI Commands
    { id: 'ai-panel', name: 'Open AI Panel', shortcut: 'b', action: () => { onOpenAIPanel(); onClose(); }, category: 'ai', icon: '🤖' },
    { id: 'ai-chat', name: 'AI Chat (manual provider)', shortcut: 'a', action: () => { onOpenAIChat(); onClose(); }, category: 'ai', icon: '💬' },
    { id: 'quote-extractor', name: 'AI Quote Extractor', shortcut: 'e', action: () => { onQuoteExtractor(); onClose(); }, category: 'ai', icon: '📝' },
    { id: 'embed', name: 'Generate Embeddings', shortcut: 'emb', action: async () => { await intelligence.embedAllNodes(); onClose(); }, category: 'ai', icon: '🧬' },
    { id: 'link', name: 'Auto-Link Similar', shortcut: 'link', action: async () => { await intelligence.autoLinkSimilarNodes(); onClose(); }, category: 'ai', icon: '🔗' },
    { id: 'reflect', name: 'AI Reflection', shortcut: 'ref', action: async () => { await intelligence.reflect(); onClose(); }, category: 'ai', icon: '💭' },
    { id: 'tags', name: 'Generate Tags', shortcut: 'tag', action: async () => { await intelligence.generateTagsForSelection(); onClose(); }, category: 'ai', icon: '🏷️' },

    // View Commands
    { id: 'center', name: 'Center Camera (0,0)', shortcut: '', action: () => { onCenterCamera(); onClose(); }, category: 'view', icon: '🎯' },
    { id: 'fit-all', name: 'Fit All Nodes', shortcut: '-', action: () => { onFitAllNodes(); onClose(); }, category: 'view', icon: '🔍' },
    { id: 'zen', name: 'Toggle Zen Mode', shortcut: 'z', action: () => { onToggleZen(); onClose(); }, category: 'view', icon: '🧘' },
    { id: 'theme', name: 'Change Theme', shortcut: 't', action: () => { onToggleTheme(); onClose(); }, category: 'view', icon: '🎨' },
    { id: 'reset-zoom', name: 'Reset Zoom', shortcut: '0', action: () => { onResetZoom(); onClose(); }, category: 'view', icon: '100%' },
    { id: 'view-mode', name: 'Toggle View Mode (Canvas/Column)', shortcut: 'k', action: () => { onToggleViewMode(); onClose(); }, category: 'view', icon: '📑' },
    { id: 'session-panel', name: 'Toggle Session Panel', shortcut: 's', action: () => { onToggleSessionPanel(); onClose(); }, category: 'view', icon: '🗃️' },
    { id: 'scope-panel', name: 'Toggle Scope Panel', shortcut: 'ctrl+§', action: () => { onToggleScopePanel(); onClose(); }, category: 'view', icon: '🔭' },
    { id: 'wandering', name: 'Toggle Wandering Mode', shortcut: 'w', action: () => { onToggleWandering(); onClose(); }, category: 'view', icon: '🚶' },
    { id: 'synapse-lines', name: 'Toggle Synapse Lines', shortcut: 'l', action: () => { onToggleSynapseLines(); onClose(); }, category: 'view', icon: '🕸️' },

    // Create Commands
    { id: 'new-card', name: 'New Card', shortcut: 'n', action: () => { onNewCard(); onClose(); }, category: 'edit', icon: '➕' },
    { id: 'import', name: 'Import (Images, JSON, Zotero)', shortcut: 'i', action: () => { onImport(); onClose(); }, category: 'edit', icon: '📥' },
    { id: 'mass-import', name: 'Mass Import (Text)', shortcut: 'm', action: () => { onMassImport(); onClose(); }, category: 'edit', icon: '📚' },
    { id: 'focus-search', name: 'Focus Search', shortcut: 'f', action: () => { onFocusSearch(); onClose(); }, category: 'edit', icon: '🔎' },

    // Arrangement Commands
    { id: 'arrange-vertical', name: 'Arrange Vertical', shortcut: 'v', action: () => { onArrangeVertical(); onClose(); }, category: 'edit', icon: '↕️' },
    { id: 'arrange-horizontal', name: 'Arrange Horizontal', shortcut: 'h', action: () => { onArrangeHorizontal(); onClose(); }, category: 'edit', icon: '↔️' },
    { id: 'arrange-circle', name: 'Arrange Stack', shortcut: 'q', action: () => { onArrangeCircle(); onClose(); }, category: 'edit', icon: '🌀' },
    { id: 'arrange-grid-vertical', name: 'Arrange Grid Vertical', shortcut: 'g+v', action: () => { onArrangeGridVertical(); onClose(); }, category: 'edit', icon: '🧱' },
    { id: 'arrange-grid-horizontal', name: 'Arrange Grid Horizontal', shortcut: 'g+h', action: () => { onArrangeGridHorizontal(); onClose(); }, category: 'edit', icon: '🧊' },
    { id: 'arrange-kanban', name: 'Arrange Overlapping Rows', shortcut: 'g+t', action: () => { onArrangeKanban(); onClose(); }, category: 'edit', icon: '🗂️' },
    { id: 'arrange-centrality', name: 'Arrange Grid Centrality', shortcut: 'g+c', action: () => { onArrangeCentrality(); onClose(); }, category: 'edit', icon: '☢️' },

    ...scopeCommands,

    // Edit Commands
    { id: 'copy', name: 'Copy Selected', shortcut: 'ctrl+c', action: () => { onCopy(); onClose(); }, category: 'edit', icon: '📄' },
    { id: 'duplicate', name: 'Duplicate Selected', shortcut: 'c', action: () => { onDuplicate(); onClose(); }, category: 'edit', icon: '👥' },
    { id: 'paste', name: 'Paste', shortcut: 'ctrl+v', action: () => { onPaste(); onClose(); }, category: 'edit', icon: '📋' },
    { id: 'undo', name: 'Undo', shortcut: 'ctrl+z', action: () => { onUndo(); onClose(); }, category: 'edit', icon: '↩️' },
    { id: 'redo', name: 'Redo', shortcut: 'ctrl+y', action: () => { onRedo(); onClose(); }, category: 'edit', icon: '↪️' },
    { id: 'select-all', name: 'Select All', shortcut: 'ctrl+a', action: () => { selectAll(); onClose(); }, category: 'edit', icon: '✨' },
    { id: 'clear', name: 'Clear Selection', shortcut: 'esc', action: () => { clearSelection(); onClose(); }, category: 'edit', icon: '❌' },
    { id: 'delete', name: 'Delete Selected', shortcut: 'del', action: () => { Array.from(selectedNodeIds).forEach((id) => removeNode(id)); onClose(); }, category: 'edit', icon: '🗑️' },
    { id: 'pin', name: 'Pin/Unpin Selected', shortcut: 'p', action: () => { onTogglePin(); onClose(); }, category: 'edit', icon: '📌' },
    { id: 'flip-text', name: 'Flip Images to Text', shortcut: 'o+o', action: () => { onFlipToText(); onClose(); }, category: 'edit', icon: '📝' },
    { id: 'flip-image', name: 'Flip Images to Image', shortcut: 'o', action: () => { onFlipToImage(); onClose(); }, category: 'edit', icon: '🖼️' },

    // File Commands
    { id: 'save', name: 'Save', shortcut: 'ctrl+enter', action: () => { onSave(); onClose(); }, category: 'file', icon: '💾' },
    {
      id: 'export-sif', name: 'Export to Cytoscape (SIF)', shortcut: 'sif', action: () => {
        const nodesArray = Array.from(nodes.values()) as MindNode[];
        exportToCytoscape(nodesArray, synapses);
        onClose();
      }, category: 'file', icon: '🕸️'
    },
    {
      id: 'export-csv', name: 'Export to Cytoscape (CSV)', shortcut: 'csv', action: () => {
        const nodesArray = Array.from(nodes.values()) as MindNode[];
        exportToCSV(nodesArray, synapses);
        onClose();
      }, category: 'file', icon: '📊'
    },
    { id: 'settings', name: 'Settings', shortcut: '', action: () => { onOpenSettings(); onClose(); }, category: 'file', icon: '⚙️' },
    {
      id: 'migrate-links', name: 'Migrate Links (Comment → Link Field)', shortcut: 'migrate', action: () => {
        const migratedCount = useBrainStore.getState().migrateLinksFromCommentToLink();
        alert(`✅ Migrated ${migratedCount} cards`);
        onClose();
      }, category: 'file', icon: '🔄'
    },
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
                className={`w-full px-4 py-3 flex items-center justify-between text-left transition-colors ${index === selectedIndex
                  ? 'bg-purple-600/30 border-l-2 border-purple-500'
                  : 'hover:bg-gray-800/50'
                  }`}
                style={
                  index === selectedIndex
                    ? { backgroundColor: theme.node.selectedBg, borderLeft: `2px solid ${theme.node.selectedBorder}` }
                    : {}
                }
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{cmd.icon}</span>
                  <span>{cmd.name}</span>
                </div>
                <span
                  className="text-xs font-mono px-2 py-1 rounded"
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

