// src/components/overlays/SettingsModal.tsx
// Tema-aware settings modal with serif font and larger text

import { useState } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import type { Theme } from '../../themes';
import { GEMINI_OCR_MODELS } from '../../utils/gemini';

interface SettingsModalProps {
  onClose: () => void;
  theme: Theme;
}

export function SettingsModal({ onClose, theme }: SettingsModalProps) {
  const store = useBrainStore();
  const [showKeys, setShowKeys] = useState(false);

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
                  value={store.geminiKey || ''}
                  onChange={e => store.setApiKey('gemini', e.target.value)}
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
                  value={store.geminiOcrModel || GEMINI_OCR_MODELS[0]}
                  onChange={(e) => store.setGeminiOcrModel(e.target.value)}
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
                  value={store.openaiKey || ''}
                  onChange={e => store.setApiKey('openai', e.target.value)}
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
                  value={store.claudeKey || ''}
                  onChange={e => store.setApiKey('claude', e.target.value)}
                  className="w-full bg-black/20 border rounded p-3"
                  style={{ borderColor: theme.node.border, color: theme.node.text }}
                  placeholder="sk-ant-..."
                />
              </div>
            </div>
          )}
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
