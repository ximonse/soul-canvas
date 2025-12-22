import React, { useState, useMemo } from 'react';
import type { Session, MindNode, SortOption } from '../types/types';
import type { Theme } from '../themes';
import { useBrainStore } from '../store/useBrainStore';
import { SORT_LABELS } from '../utils/sortNodes';

interface SessionPanelProps {
  // Theme
  theme: Theme;
  themeName: string;
  onToggleTheme: () => void;

  // Sessions
  sessions: Session[];
  activeSessionId: string | null;
  onCreateSession: (name: string) => void;
  onDeleteSession: (id: string) => void;
  onSwitchSession: (id: string | null) => void;
  onRenameSession: (id: string, name: string) => void;

  // Tags - ny struktur
  includeTags: string[];
  excludeTags: string[];
  onToggleTagFilter: (tag: string) => void;
  onClearTagFilter: () => void;

  // Alla kort (för att samla tillgängliga taggar)
  allNodes: MindNode[];

  // Sök utanför session
  outsideSearchQuery: string;
  outsideSearchResults: MindNode[];
  onOutsideSearchChange: (query: string) => void;
  onAddCardsToSession: (cardIds: string[]) => void;

  // Statistik
  selectedCount: number;
  sessionCardCount: number;
  visibleCardCount: number;
  totalCardCount: number;

  // Sökterm (för att visa i inforutan)
  searchQuery?: string;

