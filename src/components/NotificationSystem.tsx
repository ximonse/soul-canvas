import React from 'react';
import { useBrainStore } from '../store/useBrainStore';
import type { Theme } from '../themes';
// import { motion, AnimatePresence } from 'framer-motion'; // Assuming framer-motion is available, if not use CSS

interface NotificationSystemProps {
    hasFile: boolean;
    saveStatus: 'idle' | 'waiting' | 'saving' | 'saved' | 'error';
    theme: Theme;
    zenMode: boolean;
    onConnect: () => void;
    onSave: () => void;
    onExportBackup: () => void;
    onRestoreBackup: () => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
    hasFile,
    saveStatus,
    theme,
    zenMode,
    onConnect,
    onSave,
    onExportBackup,
    onRestoreBackup,
}) => {
    const notifications = useBrainStore((state) => state.notifications);
    // Show the latest notification if available
    const activeNotification = notifications.length > 0 ? notifications[notifications.length - 1] : null;

    // Determine styles based on save status or active notification type
    let barColor = 'rgba(128, 128, 128, 0.3)'; // Default/Idle
    let textColor = theme.node.text;
    let icon = '';

    if (activeNotification) {
        if (activeNotification.type === 'success') {
            barColor = '#22c55e'; // Green
            icon = '✅';
        } else if (activeNotification.type === 'error') {
            barColor = '#ef4444'; // Red
            icon = '❌';
            textColor = '#fff';
        } else if (activeNotification.type === 'info') {
            barColor = '#3b82f6'; // Blue
            icon = 'ℹ️';
            textColor = '#fff';
        } else if (activeNotification.type === 'warning') {
            barColor = '#eab308'; // Yellow
            icon = '⚠️';
            textColor = '#000';
        }
    } else {
        // Fallback to Save Status
        if (saveStatus === 'waiting') {
            barColor = '#eab308';
            icon = '⏳';
        } else if (saveStatus === 'saving') {
            barColor = '#3b82f6';
            icon = '💾';
        } else if (saveStatus === 'saved') {
            barColor = '#22c55e'; // Green check
            icon = '';
        } else if (saveStatus === 'error') {
            barColor = '#ef4444';
            icon = '❌';
        }
    }

    // Effect to briefly show "Saved" state if we just finished saving
    // (In a real implementation, we might want a dedicated notification for "Saved" to ensure it pops up)

    return (
        <div
            className={`absolute top-6 left-6 z-50 flex flex-col items-start transition-opacity duration-300 ${zenMode ? 'opacity-0 pointer-events-none' : 'opacity-100'
                }`}
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
                <div className="flex items-center gap-2">
                    {/* Notification / Save Status Bar */}
                    <div className="relative group">
                        <button
                            onClick={onSave}
                            title="Manual Save (Ctrl+Enter)"
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-md transition-all duration-300 backdrop-blur-sm overflow-hidden"
                            style={{
                                backgroundColor: activeNotification ? barColor : theme.canvasColor,
                                color: activeNotification ? textColor : theme.node.text,
                                border: `1px solid ${activeNotification ? 'transparent' : theme.node.border}`,
                                maxWidth: activeNotification ? '400px' : '40px', // Expand for notification
                                minWidth: '40px',
                            }}
                        >
                            {/* Status Icon / Dot */}
                            <div
                                className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-all ${!activeNotification && 'hover:scale-125'
                                    }`}
                                style={{
                                    backgroundColor: activeNotification ? 'transparent' : barColor,
                                    boxShadow: !activeNotification && saveStatus !== 'idle' ? `0 0 8px ${barColor}` : 'none',
                                }}
                            >
                                {/* If active notification, show icon inside the transparent dot area (effectively just an icon) */}
                                {activeNotification && <span>{icon}</span>}
                            </div>

                            {/* Message Text (Collapsed if no notification) */}
                            <span
                                className={`whitespace-nowrap font-medium text-sm transition-all duration-300 ${activeNotification ? 'opacity-100 ml-1' : 'opacity-0 w-0 -ml-2 pointer-events-none'
                                    }`}
                            >
                                {activeNotification?.message}
                            </span>
                        </button>

                        {/* Hover tooltip for save status if no notification */}
                        {!activeNotification && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                                Status: {saveStatus}
                            </div>
                        )}
                    </div>

                    <button onClick={onExportBackup} className="px-2 py-1 text-xs rounded shadow" style={{ backgroundColor: theme.canvasColor, color: theme.node.text, border: `1px solid ${theme.node.border}` }}>Backup</button>
                    <button onClick={onRestoreBackup} className="px-2 py-1 text-xs rounded shadow" style={{ backgroundColor: theme.canvasColor, color: theme.node.text, border: `1px solid ${theme.node.border}` }}>Återställ</button>
                </div>
            )}
        </div>
    );
};
