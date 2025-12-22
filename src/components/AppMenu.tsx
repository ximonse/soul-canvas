// src/components/AppMenu.tsx
import type { Theme } from '../themes';

interface AppMenuProps {
  hasFile: boolean;
  saveStatus: 'idle' | 'waiting' | 'saving' | 'saved';
  theme: Theme;
  zenMode: boolean;
  onConnect: () => void;
  onSave: () => void;
}

export const AppMenu = ({
  hasFile, saveStatus, zenMode,
  onConnect, onSave
}: AppMenuProps) => {

  return (
    <nav
      className={`absolute top-6 left-6 z-50 transition-opacity duration-500
      ${zenMode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
      onMouseDown={(e) => e.stopPropagation()}
      aria-label="Main menu"
    >
      {!hasFile ? (
        <button
          onClick={onConnect}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 font-semibold"
          title="Single-click to select your folder, don't double-click"
          aria-label="Connect to folder"
        >
          Connect Soul
        </button>
      ) : (
        <button
          onClick={onSave}
          className="w-4 h-4 rounded-full cursor-pointer transition-all hover:scale-150"
          style={{
            backgroundColor:
              saveStatus === 'idle' ? 'rgba(128, 128, 128, 0.3)' :
              saveStatus === 'waiting' ? '#eab308' :
              saveStatus === 'saving' ? '#3b82f6' :
              '#22c55e',
            boxShadow: saveStatus !== 'idle' ? `0 0 8px currentColor` : 'none',
          }}
          title="Spara manuellt (Ctrl+Enter)"
          aria-label={`Save. Status: ${saveStatus}`}
        />
      )}
    </nav>
  );
};