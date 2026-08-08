import { useState } from 'react';
import { useBrainStore } from '../../store/useBrainStore';
import type { Theme } from '../../themes';
import { resolveOmnicalConflict } from '../../utils/omnicalSync';

interface OmnicalConflictModalProps {
  theme: Theme;
}

export function OmnicalConflictModal({ theme }: OmnicalConflictModalProps) {
  const conflict = useBrainStore((state) => state.omnicalConflicts[0] ?? null);
  const [resolving, setResolving] = useState(false);
  if (!conflict) return null;

  const resolve = async (choice: 'omnical' | 'soul' | 'both') => {
    setResolving(true);
    try {
      await resolveOmnicalConflict(conflict.id, choice);
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[12000] flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div
        className="w-[520px] max-w-[calc(100vw-2rem)] rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: theme.node.bg, color: theme.node.text, border: '1px solid ' + theme.node.border }}
      >
        <h2 className="text-xl font-bold">Konflikt med Omnical</h2>
        <p className="mt-2 text-sm opacity-80">
          Både Canvas och Omnical har ändrat {[
            conflict.fields.includes('body') ? 'texten' : null,
            conflict.fields.includes('tags') ? 'taggarna' : null,
            conflict.fields.includes('meta') ? 'status (klar/arkiverad/område/påminnelse)' : null,
          ].filter(Boolean).join(', ')} sedan senaste synk.
        </p>
        <p className="mt-2 text-xs opacity-60 break-all">{conflict.path}</p>
        <div className="mt-6 grid gap-2">
          <button
            disabled={resolving}
            onClick={() => void resolve('omnical')}
            className="rounded-lg px-4 py-3 text-left disabled:opacity-50"
            style={{ border: '1px solid ' + theme.node.border }}
          >
            <strong>Behåll Omnical</strong>
            <span className="block text-xs opacity-70">Soul-kortets delade text och taggar ersätts.</span>
          </button>
          <button
            disabled={resolving}
            onClick={() => void resolve('soul')}
            className="rounded-lg px-4 py-3 text-left disabled:opacity-50"
            style={{ border: '1px solid ' + theme.node.border }}
          >
            <strong>Behåll Soul</strong>
            <span className="block text-xs opacity-70">Soul-versionen skrivs till Markdown-filen.</span>
          </button>
          <button
            disabled={resolving}
            onClick={() => void resolve('both')}
            className="rounded-lg px-4 py-3 text-left disabled:opacity-50"
            style={{ backgroundColor: theme.node.selectedBorder, color: theme.node.bg }}
          >
            <strong>Behåll båda</strong>
            <span className="block text-xs opacity-80">Omnical behålls länkat och Soul-versionen blir en privat kopia.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
