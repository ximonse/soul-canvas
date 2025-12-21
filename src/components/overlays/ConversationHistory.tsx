// src/components/overlays/ConversationHistory.tsx
import type { Conversation } from '../../types/types';
import type { Theme } from '../../themes';

interface ConversationHistoryProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onClose: () => void;
  theme: Theme;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Idag ${date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return 'Igår';
  } else if (diffDays < 7) {
    return `${diffDays} dagar sedan`;
  } else {
    return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  }
}

export function ConversationHistory({
  conversations,
  currentConversationId,
  onSelect,
  onNewConversation,
  onClose,
  theme,
}: ConversationHistoryProps) {
  return (
    <div
      className="absolute top-14 right-0 w-80 max-h-96 rounded-lg shadow-xl overflow-hidden z-10"
      style={{
        backgroundColor: theme.node.bg,
        border: `1px solid ${theme.node.border}`,
      }}
    >
      <div
        className="flex items-center justify-between p-3"
        style={{ borderBottom: `1px solid ${theme.node.border}` }}
      >
        <span className="text-sm font-semibold">Samtalshistorik</span>
        <button
          className="text-xs px-2 py-1 rounded hover:opacity-80"
          style={{ backgroundColor: `${theme.node.selectedBorder}66` }}
          onClick={onNewConversation}
        >
          + Nytt samtal
        </button>
      </div>

      <div className="overflow-y-auto max-h-72">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-sm opacity-60">
            Inga tidigare samtal
          </div>
        ) : (
          conversations.map(conv => {
            const messageCount = conv.messages.filter(m => m.role !== 'system').length;
            const isActive = conv.id === currentConversationId;

            return (
              <button
                key={conv.id}
                className="w-full text-left p-3 hover:opacity-80 transition"
                style={{
                  backgroundColor: isActive ? `${theme.node.selectedBorder}22` : 'transparent',
                  borderBottom: `1px solid ${theme.node.border}33`,
                }}
                onClick={() => {
                  onSelect(conv.id);
                  onClose();
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate" style={{ color: theme.node.text }}>
                      {conv.title}
                    </div>
                    {conv.summary && (
                      <div className="text-xs opacity-70 mt-0.5 line-clamp-2">
                        {conv.summary}
                      </div>
                    )}
                    <div className="text-xs opacity-50 mt-0.5">
                      {messageCount} meddelanden · {formatDate(conv.updatedAt)}
                    </div>
                  </div>
                  <div
                    className="text-xs px-1.5 py-0.5 rounded opacity-70 shrink-0"
                    style={{ backgroundColor: `${theme.node.border}44` }}
                  >
                    {conv.provider}
                  </div>
                </div>
                {conv.themes && conv.themes.length > 0 && (
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {conv.themes.slice(0, 3).map((t, i) => (
                      <span
                        key={i}
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${theme.node.border}33` }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
