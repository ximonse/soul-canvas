// src/components/overlays/TrailPanel.tsx
// Panel för vandring och stighantering

import React, { useState } from 'react';
import type { Theme } from '../../themes';
import type { Trail, GravitatingNode, MindNode, GravitatingColorMode } from '../../types/types';
import { SEMANTIC_THEME_COLORS } from '../../utils/nodeStyles';

interface TrailPanelProps {
  theme: Theme;
  isOpen: boolean;
  onClose: () => void;

  // Wandering state
  isWandering: boolean;
  currentNodeId: string | null;
  gravitatingNodes: GravitatingNode[];
  visitedNodeIds: Set<string>;

  // Trail state
  activeTrail: Trail | null;
  trailHistory: Trail[];

  // Settings
  minSimilarityThreshold: number;
  showOnlyDifferentWords: boolean;
  colorMode: GravitatingColorMode;

  // Actions
  onStartWandering: (nodeId: string) => void;
  onStartNewTrail: (nodeId: string) => void;
  onStopWandering: () => void;
  onStepTo: (nodeId: string) => void;
  onBacktrack: () => void;
  onRemoveWaypoint: (trailId: string, waypointIndex: number) => void;
  onMoveWaypoint: (trailId: string, fromIndex: number, toIndex: number) => void;
  onSaveTrail: (name: string) => void;
  onBranchHere: () => void;
  onResumeTrail: (trailId: string) => void;
  onDeleteTrail: (trailId: string) => void;
  onSetThreshold: (threshold: number) => void;
  onToggleSurfaceDifference: () => void;
  onSetColorMode: (mode: GravitatingColorMode) => void;

  // Trail selection (för multi-stig)
  selectedTrailIds: string[];
  onSelectTrailNodes: (trailId: string) => void;
  onToggleTrailSelection: (trailId: string) => void;
  onClearTrailSelection: () => void;
  onSetSelectedTrailIds: (trailIds: string[]) => void;
  showActiveTrailLine: boolean;
  onSetShowActiveTrailLine: (show: boolean) => void;

  // Node lookup
  getNode: (nodeId: string) => MindNode | undefined;

  // Selected node for starting
  selectedNodeId: string | null;
}

