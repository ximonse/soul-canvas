import React, { useMemo } from 'react';
import type { Theme } from '../../themes';

interface GuidanceOverlayProps {
    theme: Theme;
    viewMode: 'canvas' | 'column';
    isWandering: boolean;
    selectionCount: number;
    showSessionPanel: boolean;
    showAIChat: boolean;
    onClose: () => void;
}

type GuideContext = 'default' | 'selection' | 'wandering' | 'session' | 'chat';

interface Tip {
    icon: string;
    text: string;
    shortcut?: string;
}

const TIPS: Record<GuideContext, { title: string; tips: Tip[] }> = {
    default: {
        title: 'Canvas Navigation',
        tips: [
            { icon: '🖱️', text: 'Double-click to create a new card' },
            { icon: '⌨️', text: 'Press Space to open Command Palette', shortcut: 'Space' },
            { icon: '🔍', text: 'Use mouse wheel to zoom', shortcut: 'Ctrl+Scroll' },
            { icon: '📂', text: 'Drag & drop files to import' },
            { icon: '👀', text: 'Fit all nodes to screen', shortcut: '-' },
        ]
    },
    selection: {
        title: 'Selection Actions',
        tips: [
            { icon: '🎯', text: 'Center camera on selection' },
            { icon: '✨', text: 'Generate AI tags for selected', shortcut: 'T' },
            { icon: '📌', text: 'Pin/Unpin selected nodes' },
            { icon: '🔗', text: 'Auto-link similar nodes', shortcut: 'L' },
            { icon: '🗑️', text: 'Delete selected nodes', shortcut: 'Del' },
        ]
    },
    wandering: {
        title: 'Wandering Mode',
        tips: [
            { icon: '👣', text: 'Click a node to step forward' },
            { icon: '🔙', text: 'Backtrack to previous node', shortcut: 'Backspace' },
            { icon: '💾', text: 'Save current trail as a path' },
            { icon: '🎨', text: 'Toggle color mode', shortcut: 'C' },
            { icon: '🚪', text: 'Exit wandering mode', shortcut: 'W' },
        ]
    },
    session: {
        title: 'Session Management',
        tips: [
            { icon: '➕', text: 'Create new session from selection' },
            { icon: '🏷️', text: 'Filter nodes by tags' },
            { icon: '🔎', text: 'Search outside session to add cards' },
            { icon: '📂', text: 'Switch between active sessions' },
            { icon: '💾', text: 'Session view state is auto-saved' },
        ]
    },
    chat: {
        title: 'AI Companion',
        tips: [
            { icon: '💬', text: 'Chat with your knowledge base' },
            { icon: '🧠', text: 'Add selected nodes to context' },
            { icon: '📝', text: 'Summarize chat to a new card' },
            { icon: '🔄', text: 'Reflect on active session' },
            { icon: '📌', text: 'Pin specific nodes for focus' },
        ]
    }
};

export const GuidanceOverlay: React.FC<GuidanceOverlayProps> = ({
    theme,
    isWandering,
    selectionCount,
    showSessionPanel,
    showAIChat,
    onClose
}) => {
    const activeContext: GuideContext = useMemo(() => {
        if (isWandering) return 'wandering';
        if (showAIChat) return 'chat';
        if (showSessionPanel) return 'session';
        if (selectionCount > 0) return 'selection';
        return 'default';
    }, [isWandering, showAIChat, showSessionPanel, selectionCount]);

    const content = TIPS[activeContext];

    return (
        <div
            className="absolute z-40 p-6 rounded-2xl shadow-xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-top-4"
            style={{
                top: '1rem',
                left: 'calc(50% + 240px)',
                backgroundColor: theme.bgType === 'none' ? theme.node.bg : `${theme.node.bg}CC`, // Less transparency for e-ink
                border: `1px solid ${theme.node.border}`,
                color: theme.node.text,
                maxWidth: '320px'
            }}
        >
            <div className="flex justify-between items-center mb-4 border-b pb-2" style={{ borderColor: theme.node.border }}>
                <h3 className="font-bold text-lg flex items-center gap-2">
                    💡 {content.title}
                </h3>
                <button
                    onClick={onClose}
                    className="hover:opacity-70 transition-opacity p-1"
                    aria-label="Close tips"
                >
                    ✕
                </button>
            </div>

            <ul className="space-y-3">
                {content.tips.map((tip, index) => (
                    <li key={index} className="flex items-start gap-3 text-sm leading-relaxed">
                        <span className="text-lg select-none" aria-hidden="true">{tip.icon}</span>
                        <div className="flex-1">
                            <p>{tip.text}</p>
                            {tip.shortcut && (
                                <span
                                    className="inline-block mt-1 px-1.5 py-0.5 text-xs rounded border font-mono opacity-80"
                                    style={{ borderColor: theme.node.border, backgroundColor: theme.bg }}
                                >
                                    {tip.shortcut}
                                </span>
                            )}
                        </div>
                    </li>
                ))}
            </ul>

            {/* Footer hint */}
            <div className="mt-4 pt-3 border-t text-xs opacity-60 italic text-center" style={{ borderColor: theme.node.border }}>
                Context: {activeContext.charAt(0).toUpperCase() + activeContext.slice(1)}
            </div>
        </div>
    );
};
