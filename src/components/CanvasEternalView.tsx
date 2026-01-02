// src/components/CanvasEternalView.tsx
import React, { useMemo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import type { MindNode } from '../types/types';
import type { Theme } from '../themes';
import { getNodeDisplayTitle } from '../utils/nodeDisplay';
import { parseEventDates, isSameDay } from '../utils/eventDates';
import { useBrainStore } from '../store/useBrainStore';

interface CanvasEternalViewProps {
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

const DAY_WIDTH = 180;
const COLUMN_GAP = 12;
const LOAD_DAYS = 30;
const INITIAL_PAST_DAYS = 60;
const INITIAL_FUTURE_DAYS = 60;
const MAX_PAST_DAYS = 90;
const MAX_FUTURE_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number): Date => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const dateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatHeader = (date: Date): string =>
  date.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' });

const formatTime = (date: Date): string =>
  date.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

const getNodeLabel = (node: MindNode): string => {
  const title = getNodeDisplayTitle(node);
  if (title) return title;
  const content = (node.content || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (content) return content;
  const caption = node.caption?.trim();
  if (caption) return caption;
  return 'Ingen titel';
};

export const CanvasEternalView: React.FC<CanvasEternalViewProps> = ({
  nodes,
  theme,
  onEditCard,
  onContextMenu,
}) => {
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const columnShowTags = useBrainStore((state) => state.columnShowTags);
  const columnShowComments = useBrainStore((state) => state.columnShowComments);
  const columnShowCaptions = useBrainStore((state) => state.columnShowCaptions);

  const [rangeStart, setRangeStart] = useState(() =>
    startOfDay(addDays(new Date(), -INITIAL_PAST_DAYS))
  );
  const [rangeEnd, setRangeEnd] = useState(() =>
    startOfDay(addDays(new Date(), INITIAL_FUTURE_DAYS))
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const prependDaysRef = useRef(0);
  const initializedRef = useRef(false);

  const rangeStartMs = rangeStart.getTime();
  const rangeEndMs = rangeEnd.getTime();
  const columnFullWidth = DAY_WIDTH + COLUMN_GAP;

  const days = useMemo(() => {
    const list: Date[] = [];
    const cursor = new Date(rangeStartMs);
    while (cursor.getTime() <= rangeEndMs) {
      list.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [rangeStartMs, rangeEndMs]);

  const { entriesByDay, hasAnyEntries } = useMemo(() => {
    const buckets = new Map<string, Map<string, DayEntry>>();
    const startDate = new Date(rangeStartMs);
    const endExclusive = addDays(new Date(rangeEndMs), 1);

    nodes.forEach((node) => {
      if (!node.event) return;
      const dates = parseEventDates(node.event);
      if (dates.length === 0) return;

      dates.forEach((eventDate) => {
        if (eventDate < startDate || eventDate >= endExclusive) return;
        const key = dateKey(eventDate);
        let dayMap = buckets.get(key);
        if (!dayMap) {
          dayMap = new Map<string, DayEntry>();
          buckets.set(key, dayMap);
        }
        const time = eventDate.getTime();
        const existing = dayMap.get(node.id);
        if (!existing || time < existing.time) {
          dayMap.set(node.id, { node, time, eventDate });
        }
      });
    });

    const output = new Map<string, DayEntry[]>();
    let hasAny = false;

    buckets.forEach((map, key) => {
      const entries = Array.from(map.values()).sort((a, b) => {
        if (a.time !== b.time) return a.time - b.time;
        const aCreated = a.node.createdAt || '';
        const bCreated = b.node.createdAt || '';
        if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
        return a.node.id.localeCompare(b.node.id);
      });
      if (entries.length > 0) hasAny = true;
      output.set(key, entries);
    });

    return { entriesByDay: output, hasAnyEntries: hasAny };
  }, [nodes, rangeStartMs, rangeEndMs]);

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

  const handleScroll = useCallback(() => {
    const container = scrollRef.current;
    if (!container) return;
    const earliestAllowed = startOfDay(addDays(new Date(), -MAX_PAST_DAYS));
    const latestAllowed = startOfDay(addDays(new Date(), MAX_FUTURE_DAYS));
    const threshold = columnFullWidth * 3;
    if (container.scrollLeft < threshold) {
      if (rangeStart <= earliestAllowed) return;
      prependDaysRef.current += LOAD_DAYS;
      setRangeStart((prev) => {
        const next = startOfDay(addDays(prev, -LOAD_DAYS));
        return next < earliestAllowed ? earliestAllowed : next;
      });
    }
    if (container.scrollLeft + container.clientWidth > container.scrollWidth - threshold) {
      if (rangeEnd >= latestAllowed) return;
      setRangeEnd((prev) => {
        const next = startOfDay(addDays(prev, LOAD_DAYS));
        return next > latestAllowed ? latestAllowed : next;
      });
    }
  }, [columnFullWidth, rangeStart, rangeEnd]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.altKey) return;
    const container = scrollRef.current;
    if (!container) return;
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    container.scrollLeft += delta;
  }, []);

  useLayoutEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    if (!initializedRef.current) {
      const today = startOfDay(new Date());
      const offsetDays = Math.round((today.getTime() - rangeStartMs) / MS_PER_DAY);
      container.scrollLeft = Math.max(
        0,
        offsetDays * columnFullWidth - container.clientWidth / 2 + DAY_WIDTH / 2
      );
      initializedRef.current = true;
      return;
    }

    if (prependDaysRef.current > 0) {
      container.scrollLeft += prependDaysRef.current * columnFullWidth;
      prependDaysRef.current = 0;
    }
  }, [rangeStartMs, columnFullWidth]);

  const today = new Date();

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      onWheel={handleWheel}
      className="absolute inset-0 overflow-auto pt-16 z-30"
      style={{ backgroundColor: theme.canvasColor, color: theme.node.text }}
    >
      <div
        className="inline-grid gap-3 px-4 pb-32"
        style={{ gridAutoFlow: 'column', gridAutoColumns: `${DAY_WIDTH}px`, alignItems: 'start' }}
      >
        {days.map((date) => {
          const key = dateKey(date);
          const dayEntries = entriesByDay.get(key) ?? [];
          const isToday = isSameDay(date, today);

          return (
            <div key={key} className="min-w-0">
              <div
                className="mb-2 pb-1 border-b text-xs font-semibold"
                style={{
                  borderColor: theme.node.border,
                  opacity: isToday ? 1 : 0.7,
                }}
              >
                {formatHeader(date)}
              </div>
              <div className="flex flex-col gap-1.5">
                {dayEntries.map((entry) => {
                  const { node, eventDate } = entry;
                  const isSelected = selectedNodeIds.has(node.id);
                  const label = getNodeLabel(node);
                  const hasTime = eventDate.getHours() !== 0 || eventDate.getMinutes() !== 0;
                  const tooltip = hasTime ? `${formatTime(eventDate)} ${label}` : label;

                  return (
                    <div
                      key={`${node.id}-${eventDate.toISOString()}`}
                      onClick={(e) => handleCardClick(node, e)}
                      onDoubleClick={() => handleCardDoubleClick(node)}
                      onContextMenu={(e) => handleContextMenu(node, e)}
                      className="rounded-md cursor-pointer transition-colors"
                      title={tooltip}
                      style={{
                        backgroundColor: theme.node.bg,
                        border: `1px solid ${theme.node.border}`,
                        borderTop: node.accentColor ? `11px solid ${node.accentColor}` : undefined,
                        boxShadow: isSelected ? `0 0 0 2px ${theme.node.selectedBorder}` : undefined,
                        color: theme.node.text,
                        fontFamily: "'Noto Serif', Georgia, serif",
                        fontSize: '0.9rem',
                        padding: '6px 6px 5px',
                        whiteSpace: 'normal',
                        overflowWrap: 'anywhere',
                        lineBreak: 'anywhere',
                      }}
                    >
                      <div className="leading-snug">{label}</div>
                      {columnShowCaptions && node.caption && (
                        <div className="text-xs italic mt-1">
                          {node.caption}
                        </div>
                      )}
                      {columnShowComments && node.comment && (
                        <div
                          className="text-xs mt-1 p-1 rounded"
                          style={{
                            backgroundColor: theme.canvasColor,
                            color: theme.node.text,
                          }}
                        >
                          {node.comment}
                        </div>
                      )}
                      {columnShowTags && node.tags?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {node.tags.slice(0, 4).map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded"
                              style={{
                                backgroundColor: theme.canvasColor,
                                color: theme.node.text,
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {node.tags.length > 4 && (
                            <span className="text-[10px]">
                              +{node.tags.length - 4}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      {!hasAnyEntries && (
        <div className="py-12 text-center opacity-50">
          Inga kort med event i spannet
        </div>
      )}
      <div
        className="fixed bottom-4 right-4 text-xs pointer-events-none select-none"
        style={{ color: theme.node.text, opacity: 0.35 }}
      >
        Esc x2: canvas
      </div>
    </div>
  );
};