export const TrailPanel: React.FC<TrailPanelProps> = ({
  theme,
  isOpen,
  onClose,
  isWandering,
  currentNodeId,
  gravitatingNodes,
  visitedNodeIds,
  activeTrail,
  trailHistory,
  minSimilarityThreshold,
  showOnlyDifferentWords,
  colorMode,
  onStartWandering,
  onStartNewTrail,
  onStopWandering,
  onStepTo,
  onBacktrack,
  onRemoveWaypoint,
  onMoveWaypoint,
  onSaveTrail,
  onBranchHere,
  onResumeTrail,
  onDeleteTrail,
  onSetThreshold,
  onToggleSurfaceDifference,
  onSetColorMode,
  selectedTrailIds,
  onSelectTrailNodes,
  onToggleTrailSelection,
  onClearTrailSelection,
  onSetSelectedTrailIds,
  showActiveTrailLine,
  onSetShowActiveTrailLine,
  getNode,
  selectedNodeId,
}) => {
  const [trailName, setTrailName] = useState('');

  if (!isOpen) return null;

  const panelAccent = '#f59e0b';
  const panelStyle = {
    backgroundColor: theme.node.bg,
    color: theme.node.text,
    borderColor: theme.node.border,
    borderRightColor: panelAccent,
  };
  const sectionStyle = {
    backgroundColor: theme.canvasColor,
    borderColor: theme.node.border,
  };
  const inputStyle = {
    backgroundColor: theme.canvasColor,
    borderColor: theme.node.border,
    color: theme.node.text,
  };
  const buttonStyle = {
    backgroundColor: theme.node.border,
    color: theme.node.text,
  };
  const accentStyle = {
    backgroundColor: theme.node.selectedBorder,
    color: theme.node.selectedText,
  };
  const kbdStyle = {
    backgroundColor: theme.node.border,
    color: theme.node.text,
  };

  const currentNode = currentNodeId ? getNode(currentNodeId) : null;

  const handleSaveTrail = () => {
    if (trailName.trim()) {
      onSaveTrail(trailName.trim());
      setTrailName('');
    }
  };

  const canStartNewTrail = Boolean(selectedNodeId || currentNodeId);
  const handleStartNewTrail = () => {
    const nodeId = currentNodeId || selectedNodeId;
    if (!nodeId) return;
    onStartNewTrail(nodeId);
  };

  const handleShowAllTrails = () => {
    onSetSelectedTrailIds(trailHistory.map((trail) => trail.id));
    onSetShowActiveTrailLine(true);
  };

  const handleHideAllTrails = () => {
    onSetSelectedTrailIds([]);
    onSetShowActiveTrailLine(false);
  };

  const truncateText = (text: string, maxLen: number = 40) => {
    const clean = text.replace(/<[^>]*>/g, '').trim();
    return clean.length > maxLen ? clean.slice(0, maxLen) + '...' : clean;
  };

  const trailColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f97316'];
  const activeTrailColor = '#f59e0b';

  const handleResumeTrail = (trailId: string) => {
    onResumeTrail(trailId);
    onSetShowActiveTrailLine(true);
  };

  const handleToggleTrail = (trailId: string, isActive: boolean) => {
    if (isActive) {
      onSetShowActiveTrailLine(!showActiveTrailLine);
      return;
    }
    onToggleTrailSelection(trailId);
  };

  return (
    <div
      className="fixed left-0 top-0 h-full w-80 z-50 border-r-2 shadow-2xl overflow-hidden flex flex-col"
      style={panelStyle}
    >
      {/* Header */}
      <div
        className="sticky top-0 backdrop-blur-sm p-4 border-b flex items-center justify-between"
        style={{ backgroundColor: theme.node.bg, borderColor: theme.node.border }}
      >
        <h2 className="font-semibold text-lg">Vandring</h2>
        <button
          onClick={onClose}
          className="opacity-60 hover:opacity-100 text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Wandering Toggle */}
        <div className="p-3 rounded-lg border" style={sectionStyle}>
          {!isWandering ? (
            <div className="space-y-2">
              <p className="text-sm opacity-70">
                {selectedNodeId ? 'Tryck för att börja vandra från markerat kort' : 'Markera ett kort och tryck W för att vandra'}
              </p>
              {selectedNodeId && (
                <button
                  onClick={() => onStartWandering(selectedNodeId)}
                  className="w-full py-2 px-4 rounded font-medium transition-opacity hover:opacity-90"
                  style={accentStyle}
                >
                  Börja vandra
                </button>
              )}
              <button
                onClick={handleStartNewTrail}
                disabled={!canStartNewTrail}
                className="w-full py-2 px-4 rounded font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                style={buttonStyle}
              >
                Ny stig
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: theme.node.selectedBorder }}>Vandring aktiv</span>
                <button
                  onClick={onStopWandering}
                  className="px-3 py-1 rounded text-sm transition-opacity hover:opacity-80"
                  style={buttonStyle}
                >
                  Avsluta
                </button>
              </div>
              <button
                onClick={handleStartNewTrail}
                disabled={!canStartNewTrail}
                className="w-full py-2 px-4 rounded font-medium transition-opacity hover:opacity-90 disabled:opacity-40"
                style={buttonStyle}
              >
                Ny stig från nuvarande
              </button>
              {currentNode && (
                <p className="text-xs opacity-70">
                  Nu på: {truncateText(currentNode.content, 30)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="space-y-3">
          <div>
            <label className="text-xs opacity-70 block mb-1">
              Min. likhet: {Math.round(minSimilarityThreshold * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={minSimilarityThreshold * 100}
              onChange={(e) => onSetThreshold(Number(e.target.value) / 100)}
              className="w-full"
            />
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyDifferentWords}
              onChange={onToggleSurfaceDifference}
              className="rounded"
            />
            <span>Visa oväntade kopplingar</span>
          </label>

          {/* Color Mode Toggle */}
          <div className="pt-2 border-t" style={{ borderColor: theme.node.border }}>
            <label className="text-xs opacity-70 block mb-2">Färgläge</label>
            <div className="flex gap-2">
              <button
                onClick={() => onSetColorMode('similarity')}
                className="flex-1 py-1.5 px-3 rounded text-xs font-medium transition-opacity hover:opacity-90"
                style={colorMode === 'similarity' ? accentStyle : buttonStyle}
              >
                Likhet
              </button>
              <button
                onClick={() => onSetColorMode('semantic')}
                className="flex-1 py-1.5 px-3 rounded text-xs font-medium transition-opacity hover:opacity-90"
                style={colorMode === 'semantic' ? accentStyle : buttonStyle}
              >
                Tema
              </button>
            </div>
            {colorMode === 'semantic' && (
              <div className="mt-2 text-xs opacity-60 space-y-1">
                <div className="flex flex-wrap gap-1">
                  {Object.entries(SEMANTIC_THEME_COLORS).map(([key, color]) => (
                    <span
                      key={key}
                      className="px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: color, color: '#fff' }}
                    >
                      {key === 'existential' ? 'filosofi' :
                       key === 'practical' ? 'praktik' :
                       key === 'creative' ? 'kreativ' :
                       key === 'analytical' ? 'analys' :
                       key === 'emotional' ? 'känsla' : 'neutral'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Gravitating Nodes */}
        {isWandering && gravitatingNodes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium opacity-70">Graviterar ({gravitatingNodes.length})</h3>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {gravitatingNodes.slice(0, 9).map((gn, index) => {
                const node = getNode(gn.nodeId);
                if (!node) return null;
                return (
                  <button
                    key={gn.nodeId}
                    onClick={() => onStepTo(gn.nodeId)}
                    className="w-full text-left p-2 rounded text-sm flex items-center gap-2 transition-opacity hover:opacity-90"
                    style={buttonStyle}
                  >
                    <span className="text-xs opacity-50 w-4">{index + 1}</span>
                    <span className="flex-1 truncate">{truncateText(node.content, 25)}</span>
                    <span className="text-xs opacity-50">{Math.round(gn.similarity * 100)}%</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Active Trail */}
        {activeTrail && (
          <div className="p-3 rounded-lg border space-y-2" style={sectionStyle}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Aktuell stig</h3>
              <span className="text-xs opacity-50">{activeTrail.waypoints.length} steg</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="opacity-60">Linje</span>
              <button
                onClick={() => onSetShowActiveTrailLine(!showActiveTrailLine)}
                className="px-2 py-0.5 rounded transition-opacity hover:opacity-90"
                style={showActiveTrailLine ? accentStyle : buttonStyle}
              >
                {showActiveTrailLine ? 'På' : 'Av'}
              </button>
            </div>

            <div className="space-y-1 max-h-32 overflow-y-auto">
              {activeTrail.waypoints.map((wp, index) => {
                const node = getNode(wp.nodeId);
                const isVisited = visitedNodeIds.has(wp.nodeId);
                const isCurrent = wp.nodeId === currentNodeId;
                const isFirst = index === 0;
                const isLast = index === activeTrail.waypoints.length - 1;
                return (
                  <div
                    key={`${wp.nodeId}-${index}`}
                    className={`text-xs p-1 rounded ${!isCurrent && isVisited ? 'opacity-50' : ''}`}
                    style={isCurrent ? { backgroundColor: `${theme.node.selectedBorder}33` } : undefined}
                  >
                    <div className="flex items-center gap-2">
                      <span className="opacity-50">{index + 1}.</span>
                      <span className="flex-1 truncate">
                        {node ? truncateText(node.content, 25) : '...'}
                        {isCurrent && <span className="ml-1">←</span>}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onMoveWaypoint(activeTrail.id, index, index - 1)}
                          disabled={isFirst}
                          className="px-1 rounded text-[10px] transition-opacity hover:opacity-90 disabled:opacity-30"
                          style={buttonStyle}
                          title="Flytta upp"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => onMoveWaypoint(activeTrail.id, index, index + 1)}
                          disabled={isLast}
                          className="px-1 rounded text-[10px] transition-opacity hover:opacity-90 disabled:opacity-30"
                          style={buttonStyle}
                          title="Flytta ned"
                        >
                          ↓
                        </button>
                        <button
                          onClick={() => onRemoveWaypoint(activeTrail.id, index)}
                          disabled={activeTrail.waypoints.length <= 1}
                          className="px-1 rounded text-[10px] transition-opacity hover:opacity-90 disabled:opacity-30"
                          style={buttonStyle}
                          title="Ta bort steg"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2">
              <button
                onClick={onBacktrack}
                disabled={activeTrail.waypoints.length <= 1}
                className="flex-1 py-1 px-2 rounded text-xs transition-opacity hover:opacity-90 disabled:opacity-30"
                style={buttonStyle}
              >
                ← Backa
              </button>
              <button
                onClick={onBranchHere}
                className="flex-1 py-1 px-2 rounded text-xs transition-opacity hover:opacity-90"
                style={buttonStyle}
              >
                Förgrena
              </button>
            </div>

            {/* Save Trail */}
            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={trailName}
                onChange={(e) => setTrailName(e.target.value)}
                placeholder="Namn på stig..."
                className="flex-1 px-2 py-1 rounded text-xs border"
                style={inputStyle}
              />
              <button
                onClick={handleSaveTrail}
                disabled={!trailName.trim()}
                className="px-3 py-1 rounded text-xs transition-opacity hover:opacity-90 disabled:opacity-30"
                style={accentStyle}
              >
                Spara
              </button>
            </div>
          </div>
        )}

        {/* Trail History */}
        {trailHistory.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium opacity-70">Sparade stigar</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShowAllTrails}
                  className="text-xs opacity-60 hover:opacity-100"
                >
                  Visa alla
                </button>
                <button
                  onClick={handleHideAllTrails}
                  className="text-xs opacity-60 hover:opacity-100"
                >
                  Dölj alla
                </button>
                {selectedTrailIds.length > 0 && (
                  <button
                    onClick={onClearTrailSelection}
                    className="text-xs opacity-60 hover:opacity-100"
                  >
                    Rensa
                  </button>
                )}
              </div>
            </div>
            <p className="text-xs opacity-50">Klicka på raden för att visa/dölja linjen.</p>
            <div className="space-y-2">
              {trailHistory.slice(0, 10).map((trail) => {
                const selectedIndex = selectedTrailIds.indexOf(trail.id);
                const isActive = activeTrail?.id === trail.id;
                const isSelected = isActive ? showActiveTrailLine : selectedIndex >= 0;
                const selectionColor = isActive
                  ? activeTrailColor
                  : selectedIndex >= 0
                    ? trailColors[selectedIndex % trailColors.length]
                    : null;
                const trailColor = isActive ? activeTrailColor : (selectionColor ?? theme.node.border);
                return (
                  <div
                    key={trail.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleToggleTrail(trail.id, isActive)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleTrail(trail.id, isActive);
                      }
                    }}
                    className="flex items-center gap-2 p-2 rounded border transition-colors"
                    style={{
                      backgroundColor: isSelected ? `${trailColor}1a` : theme.canvasColor,
                      borderColor: isSelected ? trailColor : theme.node.border,
                      boxShadow: isSelected ? `0 0 10px ${trailColor}40` : undefined,
                    }}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="h-1.5 w-6 rounded-full"
                        style={{
                          backgroundColor: isSelected ? trailColor : theme.node.border,
                          opacity: isSelected ? 1 : 0.4,
                        }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm truncate">
                          {trail.name}
                          {isActive && (
                            <span className="ml-2 text-xs opacity-60" style={{ color: activeTrailColor }}>
                              aktiv
                            </span>
                          )}
                        </div>
                        <div className="text-xs opacity-50">
                          {trail.waypoints.length} steg
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectTrailNodes(trail.id);
                        }}
                        className="px-2 py-1 rounded text-xs transition-opacity hover:opacity-90"
                        style={buttonStyle}
                        title="Markera alla kort"
                      >
                        Markera
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResumeTrail(trail.id);
                        }}
                        className="px-2 py-1 rounded text-xs transition-opacity hover:opacity-90"
                        style={buttonStyle}
                        title="Fortsätt vandra"
                      >
                        Följ
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteTrail(trail.id);
                        }}
                        className="px-2 py-1 rounded text-xs transition-opacity hover:opacity-90"
                        style={buttonStyle}
                        title="Ta bort"
                      >
                        Ta bort
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t text-xs opacity-50" style={{ borderColor: theme.node.border }}>
        <kbd className="px-1 rounded" style={kbdStyle}>W</kbd> öppna/stäng •
        <kbd className="px-1 rounded ml-1" style={kbdStyle}>[</kbd> backa
      </div>
    </div>
  );
};
