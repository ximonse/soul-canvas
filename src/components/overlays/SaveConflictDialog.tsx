// src/components/overlays/SaveConflictDialog.tsx
// Shown when saveFile() detects that data.json was written by another
// device (e.g. via OneDrive/Google Drive sync) since we last read it.
import type { Theme } from '../../themes';
import type { SaveConflictInfo } from '../../hooks/useFileSystem';

interface SaveConflictDialogProps {
  conflict: SaveConflictInfo;
  theme: Theme;
  onResolve: (action: 'overwrite' | 'reload') => void;
}

export function SaveConflictDialog({ conflict, theme, onResolve }: SaveConflictDialogProps) {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm font-serif text-base">
      <div
        className="p-8 rounded-2xl shadow-2xl w-[480px]"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
        }}
      >
        <h2 className="text-2xl mb-4 font-bold">Canvasen ändrades någon annanstans</h2>
        <p className="mb-3 opacity-90">
          Den här mappens <code>data.json</code> ändrades av en annan enhet sedan du senast öppnade den här —
          troligen synkat via OneDrive eller Google Drive.
        </p>
        <p className="mb-6 opacity-90">
          Den andra versionen sparades som en säkerhetskopia:{' '}
          <code className="opacity-80">{conflict.backupFilename}</code>
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => onResolve('reload')}
            className="w-full p-3 rounded font-semibold transition-colors hover:bg-black/10"
            style={{ border: `1px solid ${theme.node.border}` }}
          >
            Ladda om från disk
            <div className="text-sm font-normal opacity-70 mt-1">
              Dina osparade ändringar här går förlorade. Du fortsätter med den andra enhetens version.
            </div>
          </button>
          <button
            onClick={() => onResolve('overwrite')}
            className="w-full p-3 rounded font-semibold transition-colors hover:bg-black/10"
            style={{ border: `1px solid ${theme.node.border}` }}
          >
            Spara ändå
            <div className="text-sm font-normal opacity-70 mt-1">
              Skriver över med din version. Den andra enhetens ändringar finns kvar i säkerhetskopian.
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
