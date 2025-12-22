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
  textColor,
  children
}: {
  step: number;
  title: string;
  textColor: string;
  children: React.ReactNode;
}) => (
  <div className="mb-4">
    <div className="flex items-center gap-2 mb-2">
      <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
        {step}
      </span>
      <span className="font-medium text-sm" style={{ color: textColor }}>{title}</span>
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
    (s: { similarity?: number }) => (s.similarity || 1) >= (store.synapseVisibilityThreshold || 0)
  ).length;
  const totalSynapseCount = store.synapses.length;

  // Helper styles for inputs/panels based on theme darkness
  const isDarkTheme = theme.bg.includes('black') || theme.bg.includes('gray-9') || theme.bg.includes('#050505') || theme.bg.includes('#30362f') || theme.bg.includes('#1f2937');
  
  const panelBg = isDarkTheme ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.05)';
  const inputBg = isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.8)';
  const inputBorder = isDarkTheme ? 'border-gray-600' : 'border-gray-300';
  const subTextColor = isDarkTheme ? '#e5e7eb' : '#1f2937';

  return (
    <div
      className="fixed left-0 top-0 h-full w-80 z-50 border-r shadow-2xl overflow-y-auto"
      style={{
        backgroundColor: theme.node.bg, // Removed transparency for better contrast consistency
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
          backgroundColor: theme.node.bg, // Match panel bg
          borderColor: theme.node.border,
        }}
      >
        <h2 id="ai-panel-title" className="text-lg font-bold flex items-center gap-2">
          🧠 Intelligent Motor
        </h2>
        <button
          onClick={onClose}
          className="opacity-60 hover:opacity-100 text-xl w-8 h-8 flex items-center justify-center rounded hover:bg-black/10 dark:hover:bg-white/10"
          aria-label="Close AI panel"
        >
          ×
        </button>
      </header>

      <div className="p-4">
        {/* Status */}
        <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: panelBg }}>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-sm" style={{ color: subTextColor }}>Vektorer:</span>
            <span className="font-mono" style={{ color: theme.node.text }}>{embeddedCount}/{totalCount}</span>
          </div>
          <div className="w-full h-2 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-300"
              style={{ width: `${totalCount > 0 ? (embeddedCount / totalCount) * 100 : 0}%` }}
            />
          </div>
          {intelligence.isProcessing && (
            <div className="mt-2 text-xs text-purple-500 font-medium animate-pulse">
              Bearbetar... {intelligence.progress.current}/{intelligence.progress.total}
            </div>
          )}
          <APIKeyStatus openaiKey={!!store.openaiKey} claudeKey={!!store.claudeKey} />
        </div>

        {/* STEG 1: VEKTORISERA */}
        <StepSection step={1} title="Vektorisera" textColor={theme.node.text}>
          <button
            onClick={handleEmbedAll}
            disabled={intelligence.isProcessing || !store.openaiKey || embeddedCount === totalCount}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 rounded text-sm transition font-medium"
          >
            {embeddedCount === totalCount && totalCount > 0
              ? '✓ Alla har vektorer'
              : `Skapa vektorer (${totalCount - embeddedCount} kvar)`}
          </button>
          {!store.openaiKey && (
            <p className="text-xs text-amber-600 dark:text-yellow-400 mt-1 font-medium">⚠️ OpenAI-nyckel saknas</p>
          )}
          {store.enableAutoLink && (
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Nya kort länkas automatiskt</p>
          )}
          {totalSynapseCount > 0 && (
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">🔗 {totalSynapseCount} kopplingar</p>
          )}
        </StepSection>

        {/* STEG 2: VISA */}
        <StepSection step={2} title="Visa kopplingar" textColor={theme.node.text}>
          {/* Slider: Kopplingsstryka (minsta likhet för att skapa koppling) */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: subTextColor }}>
              <span style={{ color: subTextColor }}>Kopplingsstryka</span>
              <span className="font-mono" style={{ color: theme.node.text }}>{Math.round((store.autoLinkThreshold || 0.75) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="0.95"
              step="0.05"
              value={store.autoLinkThreshold || 0.75}
              onChange={e => store.setAutoLinkThreshold(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500 bg-gray-300 dark:bg-gray-700"
            />
            <p className="text-xs mt-1" style={{ color: subTextColor }}>Lägre = fler kopplingar</p>
          </div>

          {/* Slider: Synlighet (filtrera befintliga kopplingar) */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span style={{ color: subTextColor }}>Synlighet</span>
              <span className="font-mono" style={{ color: theme.node.text }}>≥{Math.round((store.synapseVisibilityThreshold || 0) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="0.95"
              step="0.05"
              value={store.synapseVisibilityThreshold || 0}
              onChange={e => store.setSynapseVisibilityThreshold(parseFloat(e.target.value))}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-purple-500 bg-gray-300 dark:bg-gray-700"
            />
            <p className="text-xs mt-1" style={{ color: subTextColor }}>
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
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white py-2 rounded text-sm transition font-medium"
            >
              📊 Graf
            </button>
            <button
              onClick={() => store.setSynapseVisibilityThreshold(0)}
              disabled={store.synapseVisibilityThreshold === 0}
              className="flex-1 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white py-2 rounded text-sm transition font-medium"
            >
              Visa alla
            </button>
          </div>
        </StepSection>

        {/* VERKTYG (hopfällbar) */}
        <div className="mt-4 border-t pt-4" style={{ borderColor: theme.node.border }}>
          <button
            onClick={() => setShowTools(!showTools)}
            className="w-full flex items-center justify-between hover:opacity-80 text-sm py-2"
            style={{ color: theme.node.text }}
          >
            <span>🛠️ Verktyg</span>
            <span className="text-xs">{showTools ? '▼' : '▸'}</span>
          </button>

          {showTools && (
            <div className="mt-3 space-y-3">
              {/* Semantisk sökning */}
              <div>
                <label className="block text-xs mb-1" style={{ color: subTextColor }}>🔍 Konceptuell sökning</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                    placeholder="t.ex. 'existentiell ångest'"
                    className={`flex-1 rounded p-2 text-xs border ${inputBorder}`}
                    style={{ backgroundColor: inputBg, color: theme.node.text }}
                    disabled={intelligence.isProcessing || embeddedCount === 0}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={intelligence.isProcessing || !searchQuery.trim() || embeddedCount === 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-xs font-medium"
                  >
                    Sök
                  </button>
                </div>
                {searchResults.length > 0 && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ {searchResults.length} resultat markerade</p>
                )}
              </div>

              {/* Auto-tagga */}
              <div>
                <label className="block text-xs mb-1" style={{ color: subTextColor }}>🏷️ Semantiska taggar</label>
                <button
                  onClick={handleGenerateTags}
                  disabled={intelligence.isProcessing || selectedCount === 0 || !store.claudeKey}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white py-2 rounded text-xs font-medium"
                >
                  {selectedCount > 0 ? `Tagga ${selectedCount} valda` : 'Välj kort först'}
                </button>
                {!store.claudeKey && <p className="text-xs text-amber-600 dark:text-yellow-400 mt-1">⚠️ Claude-nyckel saknas</p>}
              </div>

              {/* Reflektion */}
              <div>
                <label className="block text-xs mb-1" style={{ color: subTextColor }}>💭 AI Reflektion</label>
                <button
                  onClick={handleReflect}
                  disabled={intelligence.isProcessing || totalCount === 0 || !store.claudeKey}
                  className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white py-2 rounded text-xs font-medium"
                >
                  {selectedCount > 0 ? `Reflektera (${selectedCount} valda)` : 'Reflektera över allt'}
                </button>
              </div>

              {/* Kluster-analys */}
              {selectedCount >= 2 && (
                <div>
                  <label className="block text-xs mb-1" style={{ color: subTextColor }}>🌌 Kluster-analys</label>
                  <button
                    onClick={handleAnalyzeCluster}
                    disabled={intelligence.isProcessing || !store.claudeKey}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white py-2 rounded text-xs font-medium"
                  >
                    Analysera {selectedCount} kort
                  </button>
                  {clusterInsight && (
                    <div className="mt-2 p-2 bg-orange-100 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/30 rounded text-xs text-orange-800 dark:text-orange-200">
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
