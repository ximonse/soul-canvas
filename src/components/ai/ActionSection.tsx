// src/components/ai/ActionSection.tsx
// Återanvändbara UI-komponenter för AI-panelen

import React from 'react';

interface ActionSectionProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

export const ActionSection = ({ title, description, children }: ActionSectionProps) => (
  <div className="bg-black/20 rounded-lg p-4">
    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">{title}</h3>
    <p className="text-gray-400 text-sm mb-3">{description}</p>
    {children}
  </div>
);

interface KeyWarningProps {
  keyName: string;
}

export const KeyWarning = ({ keyName }: KeyWarningProps) => (
  <p className="text-xs text-red-400 mt-2">⚠️ Lägg till {keyName} API-nyckel i menyn</p>
);

interface StatusBadgeProps {
  status: { text: string; tone: 'info' | 'success' | 'warn' | 'error' } | null;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  if (!status) return null;

  const toneClasses = {
    success: 'bg-green-500/15 text-green-200 border border-green-500/40',
    warn: 'bg-yellow-500/15 text-yellow-200 border border-yellow-500/40',
    error: 'bg-red-500/15 text-red-200 border border-red-500/40',
    info: 'bg-blue-500/10 text-blue-100 border border-blue-500/30',
  };

  return (
    <div className={`mb-3 text-sm px-3 py-2 rounded ${toneClasses[status.tone]}`}>
      {status.text}
    </div>
  );
};

interface ProgressBarProps {
  current: number;
  total: number;
}

export const ProgressBar = ({ current, total }: ProgressBarProps) => (
  <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
      style={{ width: `${total > 0 ? (current / total) * 100 : 0}%` }}
    />
  </div>
);

interface APIKeyStatusProps {
  openaiKey: boolean;
  claudeKey: boolean;
}

export const APIKeyStatus = ({ openaiKey, claudeKey }: APIKeyStatusProps) => (
  <div className="mt-3 pt-3 border-t border-gray-700 space-y-1">
    <div className="flex items-center gap-2 text-xs">
      <span className={openaiKey ? 'text-green-400' : 'text-red-400'}>
        {openaiKey ? '✓' : '✗'}
      </span>
      <span className="text-gray-400">OpenAI (embeddings & sökning)</span>
    </div>
    <div className="flex items-center gap-2 text-xs">
      <span className={claudeKey ? 'text-green-400' : 'text-red-400'}>
        {claudeKey ? '✓' : '✗'}
      </span>
      <span className="text-gray-400">Claude (taggar & reflektion)</span>
    </div>
  </div>
);
