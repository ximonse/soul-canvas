// src/components/MarkdownText.tsx
// Konva-komponent för att rendera text med markdown-rubriker

import React, { useMemo } from 'react';
import Konva from 'konva';
import { Group, Text } from 'react-konva';
import { CARD } from '../utils/constants';
import { layoutMarkdownText, type MarkdownLineLayout } from '../utils/textLayout';

interface MarkdownTextProps {
  text: string;
  lines?: MarkdownLineLayout[];
  x: number;
  y: number;
  width: number;
  fill: string;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

const WIDTH_CACHE_LIMIT = 4000;
const widthCache = new Map<string, number>();

const getWidthKey = (
  text: string,
  fontSize: number,
  fontFamily: string,
  fontStyle: string,
  lineHeight: number
) => `${text}|${fontSize}|${fontFamily}|${fontStyle}|${lineHeight}`;

const readCache = (key: string) => {
  if (!widthCache.has(key)) return undefined;
  const value = widthCache.get(key) as number;
  widthCache.delete(key);
  widthCache.set(key, value);
  return value;
};

const writeCache = (key: string, value: number) => {
  if (widthCache.size >= WIDTH_CACHE_LIMIT) {
    const oldestKey = widthCache.keys().next().value;
    if (oldestKey) widthCache.delete(oldestKey);
  }
  widthCache.set(key, value);
};

const measureTextWidth = (
  text: string,
  fontSize: number,
  fontFamily: string,
  fontStyle: string,
  lineHeight: number
) => {
  if (!text) return 0;
  const key = getWidthKey(text, fontSize, fontFamily, fontStyle, lineHeight);
  const cached = readCache(key);
  if (cached !== undefined) return cached;

  const textNode = new Konva.Text({
    text,
    fontSize,
    fontFamily,
    fontStyle,
    lineHeight,
    wrap: 'none',
  });
  const width = textNode.width();
  writeCache(key, width);
  return width;
};

const mergeFontStyles = (base: string, override?: string) => {
  if (!override || override === 'normal') return base;
  if (!base || base === 'normal') return override;

  const baseBold = base.includes('bold');
  const baseItalic = base.includes('italic');
  const overrideBold = override.includes('bold');
  const overrideItalic = override.includes('italic');
  const bold = baseBold || overrideBold;
  const italic = baseItalic || overrideItalic;

  if (bold && italic) return 'bold italic';
  if (bold) return 'bold';
  if (italic) return 'italic';
  return 'normal';
};

const MarkdownText: React.FC<MarkdownTextProps> = ({
  text,
  x,
  y,
  width,
  fill,
  fontSize = CARD.FONT_SIZE,
  fontFamily = 'Noto Serif, Georgia, serif',
  align = 'left',
  lineHeight = 1.6,
  lines,
}) => {
  const renderedLines = useMemo(() => {
    if (lines) return lines;
    return layoutMarkdownText(text, { width, fontSize, fontFamily, lineHeight }).lines;
  }, [lines, text, width, fontSize, fontFamily, lineHeight]);

  const renderedSegments = useMemo(() => {
    return renderedLines.flatMap((line, lineIndex) => {
      const segments = line.segments && line.segments.length > 0
        ? line.segments
        : [{ text: line.text }];
      const hasInline = segments.some((segment) => segment.fontStyle);

      if (!hasInline) {
        return [
          <Text
            key={`line-${lineIndex}`}
            text={line.text}
            x={0}
            y={line.y}
            width={width}
            fontSize={line.fontSize}
            fontStyle={line.fontStyle}
            fontFamily={fontFamily}
            fill={fill}
            align={align}
            wrap="word"
            lineHeight={lineHeight}
          />
        ];
      }

      const baseStyle = line.fontStyle || 'normal';
      const lineHeightPx = line.fontSize * lineHeight;
      let cursorX = 0;
      let cursorY = 0;
      const nodes: React.ReactNode[] = [];

      segments.forEach((segment, segmentIndex) => {
        if (!segment.text) return;
        const fontStyle = mergeFontStyles(baseStyle, segment.fontStyle);
        const parts = segment.text.split(/(\s+)/).filter((part) => part.length > 0);

        parts.forEach((part, partIndex) => {
          const isSpace = part.trim().length === 0;
          if (cursorX === 0 && isSpace) return;

          const partWidth = measureTextWidth(part, line.fontSize, fontFamily, fontStyle, lineHeight);
          if (cursorX + partWidth > width && cursorX > 0) {
            cursorX = 0;
            cursorY += lineHeightPx;
            if (isSpace) return;
          }

          nodes.push(
            <Text
              key={`${lineIndex}-${segmentIndex}-${partIndex}`}
              text={part}
              x={cursorX}
              y={line.y + cursorY}
              fontSize={line.fontSize}
              fontStyle={fontStyle}
              fontFamily={fontFamily}
              fill={fill}
              align={align}
              wrap="none"
              lineHeight={lineHeight}
            />
          );
          cursorX += partWidth;
        });
      });

      return nodes;
    });
  }, [renderedLines, fontFamily, fill, align, lineHeight, width]);

  return (
    <Group x={x} y={y}>
      {renderedSegments}
    </Group>
  );
};

export default React.memo(MarkdownText);
