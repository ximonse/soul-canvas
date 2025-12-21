import React, { useState, useMemo } from 'react';
import type { Session, MindNode } from '../types/types';

interface SessionPanelProps {
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
  sessionCardCount: number;
  visibleCardCount: number;
  totalCardCount: number;

  // Extern kontroll av expanded-state
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export const SessionPanel: React.FC<SessionPanelProps> = ({
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
  sessionCardCount,
  visibleCardCount,
  totalCardCount,
  isExpanded,
  onToggleExpanded,
}) => {
  const [newSessionName, setNewSessionName] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const activeSession = useMemo(
    () => sessions.find(s => s.id === activeSessionId) || null,
    [sessions, activeSessionId]
  );

  // Samla alla unika taggar från synliga kort
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    allNodes.forEach(node => {
      node.tags?.forEach(t => tagSet.add(t));
    });
    return Array.from(tagSet).sort();
  }, [allNodes]);

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

  // Kompakt läge - bara en rad
  if (!isExpanded) {
    return (
      <div
        className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900/90 text-gray-100 px-4 py-2 rounded-xl border border-gray-700 shadow-lg backdrop-blur cursor-pointer hover:bg-gray-800/90 transition-colors"
        onClick={onToggleExpanded}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="text-sm font-medium">
          {activeSession ? activeSession.name : 'Alla kort'}
        </span>

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
              <span className="text-xs text-gray-400">+{includeTags.length + excludeTags.length - 4}</span>
            )}
          </div>
        )}

        <span className="text-xs text-gray-400">
          {visibleCardCount} / {activeSession ? sessionCardCount : totalCardCount} kort
        </span>

        <span className="text-gray-500">▼</span>
      </div>
    );
  }

  // Expanderat läge
  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40 w-[500px] bg-gray-900/95 text-gray-100 rounded-xl border border-gray-700 shadow-2xl backdrop-blur"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <span className="font-semibold">Session <span className="text-xs text-gray-500 font-normal">(S)</span></span>
        <button
          onClick={onToggleExpanded}
          className="text-gray-400 hover:text-white text-lg"
        >
          ▲
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Session-lista */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <input
              value={newSessionName}
              onChange={(e) => setNewSessionName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
              placeholder="Ny session..."
              className="flex-1 bg-gray-800 text-sm px-3 py-2 rounded border border-gray-700 outline-none focus:border-blue-500"
            />
            <button
              onClick={handleCreateSession}
              className="px-3 py-2 text-sm bg-blue-600 hover:bg-blue-500 rounded"
            >
              + Skapa
            </button>
          </div>

          <div className="space-y-1">
            {/* "Alla kort" alternativ */}
            <button
              onClick={() => onSwitchSession(null)}
              className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                !activeSessionId ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
              }`}
            >
              <span>Alla kort</span>
              <span className="text-xs text-gray-400">{totalCardCount} kort</span>
            </button>

            {/* Sessioner */}
            {sessions.map(session => (
              <div
                key={session.id}
                className={`flex items-center gap-2 px-3 py-2 rounded text-sm ${
                  activeSessionId === session.id ? 'bg-blue-600' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {editingSessionId === session.id ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleFinishRename}
                    onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                    className="flex-1 bg-gray-700 px-2 py-1 rounded outline-none"
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
                    <span className="text-xs text-gray-400">{session.cardIds.length} kort</span>
                    <button
                      onClick={() => handleStartRename(session)}
                      className="text-gray-400 hover:text-white px-1"
                      title="Byt namn"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDeleteSession(session.id)}
                      className="text-gray-400 hover:text-red-400 px-1"
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

        {/* Taggfilter - klicka för att växla: neutral → inkludera → exkludera → neutral */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Taggfilter <span className="normal-case">(klicka för att växla)</span>
            </div>
            {(includeTags.length > 0 || excludeTags.length > 0) && (
              <button
                onClick={onClearTagFilter}
                className="text-xs text-gray-500 hover:text-gray-300"
              >
                Rensa
              </button>
            )}
          </div>

          {allTags.length === 0 ? (
            <div className="text-xs text-gray-500">Inga taggar i sessionen</div>
          ) : (
            <div className="flex flex-wrap gap-1">
              {allTags.map(tag => {
                const status = getTagStatus(tag);
                const bgClass = status === 'include'
                  ? 'bg-green-600/40 border-green-500/60'
                  : status === 'exclude'
                    ? 'bg-red-600/40 border-red-500/60'
                    : 'bg-gray-800 border-gray-700 hover:border-gray-600';
                const prefix = status === 'include' ? '+' : status === 'exclude' ? '-' : '';

                return (
                  <button
                    key={tag}
                    onClick={() => onToggleTagFilter(tag)}
                    className={`px-2 py-1 rounded-full text-xs border transition-colors ${bgClass}`}
                  >
                    {prefix}{tag}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Sök utanför session (bara om i en session) */}
        {activeSession && (
          <div className="space-y-2 border-t border-gray-700 pt-4">
            <div className="text-xs text-gray-400 uppercase tracking-wide">
              Lägg till kort (söker utanför session)
            </div>

            <input
              value={outsideSearchQuery}
              onChange={(e) => onOutsideSearchChange(e.target.value)}
              placeholder="Sök AND/OR/NOT/wildcards*..."
              className="w-full bg-gray-800 text-sm px-3 py-2 rounded border border-gray-700 outline-none focus:border-blue-500"
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
                      className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded hover:bg-gray-700 cursor-pointer"
                      onClick={() => onAddCardsToSession([node.id])}
                    >
                      <span className="text-sm truncate flex-1">
                        {node.title || node.content.slice(0, 50)}
                      </span>
                      <span className="text-xs text-green-400">+</span>
                    </div>
                  ))}
                  {outsideSearchResults.length > 10 && (
                    <div className="text-xs text-gray-400 text-center py-1">
                      ...och {outsideSearchResults.length - 10} till
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Statistik */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t border-gray-700">
          Visar: {visibleCardCount} |
          {activeSession ? ` Session: ${sessionCardCount} |` : ''}
          Totalt: {totalCardCount} kort
        </div>
      </div>
    </div>
  );
};
