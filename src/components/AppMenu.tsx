// src/components/AppMenu.tsx
// HÄR VAR FELET: Vi måste lägga till 'type'
import type { Theme } from '../themes';

interface AppMenuProps {
  hasFile: boolean;
  saveStatus: 'idle' | 'waiting' | 'saving' | 'saved';
  theme: Theme;
  themeName: string;
  zenMode: boolean;
  onConnect: () => void;
  onSave: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export const AppMenu = ({ 
  hasFile, saveStatus, theme, themeName, zenMode, 
  onConnect, onSave, onToggleTheme, onOpenSettings 
}: AppMenuProps) => {
  
  return (
    <nav
      className={`absolute top-6 left-6 z-50 flex gap-4 backdrop-blur-sm p-2 transition-opacity duration-500
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
        <>
          <button
            onClick={onSave}
            className={`px-4 py-2 rounded-lg text-sm border flex items-center gap-3 transition-all min-w-[90px] justify-center ${theme.button}`}
            title="Spara manuellt (Ctrl+Enter)"
            aria-label={`Save. Status: ${saveStatus}`}
          >
            <span
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors duration-300
                ${saveStatus === 'idle' ? 'bg-current opacity-20' : ''}
                ${saveStatus === 'waiting' ? 'bg-yellow-500 animate-pulse' : ''}
                ${saveStatus === 'saving' ? 'bg-blue-500 animate-ping' : ''}
                ${saveStatus === 'saved' ? 'bg-green-500' : ''}
              `}
              aria-hidden="true"
            />
            Spara
          </button>

          <button
            onClick={onToggleTheme}
            className={`px-4 py-2 rounded-lg text-sm border ${theme.button}`}
            aria-label={`Change theme. Current: ${themeName}`}
          >
            {themeName}
          </button>

          <button
            onClick={onOpenSettings}
            className={`px-4 py-2 rounded-lg text-sm border ${theme.button}`}
            aria-label="Open settings"
          >
            ⚙️
          </button>
        </>
      )}
    </nav>
  );
};