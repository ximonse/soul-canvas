// src/components/overlays/Tooltip.tsx
// Tooltip för hover-kommentarer med markdown/länkstöd

import React, { useMemo } from 'react';
import { type Theme } from '../../themes';

interface TooltipProps {
  content: string;
  x: number;
  y: number;
  theme: Theme;
}

// Enkel markdown-parser för tooltip (rubriker + länkar)
function parseTooltipMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];

  lines.forEach((line, lineIndex) => {
    // Rubriker
    if (line.startsWith('### ')) {
      result.push(
        <h4 key={lineIndex} className="font-semibold text-sm mt-2 mb-1">
          {parseInlineMarkdown(line.slice(4), lineIndex)}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      result.push(
        <h3 key={lineIndex} className="font-semibold text-base mt-2 mb-1">
          {parseInlineMarkdown(line.slice(3), lineIndex)}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      result.push(
        <h2 key={lineIndex} className="font-bold text-lg mt-2 mb-1">
          {parseInlineMarkdown(line.slice(2), lineIndex)}
        </h2>
      );
    } else if (line.trim() === '') {
      result.push(<br key={lineIndex} />);
    } else {
      result.push(
        <p key={lineIndex} className="text-sm mb-1">
          {parseInlineMarkdown(line, lineIndex)}
        </p>
      );
    }
  });

  return result;
}

// Parse inline markdown (länkar)
function parseInlineMarkdown(text: string, lineKey: number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  // Regex för [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  let lastIndex = 0;
  let match;
  let partKey = 0;

  while ((match = linkRegex.exec(text)) !== null) {
    // Text före länken
    if (match.index > lastIndex) {
      parts.push(
        <span key={`${lineKey}-${partKey++}`}>
          {text.slice(lastIndex, match.index)}
        </span>
      );
    }

    // Länken
    parts.push(
      <a
        key={`${lineKey}-${partKey++}`}
        href={match[2]}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-400 hover:text-blue-300 underline"
        onClick={(e) => e.stopPropagation()}
      >
        {match[1]}
      </a>
    );

    lastIndex = match.index + match[0].length;
  }

  // Resterande text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`${lineKey}-${partKey++}`}>
        {text.slice(lastIndex)}
      </span>
    );
  }

  return parts.length > 0 ? parts : [<span key={`${lineKey}-0`}>{text}</span>];
}

export const Tooltip: React.FC<TooltipProps> = ({ content, x, y, theme }) => {
  const parsedContent = useMemo(() => parseTooltipMarkdown(content), [content]);

  // Beräkna position så tooltip inte hamnar utanför skärmen
  const tooltipWidth = 300;
  const tooltipMaxHeight = 400;
  const margin = 16;

  let posX = x + 10;
  let posY = y - 10;

  // Justera X om tooltip går utanför höger kant
  if (posX + tooltipWidth > window.innerWidth - margin) {
    posX = x - tooltipWidth - 10;
  }

  // Justera Y om tooltip går utanför nedre kant
  if (posY + tooltipMaxHeight > window.innerHeight - margin) {
    posY = window.innerHeight - tooltipMaxHeight - margin;
  }

  // Justera Y om tooltip går utanför övre kant
  if (posY < margin) {
    posY = margin;
  }

  return (
    <div
      className="fixed z-[999] pointer-events-auto"
      style={{
        left: posX,
        top: posY,
        maxWidth: tooltipWidth,
        maxHeight: tooltipMaxHeight,
      }}
    >
      <div
        className="rounded-lg shadow-xl p-3 overflow-auto"
        style={{
          backgroundColor: theme.node.bg,
          color: theme.node.text,
          border: `1px solid ${theme.node.border}`,
          maxHeight: tooltipMaxHeight - 20,
        }}
      >
        {parsedContent}
      </div>
    </div>
  );
};
