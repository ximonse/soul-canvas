import React, { useEffect, useState } from 'react';
import type { Theme } from '../../themes';
import type { AIBatchItemStatus, AIBatchState } from '../../hooks/useIntelligence';

interface AIBatchStatusProps {
  theme: Theme;
  batch: AIBatchState | null;
  onCancel: () => void;
  onClear: () => void;
}

const TYPE_LABELS: Record<AIBatchState['type'], string> = {
  tags: 'Tags',
  summary: 'Summary',
  title: 'Title',
};

const STATUS_LABELS: Record<AIBatchState['status'], string> = {
  running: 'Running',
  done: 'Done',
  cancelled: 'Cancelled',
};

const MAX_VISIBLE_ITEMS = 8;

const getStatusColor = (status: AIBatchItemStatus) => {
  switch (status) {
    case 'processing':
      return 'bg-indigo-500';
    case 'done':
      return 'bg-emerald-500';
    case 'error':
      return 'bg-rose-500';
    case 'skipped':
      return 'bg-amber-400';
    default:
      return 'bg-gray-400';
  }
};

export const AIBatchStatus: React.FC<AIBatchStatusProps> = ({
  theme,
  batch,
  onCancel,
  onClear,
}) => {
  if (!batch) return null;

  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (batch.status === 'running' && batch.current === 0) {
      setIsExpanded(false);
    }
  }, [batch.current, batch.status, batch.total, batch.type]);

  const progress = batch.total > 0 ? Math.round((batch.current / batch.total) * 100) : 0;
  const maxStart = Math.max(batch.items.length - MAX_VISIBLE_ITEMS, 0);
  const startIndex = Math.min(Math.max(batch.current - 1, 0), maxStart);
  const visibleItems = batch.items.slice(startIndex, startIndex + MAX_VISIBLE_ITEMS);
  const showRange = batch.items.length > MAX_VISIBLE_ITEMS;

  if (!isExpanded) {
    return (
      <div
        className="absolute left-4 bottom-14 z-40 w-72 rounded-xl border shadow-lg backdrop-blur pointer-events-auto"
        style={{
          backgroundColor: theme.node.bg + 'f2',
          borderColor: theme.node.border,
          color: theme.node.text,
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-3 py-2">
          <button
            type="button"
            className="flex-1 text-left"
            onClick={() => setIsExpanded(true)}
          >
            <div className="text-[10px] uppercase tracking-wide opacity-70">AI Batch</div>
            <div className="text-xs font-semibold">{TYPE_LABELS[batch.type]}</div>
            <div className="mt-1 h-1 w-full rounded-full bg-black/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] font-mono">
              {STATUS_LABELS[batch.status]} {batch.current}/{batch.total}
            </div>
          </button>
          <div className="flex flex-col items-end gap-1 text-[10px]">
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="rounded-md px-2 py-1 border"
              style={{ borderColor: theme.node.border }}
            >
              Expand
            </button>
            {batch.status === 'running' ? (
              <button
                type="button"
                onClick={onCancel}
                disabled={batch.isCancelling}
                className="rounded-md px-2 py-1 border"
                style={{ borderColor: theme.node.border }}
              >
                {batch.isCancelling ? 'Cancelling' : 'Cancel'}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClear}
                className="rounded-md px-2 py-1 border"
                style={{ borderColor: theme.node.border }}
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute bottom-14 left-4 z-40 w-72 rounded-xl border shadow-lg backdrop-blur pointer-events-auto"
      style={{
        backgroundColor: theme.node.bg + 'f2',
        borderColor: theme.node.border,
        color: theme.node.text,
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <div className="px-3 pt-2 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-70">AI Batch</div>
            <div className="text-sm font-semibold">{TYPE_LABELS[batch.type]}</div>
          </div>
          <div className="text-xs font-mono text-right">
            <div>{STATUS_LABELS[batch.status]}</div>
            <div>{batch.current}/{batch.total}</div>
          </div>
        </div>

        <div className="mt-2 h-2 w-full rounded-full bg-black/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>

        {batch.isCancelling && (
          <div className="mt-2 text-[11px] text-amber-600">Cancelling...</div>
        )}
      </div>

      <div className="px-3 pb-3">
        <div className="max-h-40 overflow-auto space-y-1">
          {visibleItems.map((item) => (
            <div key={item.id} className="flex items-center gap-2 text-[11px]">
              <span className={`inline-block h-2 w-2 rounded-full ${getStatusColor(item.status)}`} />
              <span className="truncate flex-1">{item.title}</span>
              <span className="uppercase opacity-60">{item.status}</span>
            </div>
          ))}
        </div>
        {showRange && (
          <div className="mt-2 text-[10px] opacity-60">
            Showing {startIndex + 1}-{startIndex + visibleItems.length} of {batch.items.length}
          </div>
        )}

        <div className="mt-3 flex justify-between gap-2">
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            className="rounded-md px-2 py-1 text-xs border"
            style={{ borderColor: theme.node.border }}
          >
            Collapse
          </button>
          {batch.status === 'running' ? (
            <button
              type="button"
              onClick={onCancel}
              disabled={batch.isCancelling}
              className="rounded-md px-2 py-1 text-xs border"
              style={{ borderColor: theme.node.border }}
            >
              {batch.isCancelling ? 'Cancelling' : 'Cancel'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md px-2 py-1 text-xs border"
              style={{ borderColor: theme.node.border }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
