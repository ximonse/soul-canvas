// src/components/AIPanel.tsx
import { useState } from 'react';
import { useAIPanelActions } from '../hooks/useAIPanelActions';
import { APIKeyStatus } from './ai';
import type { Theme } from '../themes';

interface AIPanelProps {
  theme: Theme;
  onClose: () => void;
  onDiscussReflection?: (reflection: string) => void;
}

// Steg-sektion med nummer och rubrik
const StepSection = ({
  step,
  title,
  children
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) => (
  <div className="mb-4">
    <div className="flex items-center gap-2 mb-2">
      <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
        {step}
      </span>
      <span className="text-white font-medium text-sm">{title}</span>
    </div>
    <div className="pl-8">
      {children}
    </div>
  </div>
);

export const AIPanel = ({ theme, onClose, onDiscussReflection }: AIPanelProps) => {
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    clusterInsight,
    showReflection,
    setShowReflection,
    status: _status,
    selectedCount,
    embeddedCount,
    totalCount,
    handleEmbedAll,
    handleAutoLink,
    handleReflect,
    handleAnalyzeCluster,
    handleSearch,
    handleGenerateTags,
    intelligence,
    store,
  } = useAIPanelActions();

  const [showTools, setShowTools] = useState(false);

  // Beräkna synliga kopplingar baserat på threshold
  const visibleSynapseCount = store.synapses.filter(
    s => (s.similarity || 1) >= (store.synapseVisibilityThreshold || 0)
  ).length;
  const totalSynapseCount = store.synapses.length;

  return (
    <div
      className="fixed left-0 top-0 h-full w-80 z-50 border-r shadow-2xl overflow-y-auto"
      style={{
        backgroundColor: theme.node.bg + 'f2',
        borderColor: theme.node.border,
        color: theme.node.text,
      }}
      role="dialog"
      aria-modal="false"
      aria-labelledby="ai-panel-title"
    >
      {/* Header */}
      <header
        className="sticky top-0 backdrop-blur-sm p-4 border-b flex items-center justify-between"
        style={{
          backgroundColor: theme.node.bg + 'f0',
          borderColor: theme.node.border,
        }}
      >
        <h2 id="ai-panel-title" className="text-lg font-bold flex items-center gap-2">
          🧠 Intelligent Motor
        </h2>
        <button
          onClick={onClose}
          className="opacity-60 hover:opacity-100 text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-white/10"
          aria-label="Close AI panel"
        >
          ×
        </button>
      </header>

      <div className="p-4">
        {/* Status */}
        <div className="bg-black/30 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400">Vektorer:</span>
            <span className="text-white font-mono">{embeddedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (embeddedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          {intelligence.isProcessing && (
            <div className="mt-2 text-xs text-purple-400 animate-pulse">
              Bearbetar... {intelligence.progress.current}/{intelligence.progress.total}
            </div>
          )}
          <APIKeyStatus openaiKey={!!store.openaiKey} claudeKey={!!store.claudeKey} />
        </div>

        {/* STEG 1: FÖRBERED */}
        <StepSection step={1} title="Förbered">
          <button
            onClick={handleEmbedAll}
            disabled={intelligence.isProcessing || !store.openaiKey || embeddedCount === totalCount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded text-sm transition"
          >
            {embeddedCount === totalCount ? '✓ Alla har vektorer' : `Skapa vektorer (${totalCount - embeddedCount} kvar)`}
          </button>
          {!store.openaiKey && (
            <p className="text-xs text-yellow-400 mt-1">⚠️ OpenAI-nyckel saknas</p>
          )}
        </StepSection>

        {/* STEG 2: KOPPLA */}
        <StepSection step={2} title="Koppla">
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Minsta likhet</span>
              <span className="text-white font-mono">{Math.round((store.autoLinkThreshold || 0.75) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={store.autoLinkThreshold || 0.75}
              onChange={e => store.setAutoLinkThreshold(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Lägre = fler kopplingar</p>
          </div>

          <div className="flex items-center justify-between mb-3 p-2 bg-black/20 rounded">
            <span className="text-gray-300 text-sm">Auto-länkning</span>
            <div className="flex gap-1">
              <button
                onClick={() => store.enableAutoLink && store.toggleAutoLink()}
                className={`px-2 py-1 rounded text-xs transition ${
                  !store.enableAutoLink ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Manuellt
              </button>
              <button
                onClick={() => !store.enableAutoLink && store.toggleAutoLink()}
                className={`px-2 py-1 rounded text-xs transition ${
                  store.enableAutoLink ? 'bg-green-600 text-white' : 'bg-gray-800 text-gray-400'
                }`}
              >
                Auto
              </button>
            </div>
          </div>

          <button
            onClick={handleAutoLink}
            disabled={intelligence.isProcessing || embeddedCount < 2}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded text-sm transition"
          >
            Hitta & Länka nu
          </button>
          {embeddedCount < 2 && (
            <p className="text-xs text-yellow-400 mt-1">ℹ️ Skapa vektorer först</p>
          )}
          {totalSynapseCount > 0 && (
            <p className="text-xs text-green-400 mt-1">✓ {totalSynapseCount} kopplingar skapade</p>
          )}
        </StepSection>

        {/* STEG 3: VISA */}
        <StepSection step={3} title="Visa">
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Filtrera</span>
              <span className="text-white font-mono">{Math.round((store.synapseVisibilityThreshold || 0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.95"
              step="0.05"
              value={store.synapseVisibilityThreshold || 0}
              onChange={e => store.setSynapseVisibilityThreshold(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {totalSynapseCount > 0
                ? `Visar ${visibleSynapseCount} av ${totalSynapseCount} kopplingar`
                : 'Inga kopplingar ännu'
              }
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                const count = intelligence.arrangeAsGraph();
                if (count === 0) alert('Inga kopplingar att visa som graf');
              }}
              disabled={intelligence.isProcessing || totalSynapseCount === 0}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded text-sm transition"
            >
              📊 Graf
            </button>
            <button
              onClick={() => store.setSynapseVisibilityThreshold(0)}
              disabled={store.synapseVisibilityThreshold === 0}
              className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-2 rounded text-sm transition"
            >
              Visa alla
            </button>
          </div>
        </StepSection>

        {/* VERKTYG (hopfällbar) */}
        <div className="mt-4 border-t border-gray-700 pt-4">
          <button
            onClick={() => setShowTools(!showTools)}
            className="w-full flex items-center justify-between text-gray-300 hover:text-white text-sm py-2"
          >
            <span>🛠️ Verktyg</span>
            <span className="text-xs">{showTools ? '▼' : '▸'}</span>
          </button>

          {showTools && (
            <div className="mt-3 space-y-3">
              {/* Semantisk sökning */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">🔍 Konceptuell sökning</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="t.ex. 'existentiell ångest'"
                    className="flex-1 bg-black/50 border border-gray-600 rounded p-2 text-white text-xs"
                    disabled={intelligence.isProcessing || embeddedCount === 0}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={intelligence.isProcessing || !searchQuery.trim() || embeddedCount === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 text-white px-3 py-1 rounded text-xs"
                  >
                    Sök
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <p className="text-xs text-green-400 mt-1">✓ {searchResults.length} resultat markerade</p>
                )}
              </div>

              {/* Auto-tagga */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">🏷️ Semantiska taggar</label>
                <button
                  onClick={handleGenerateTags}
                  disabled={intelligence.isProcessing || selectedCount === 0 || !store.claudeKey}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 text-white py-2 rounded text-xs"
                >
                  {selectedCount > 0 ? `Tagga ${selectedCount} valda` : 'Välj kort först'}
                </button>
                {!store.claudeKey && <p className="text-xs text-yellow-400 mt-1">⚠️ Claude-nyckel saknas</p>}
              </div>

              {/* Reflektion */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">💭 AI Reflektion</label>
                <button
                  onClick={handleReflect}
                  disabled={intelligence.isProcessing || totalCount === 0 || !store.claudeKey}
                  className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-700 text-white py-2 rounded text-xs"
                >
                  {selectedCount > 0 ? `Reflektera (${selectedCount} valda)` : 'Reflektera över allt'}
                </button>
              </div>

              {/* Kluster-analys */}
              {selectedCount >= 2 && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1">🌌 Kluster-analys</label>
                  <button
                    onClick={handleAnalyzeCluster}
                    disabled={intelligence.isProcessing || !store.claudeKey}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white py-2 rounded text-xs"
                  >
                    Analysera {selectedCount} kort
                  </button>
                  {clusterInsight && (
                    <div className="mt-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded text-xs text-orange-200">
                      {clusterInsight}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reflection Modal */}
      {showReflection && intelligence.lastReflection && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-gradient-to-br from-purple-900 to-pink-900 p-8 rounded-2xl shadow-2xl border border-purple-500/50 max-w-md">
            <h3 className="text-xl text-white font-bold mb-4">💭 Reflektion</h3>
            <p className="text-purple-100 text-lg leading-relaxed mb-6">{intelligence.lastReflection.question}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowReflection(false)}
                className="flex-1 bg-white/20 hover:bg-white/30 text-white py-2 rounded transition"
              >
                Stäng
              </button>
              {onDiscussReflection && (
                <button
                  onClick={() => {
                    onDiscussReflection(intelligence.lastReflection!.question);
                    setShowReflection(false);
                  }}
                  className="flex-1 bg-white/30 hover:bg-white/40 text-white py-2 rounded transition font-medium"
                >
                  💬 Diskutera
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
