// src/components/CanvasWeekView.tsx
import React, { useMemo, useCallback } from 'react';
import type { MindNode } from '../types/types';
import type { Theme } from '../themes';
import { getNodeDisplayTitle } from '../utils/nodeDisplay';
import { resolveImageUrl } from '../utils/imageRefs';
import { getNodeStyles } from '../utils/nodeStyles';
import { parseEventDates, startOfWeekMonday, isSameDay } from '../utils/eventDates';
import { useBrainStore } from '../store/useBrainStore';

interface CanvasWeekViewProps {
  nodes: MindNode[];
  theme: Theme;
  onEditCard: (id: string) => void;
  onContextMenu: (nodeId: string, pos: { x: number; y: number }) => void;
}

type DayEntry = {
  node: MindNode;
  time: number;
  eventDate: Date;
};

function formatDay(date: Date): string {
  return date.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });
}

export const CanvasWeekView: React.FC<CanvasWeekViewProps> = ({
  nodes,
  theme,
  onEditCard,
  onContextMenu,
}) => {
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const assets = useBrainStore((state) => state.assets);
  const columnShowTags = useBrainStore((state) => state.columnShowTags);
  const columnShowComments = useBrainStore((state) => state.columnShowComments);
  const columnShowCaptions = useBrainStore((state) => state.columnShowCaptions);

  const weekStart = startOfWeekMonday(new Date());
  const weekStartMs = weekStart.getTime();
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(weekStartMs);
      day.setDate(day.getDate() + index);
      return day;
    });
  }, [weekStartMs]);

  const entriesByDay = useMemo(() => {
    const dayMaps = Array.from({ length: 7 }, () => new Map<string, DayEntry>());
    const weekStartDate = new Date(weekStartMs);
    const weekEnd = new Date(weekStartMs);
    weekEnd.setDate(weekEnd.getDate() + 7);

    nodes.forEach((node) => {
      if (!node.event) return;
      const dates = parseEventDates(node.event);
      if (dates.length === 0) return;

      dates.forEach((eventDate) => {
        if (eventDate < weekStartDate || eventDate >= weekEnd) return;
        const dayIndex = (eventDate.getDay() + 6) % 7;
        const dayMap = dayMaps[dayIndex];
        const existing = dayMap.get(node.id);
        const time = eventDate.getTime();
        if (!existing || time < existing.time) {
          dayMap.set(node.id, { node, time, eventDate });
        }
      });
    });

    return dayMaps.map((map) =>
      Array.from(map.values()).sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        const aCreated = a.node.createdAt || '';
        const bCreated = b.node.createdAt || '';
        if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
        return a.node.id.localeCompare(b.node.id);
      })
    );
  }, [nodes, weekStartMs]);

  const hasAnyEntries = entriesByDay.some((dayEntries) => dayEntries.length > 0);
  const isSoftBorderTheme = theme.name === 'Papper' || theme.name === 'Moln';
  const today = new Date();

  const handleCardClick = useCallback((node: MindNode, e: React.MouseEvent) => {
    const hasModifier = e.shiftKey || e.ctrlKey || e.metaKey || e.altKey;
    toggleSelection(node.id, hasModifier);
  }, [toggleSelection]);

  const handleCardDoubleClick = useCallback((node: MindNode) => {
    onEditCard(node.id);
  }, [onEditCard]);

  const handleContextMenu = useCallback((node: MindNode, e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu(node.id, { x: e.clientX, y: e.clientY });
  }, [onContextMenu]);

  const dayNames = [
    'M\u00e5n',
    'Tis',
    'Ons',
    'Tor',
    'Fre',
    'L\u00f6r',
    'S\u00f6n',
  ];

  return (
    <div
      className="absolute inset-0 overflow-auto pt-16 z-30"
      style={{ backgroundColor: theme.canvasColor, color: theme.node.text }}
    >
      <div
        className="mx-auto py-4 px-4 pb-32"
        style={{ maxWidth: '1200px' }}
      >
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        >
          {weekDays.map((date, index) => {
            const isToday = isSameDay(date, today);
            return (
              <div key={date.toISOString()} className="min-w-0">
                <div
                  className="mb-3 pb-2 border-b text-sm font-semibold"
                  style={{
                    borderColor: theme.node.border,
                    opacity: isToday ? 1 : 0.75,
                  }}
                >
                  {dayNames[index]} {formatDay(date)}
                </div>
                <div className="flex flex-col gap-3">
                  {entriesByDay[index].map((entry) => {
                    const { node, eventDate } = entry;
                    const isSelected = selectedNodeIds.has(node.id);
                    const displayTitle = getNodeDisplayTitle(node);
                    const imageUrl = node.type === 'image' ? resolveImageUrl(node, assets) : null;
                    const cardStyles = getNodeStyles(
                      theme,
                      node.updatedAt || node.createdAt,
                      isSelected,
                      node.backgroundColor
                    );
                    const hasTime = eventDate.getHours() !== 0 || eventDate.getMinutes() !== 0;

                    return (
                      <div
                        key={`${node.id}-${eventDate.toISOString()}`}
                        onClick={(e) => handleCardClick(node, e)}
                        onDoubleClick={() => handleCardDoubleClick(node)}
                        onContextMenu={(e) => handleContextMenu(node, e)}
                        className="rounded-lg cursor-pointer transition-all"
                        style={{
                          backgroundColor: cardStyles.bg,
                          border: `${isSoftBorderTheme ? '0.1px' : '1px'} solid ${cardStyles.border}`,
                          fontFamily: "'Noto Serif', Georgia, serif",
                          lineBreak: 'anywhere',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {node.accentColor && (
                          <div
                            className="h-5 rounded-t-lg"
                            style={{ backgroundColor: node.accentColor }}
                          />
                        )}
                        <div className="p-4">
                          {hasTime && (
                            <div className="text-xs mb-1">
                              {formatTime(eventDate)}
                            </div>
                          )}
                          {displayTitle && (
                            <h3
                              className="font-semibold mb-1 truncate"
                              style={{ color: theme.node.text, fontSize: '1.05em' }}
                            >
                              {displayTitle}
                            </h3>
                          )}
                          {imageUrl && (
                            <img
                              src={imageUrl}
                              alt={node.caption || ''}
                              className="w-full object-contain rounded mb-2 bg-black/5"
                            />
                          )}
                          <p
                            className="leading-relaxed whitespace-pre-wrap"
                            style={{ color: theme.node.text, fontSize: '1.05em' }}
                          >
                            {node.content.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}
                          </p>
                          {columnShowCaptions && node.caption && (
                            <p
                              className="text-sm mt-2 italic"
                              style={{ color: theme.node.text, fontSize: '1.05em' }}
                            >
                              {node.caption}
                            </p>
                          )}
                          {columnShowComments && node.comment && (
                            <div
                              className="text-sm mt-2 p-2 rounded"
                              style={{
                                backgroundColor: theme.canvasColor,
                                color: theme.node.text,
                              }}
                            >
                              {node.comment}
                            </div>
                          )}
                          {columnShowTags && node.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {node.tags.slice(0, 4).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-xs px-2 py-0.5 rounded"
                                  style={{
                                    backgroundColor: theme.canvasColor,
                                    color: theme.node.text,
                                  }}
                                >
                                  {tag}
                                </span>
                              ))}
                              {node.tags.length > 4 && (
                                <span className="text-xs">
                                  +{node.tags.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        {!hasAnyEntries && (
          <div className="text-center py-12 opacity-50">
            Inga kort med event denna vecka
          </div>
        )}
        <div
          className="fixed bottom-4 right-4 text-xs pointer-events-none select-none"
          style={{ color: theme.node.text, opacity: 0.35 }}
        >
          Esc x2: canvas
        </div>
      </div>
    </div>
  );
};
