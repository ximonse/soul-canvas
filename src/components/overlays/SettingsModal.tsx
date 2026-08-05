// src/components/overlays/SettingsModal.tsx
// Tema-aware settings modal with serif font and larger text

import { useState } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import type { Theme } from '../../themes';
import { GEMINI_OCR_MODELS } from '../../utils/gemini';
import { FEATURE_FLAGS, setFeatureFlag } from '../../utils/featureFlags';
import { connectOmnicalFolder, disconnectOmnicalFolder, syncOmnicalNotes } from '../../utils/omnicalSync';

interface SettingsModalProps {
  onClose: () => void;
  theme: Theme;
}

export function SettingsModal({ onClose, theme }: SettingsModalProps) {
  const geminiKey = useBrainStore((state) => state.geminiKey);
  const geminiOcrModel = useBrainStore((state) => state.geminiOcrModel);
  const openaiKey = useBrainStore((state) => state.openaiKey);
  const claudeKey = useBrainStore((state) => state.claudeKey);
  const setApiKey = useBrainStore((state) => state.setApiKey);
  const setGeminiOcrModel = useBrainStore((state) => state.setGeminiOcrModel);
  const [showKeys, setShowKeys] = useState(false);
  const [logChatTokens, setLogChatTokens] = useState(FEATURE_FLAGS.logChatTokens);
  const [logChatPayload, setLogChatPayload] = useState(FEATURE_FLAGS.logChatPayload);
  const [enableWanderingTrails, setEnableWanderingTrails] = useState(FEATURE_FLAGS.enableWanderingTrails);
  const [enableGraphGravityControls, setEnableGraphGravityControls] = useState(FEATURE_FLAGS.enableGraphGravityControls);
  const [enableOmnicalSharedNotes, setEnableOmnicalSharedNotes] = useState(FEATURE_FLAGS.enableOmnicalSharedNotes);
  const omnicalSyncStatus = useBrainStore((state) => state.omnicalSyncStatus);
  const omnicalSyncMessage = useBrainStore((state) => state.omnicalSyncMessage);
  const pendingOmnicalCount = useBrainStore((state) => state.omnical.pendingFiles.length);
  const omnicalConflictCount = useBrainStore((state) => state.omnicalConflicts.length);

  return (
    <div
      className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm font-serif text-base"
      onMouseDown={onClose}
    >
      <div
        className="p-8 rounded-2xl shadow-2xl w-[500px] max-h-[80vh] overflow-y-auto"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
        }}
        onMouseDown={e => e.stopPropagation()}
      >
        <h2 className="text-2xl mb-6 font-bold">Inställningar</h2>

        <div className="space-y-4">
          <button
            onClick={() => setShowKeys(!showKeys)}
            className="flex items-center justify-between w-full p-3 rounded text-left font-semibold transition-colors hover:bg-black/10"
            style={{ border: `1px solid ${theme.node.border}` }}
          >
            <span>API-nycklar</span>
            <span className={`transform transition-transform ${showKeys ? 'rotate-180' : ''}`}>▼</span>
          </button>
          
          {showKeys && (
            <div className="space-y-4 p-4 rounded bg-black/5">
              <div>
                <label className="block text-sm mb-2 opacity-80">
                  Gemini API Key (OCR & Bildanalys)
                </label>
                <input
                  type="password"
                  value={geminiKey || ''}
                  onChange={e => setApiKey('gemini', e.target.value)}
                  className="w-full bg-black/20 border rounded p-3"
                  style={{ borderColor: theme.node.border, color: theme.node.text }}
                  placeholder="AIza..."
                />
              </div>

              <div>
                <label className="block text-sm mb-2 opacity-80">
                  Gemini OCR-modell
                </label>
                <select
                  value={geminiOcrModel || GEMINI_OCR_MODELS[0]}
                  onChange={(e) => setGeminiOcrModel(e.target.value)}
                  className="w-full bg-black/20 border rounded p-3"
                  style={{ borderColor: theme.node.border, color: theme.node.text }}
                >
                  {GEMINI_OCR_MODELS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2 opacity-80">
                  OpenAI API Key (Embeddings & Semantisk sökning)
                </label>
                <input
                  type="password"
                  value={openaiKey || ''}
                  onChange={e => setApiKey('openai', e.target.value)}
                  className="w-full bg-black/20 border rounded p-3"
                  style={{ borderColor: theme.node.border, color: theme.node.text }}
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="block text-sm mb-2 opacity-80">
                  Claude API Key (AI Reflektion & Frågor)
                </label>
                <input
                  type="password"
                  value={claudeKey || ''}
                  onChange={e => setApiKey('claude', e.target.value)}
                  className="w-full bg-black/20 border rounded p-3"
                  style={{ borderColor: theme.node.border, color: theme.node.text }}
                  placeholder="sk-ant-..."
                />
              </div>
            </div>
          )}

          <div className="space-y-3 p-4 rounded bg-black/5">
            <label className="flex items-center justify-between gap-4 text-sm font-semibold">
              <span>Delade Omnical-anteckningar (experiment)</span>
              <input
                type="checkbox"
                checked={enableOmnicalSharedNotes}
                onChange={(e) => {
                  const next = e.target.checked;
                  setEnableOmnicalSharedNotes(next);
                  setFeatureFlag('enableOmnicalSharedNotes', next);
                }}
              />
            </label>
            {enableOmnicalSharedNotes && (
              <>
                <p className="text-xs opacity-70">
                  Anslut själva Omnical-mappen. Soul-mappen och dess data.json förblir separata.
                </p>
                <div className="flex flex-wrap gap-2">
                  {omnicalSyncStatus === 'disconnected' ? (
                    <button
                      type="button"
                      onClick={() => void connectOmnicalFolder()}
                      className="px-3 py-2 rounded text-sm font-semibold"
                      style={{ backgroundColor: theme.node.selectedBorder, color: theme.node.bg }}
                    >
                      Anslut Omnical-mapp
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={omnicalSyncStatus === 'syncing'}
                        onClick={() => void syncOmnicalNotes()}
                        className="px-3 py-2 rounded text-sm font-semibold disabled:opacity-50"
                        style={{ backgroundColor: theme.node.selectedBorder, color: theme.node.bg }}
                      >
                        {omnicalSyncStatus === 'syncing' ? 'Synkar…' : 'Synka nu'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void disconnectOmnicalFolder()}
                        className="px-3 py-2 rounded text-sm"
                        style={{ border: '1px solid ' + theme.node.border }}
                      >
                        Koppla från
                      </button>
                    </>
                  )}
                </div>
                <div className="text-xs opacity-75">
                  {omnicalSyncMessage || 'Inte ansluten.'}
                  {pendingOmnicalCount > 0 ? ' Väntar på Omnical: ' + pendingOmnicalCount + '.' : ''}
                  {omnicalConflictCount > 0 ? ' Konflikter: ' + omnicalConflictCount + '.' : ''}
                </div>
              </>
            )}
          </div>

          <div className="space-y-3 p-4 rounded bg-black/5">
            <div className="text-sm font-semibold">Debug</div>
            <label className="flex items-center justify-between text-sm">
              <span>Token-loggning (AI)</span>
              <input
                type="checkbox"
                checked={logChatTokens}
                onChange={(e) => {
                  const next = e.target.checked;
                  setLogChatTokens(next);
                  setFeatureFlag('logChatTokens', next);
                }}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Logga payload (meddelanden)</span>
              <input
                type="checkbox"
                checked={logChatPayload}
                onChange={(e) => {
                  const next = e.target.checked;
                  setLogChatPayload(next);
                  setFeatureFlag('logChatPayload', next);
                }}
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>Wandering/trails (experiment)</span>
              <input
                type="checkbox"
                checked={enableWanderingTrails}
                onChange={(e) => {
                  const next = e.target.checked;
                  setEnableWanderingTrails(next);
                  setFeatureFlag('enableWanderingTrails', next);
                }}
              />
            </label>
            <label className="flex items-center justify-between gap-4 text-sm">
              <span>Graph gravity/layout (experiment)</span>
              <input
                type="checkbox"
                checked={enableGraphGravityControls}
                onChange={(e) => {
                  const next = e.target.checked;
                  setEnableGraphGravityControls(next);
                  setFeatureFlag('enableGraphGravityControls', next);
                }}
              />
            </label>
            <div className="flex items-center justify-between text-xs opacity-70">
              <span>Status</span>
              <span>
                Tokens: {logChatTokens ? 'On' : 'Off'} · Payload: {logChatPayload ? 'On' : 'Off'}
              </span>
            </div>
            <div className="text-xs opacity-70">
              Experimenten är avstängda som standard för stabil lokal v1.
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded mt-6 transition font-semibold"
          style={{ backgroundColor: theme.node.selectedBorder, color: theme.node.text }}
        >
          Stäng
        </button>
      </div>
    </div>
  );
}