  // Extern kontroll av expanded-state
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
  theme,
  themeName,
  onToggleTheme,
  sessions,
  activeSessionId,
  onCreateSession,
  onDeleteSession,
  onSwitchSession,
  onRenameSession,
  includeTags,
  excludeTags,
  onToggleTagFilter,
  onClearTagFilter,
  allNodes,
  outsideSearchQuery,
  outsideSearchResults,
  onOutsideSearchChange,
  onAddCardsToSession,
  selectedCount,
  sessionCardCount,
  visibleCardCount,
  totalCardCount,
  searchQuery,
  isExpanded,
  onToggleExpanded,
}) => {
  const [newSessionName, setNewSessionName] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [tagSortMode, setTagSortMode] = useState<'alpha' | 'count'>('alpha');
  const { viewMode, columnSort, setColumnSort, columnShowComments, columnShowTags, toggleColumnShowComments, toggleColumnShowTags } = useBrainStore();

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  // Samla alla unika taggar med antal från synliga kort
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    allNodes.forEach(node => {
      node.tags?.forEach(t => {
        counts.set(t, (counts.get(t) || 0) + 1);
      });
    });
    return counts;
  }, [allNodes]);

  const allTags = useMemo(() => {
    const tags = Array.from(tagCounts.keys());
    if (tagSortMode === 'count') {
      return tags.sort((a, b) => (tagCounts.get(b) || 0) - (tagCounts.get(a) || 0));
    }
    return tags.sort();
  }, [tagCounts, tagSortMode]);

  // Hjälpfunktion för tagg-status
  const getTagStatus = (tag: string): 'neutral' | 'include' | 'exclude' => {
    if (includeTags.includes(tag)) return 'include';
    if (excludeTags.includes(tag)) return 'exclude';
    return 'neutral';
  };

  const handleCreateSession = () => {
    const name = newSessionName.trim() || 'Ny session';
    onCreateSession(name);
    setNewSessionName('');
  };

  const handleStartRename = (session: Session) => {
    setEditingSessionId(session.id);
    setEditName(session.name);
  };

  const handleFinishRename = () => {
    if (editingSessionId && editName.trim()) {
      onRenameSession(editingSessionId, editName.trim());
    }
    setEditingSessionId(null);
    setEditName('');
  };

  // Inforuta (alltid synlig i toppen)
  const infoBar = (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2 rounded-xl border shadow-lg backdrop-blur cursor-pointer transition-colors"
      style={{
        backgroundColor: theme.node.bg + 'e6',
        borderColor: theme.node.border,
        color: theme.node.text,
      }}
      onClick={onToggleExpanded}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Session */}
      <span className="text-sm font-medium">
        {activeSession ? activeSession.name : 'Alla kort'}
      </span>

      {/* Vy-indikator + sortering i kolumn-vy */}
      {viewMode === 'canvas' ? (
        <span
          className="px-2 py-0.5 text-xs rounded-full opacity-60"
          title="Canvas-vy (K för att byta)"
        >
          ⊞
        </span>
      ) : (
        <select
          value={columnSort}
          onChange={(e) => {
            e.stopPropagation();
            setColumnSort(e.target.value as SortOption);
          }}
          onClick={(e) => e.stopPropagation()}
          className="px-2 py-0.5 text-xs rounded cursor-pointer"
          style={{
            backgroundColor: theme.canvasColor,
            color: theme.node.text,
            border: `1px solid ${theme.node.border}`,
          }}
          title="Sortering (K för canvas-vy)"
        >
          {Object.entries(SORT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      )}

      {/* Kolumn-vy toggles */}
      {viewMode === 'column' && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleColumnShowComments();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-opacity ${columnShowComments ? 'opacity-100' : 'opacity-40'}`}
            style={{
              backgroundColor: columnShowComments ? theme.node.selectedBorder : theme.canvasColor,
              color: columnShowComments ? theme.node.bg : theme.node.text,
              border: `1px solid ${theme.node.border}`,
            }}
            title="Visa/dölj kommentarer"
          >
            💬
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleColumnShowTags();
            }}
            className={`px-2 py-0.5 text-xs rounded transition-opacity ${columnShowTags ? 'opacity-100' : 'opacity-40'}`}
            style={{
              backgroundColor: columnShowTags ? theme.node.selectedBorder : theme.canvasColor,
              color: columnShowTags ? theme.node.bg : theme.node.text,
              border: `1px solid ${theme.node.border}`,
            }}
            title="Visa/dölj taggar"
          >
            🏷️
          </button>
        </>
      )}

      {/* Tema-väljare */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleTheme();
        }}
        className="px-2 py-0.5 text-xs rounded opacity-70 hover:opacity-100 transition-opacity"
        style={{
          backgroundColor: theme.canvasColor,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
        }}
        title="Byt tema"
      >
        {themeName}
      </button>

      {/* Markerade kort */}
      {selectedCount > 0 && (
        <span className="px-2 py-0.5 text-xs bg-blue-600/50 rounded-full">
          {selectedCount} markerade
        </span>
      )}

      {/* Sökterm */}
      {searchQuery && (
        <span className="px-2 py-0.5 text-xs bg-yellow-600/50 rounded-full">
          🔍 {searchQuery.length > 15 ? searchQuery.slice(0, 15) + '...' : searchQuery}
        </span>
      )}

      {/* Taggfilter */}
      {(includeTags.length > 0 || excludeTags.length > 0) && (
        <div className="flex items-center gap-1">
          {includeTags.slice(0, 2).map(t => (
            <span key={t} className="px-2 py-0.5 text-xs bg-green-600/50 rounded-full">
              +{t}
            </span>
          ))}
          {excludeTags.slice(0, 2).map(t => (
            <span key={t} className="px-2 py-0.5 text-xs bg-red-600/50 rounded-full">
              -{t}
            </span>
          ))}
          {(includeTags.length + excludeTags.length) > 4 && (
            <span className="text-xs opacity-50">+{includeTags.length + excludeTags.length - 4}</span>
          )}
        </div>
      )}

      {/* Antal kort */}
      <span className="text-xs opacity-50">
        {visibleCardCount} / {activeSession ? sessionCardCount : totalCardCount} kort
      </span>

      <span className="opacity-40">{isExpanded ? '◀' : '▼'}</span>
    </div>
  );

  // Bara inforutan om inte expanderat
  if (!isExpanded) {
    return infoBar;
  }

  // Expanderat läge - panel till vänster + inforutan i toppen
  return (
    <>
      {infoBar}
      <div
        className="fixed left-0 top-0 h-full w-80 z-50 border-r shadow-2xl backdrop-blur overflow-hidden flex flex-col"
        style={{
          backgroundColor: theme.node.bg + 'f2',
          borderColor: theme.node.border,
          color: theme.node.text,
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: theme.node.border }}
      >
        <span className="font-semibold">Session <span className="text-xs opacity-50 font-normal">(S)</span></span>
        <button
          onClick={onToggleExpanded}
          className="opacity-60 hover:opacity-100 text-sm"
          title="Stäng"
        >
          ✕
        </button>
      </div>

      <div className="p-4 space-y-4 flex-1 overflow-y-auto">
        {/* Session-lista */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
              placeholder="Ny session..."
              className="flex-1 text-sm px-3 py-2 rounded border outline-none focus:border-blue-500"
              style={{
                backgroundColor: theme.node.bg,
                borderColor: theme.node.border,
                color: theme.node.text,
              }}
            />
            <button
              onClick={handleCreateSession}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded text-white"
            >
              + Skapa
            </button>
          </div>

          <div className="space-y-1">
            {/* "Alla kort" alternativ */}
            <button
              onClick={() => onSwitchSession(null)}
              className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                !activeSessionId ? 'bg-blue-600 text-white' : 'hover:opacity-80'
              }`}
              style={activeSessionId ? {
                backgroundColor: theme.node.bg,
                color: theme.node.text,
              } : undefined}
            >
              <span>Alla kort</span>
              <span className="text-xs opacity-60">{totalCardCount} kort</span>
            </button>

            {/* Sessioner */}
            {sessions.map(session => (
              <div
                key={session.id}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                  activeSessionId === session.id ? 'bg-blue-600 text-white' : 'hover:opacity-80'
                }`}
                style={activeSessionId !== session.id ? {
                  backgroundColor: theme.node.bg,
                  color: theme.node.text,
                } : undefined}
              >
                {editingSessionId === session.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                    className="flex-1 px-2 py-1 rounded outline-none"
                    style={{
                      backgroundColor: theme.node.border,
                      color: theme.node.text,
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <button
                      onClick={() => onSwitchSession(session.id)}
                      className="flex-1 text-left"
                    >
                      {session.name}
                    </button>
                    <span className="text-xs opacity-60">{session.cardIds.length} kort</span>
                    <button
                      onClick={() => handleStartRename(session)}
                      className="opacity-60 hover:opacity-100 px-1"
                      title="Byt namn"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="opacity-60 hover:opacity-100 px-1"
                      title="Ta bort session"
                    >
                      🗑️
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Sök utanför session (bara om i en session) */}
        {activeSession && (
          <div
            className="space-y-2 border-t pt-4"
            style={{ borderColor: theme.node.border }}
          >
            <div className="text-xs opacity-60 uppercase tracking-wide">
              Lägg till kort (söker utanför session)
            </div>

            <input
              value={outsideSearchQuery}
              onChange={(e) => onOutsideSearchChange(e.target.value)}
              placeholder="Sök AND/OR/NOT/wildcards*..."
              className="w-full text-sm px-3 py-2 rounded border outline-none focus:border-blue-500"
              style={{
                backgroundColor: theme.node.bg,
                borderColor: theme.node.border,
                color: theme.node.text,
              }}
            />

            {outsideSearchResults.length > 0 && (
              <div className="space-y-2">
                {/* Lägg till alla-knapp */}
                <button
                  onClick={() => onAddCardsToSession(outsideSearchResults.map(n => n.id))}
                  className="w-full px-3 py-2 text-sm bg-green-600 hover:bg-green-500 text-white rounded font-medium"
                >
                  + Lägg till alla ({outsideSearchResults.length} kort)
                </button>

                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {outsideSearchResults.slice(0, 10).map(node => (
                    <div
                      key={node.id}
                      className="flex items-center gap-2 px-3 py-2 rounded hover:opacity-80 cursor-pointer"
                      style={{
                        backgroundColor: theme.node.bg,
                        color: theme.node.text,
                      }}
                      onClick={() => onAddCardsToSession([node.id])}
                    >
                      <span className="text-sm truncate flex-1">
                        {node.title || node.content.slice(0, 50)}
                      </span>
                      <span className="text-xs text-green-400">+</span>
                    </div>
                  ))}
                  {outsideSearchResults.length > 10 && (
                    <div className="text-xs opacity-50 text-center py-1">
                      ...och {outsideSearchResults.length - 10} till
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Taggfilter - klicka för att växla: neutral → inkludera → exkludera → neutral */}
        <div
          className="space-y-2 border-t pt-4"
          style={{ borderColor: theme.node.border }}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs opacity-60 uppercase tracking-wide">
              Taggfilter
            </div>
            <div className="flex items-center gap-2">
              {/* Sortering */}
              <div className="flex text-xs">
                <button
                  onClick={() => setTagSortMode('alpha')}
                  className="px-2 py-0.5 rounded-l border"
                  style={{
                    borderColor: theme.node.border,
                    backgroundColor: tagSortMode === 'alpha' ? theme.node.border : 'transparent',
                    color: theme.node.text,
                    opacity: tagSortMode === 'alpha' ? 1 : 0.6,
                  }}
                  title="Alfabetisk"
                >
                  A-Ö
                </button>
                <button
                  onClick={() => setTagSortMode('count')}
                  className="px-2 py-0.5 rounded-r border border-l-0"
                  style={{
                    borderColor: theme.node.border,
                    backgroundColor: tagSortMode === 'count' ? theme.node.border : 'transparent',
                    color: theme.node.text,
                    opacity: tagSortMode === 'count' ? 1 : 0.6,
                  }}
                  title="Antal"
                >
                  #
                </button>
              </div>
              {(includeTags.length > 0 || excludeTags.length > 0) && (
                <button
                  onClick={onClearTagFilter}
                  className="text-xs opacity-50 hover:opacity-100"
                >
                  Rensa
                </button>
              )}
            </div>
          </div>

          {allTags.length === 0 ? (
            <div className="text-xs opacity-50">Inga taggar i sessionen</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => {
                const status = getTagStatus(tag);
                const prefix = status === 'include' ? '+' : status === 'exclude' ? '-' : '';

                return (
                  <button
                    type="button"
                    key={tag}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleTagFilter(tag);
                    }}
                    className="px-2 py-1 rounded-full text-xs border transition-colors"
                    style={{
                      backgroundColor: status === 'include'
                        ? 'rgba(34, 197, 94, 0.3)'
                        : status === 'exclude'
                          ? 'rgba(239, 68, 68, 0.3)'
                          : theme.node.bg,
                      borderColor: status === 'include'
                        ? 'rgba(34, 197, 94, 0.6)'
                        : status === 'exclude'
                          ? 'rgba(239, 68, 68, 0.6)'
                          : theme.node.border,
                      color: theme.node.text,
                    }}
                  >
                    {prefix}{tag} <span className="opacity-50">{tagCounts.get(tag)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Statistik */}
        <div
          className="text-xs opacity-50 text-center pt-2 border-t"
          style={{ borderColor: theme.node.border }}
        >
          Visar: {visibleCardCount} |
          {activeSession ? ` Session: ${sessionCardCount} |` : ''}
          Totalt: {totalCardCount} kort
        </div>
      </div>
      </div>
    </>
  );
};
