// src/utils/textLayout.ts
// Measure and lay out markdown/plain text for Konva rendering.

import Konva from 'konva';
import { parseMarkdown, type MarkdownSegment } from './markdownParser';

export interface TextMeasureOptions {
  width: number;
  fontSize: number;
  fontFamily: string;
  fontStyle?: string;
  lineHeight?: number;
}

export interface MarkdownLineLayout {
  text: string;
  y: number;
  fontSize: number;
  fontStyle: string;
  height: number;
  segments?: MarkdownSegment[];
}

export interface MarkdownLayoutResult {
  lines: MarkdownLineLayout[];
  height: number;
}

const DEFAULT_LINE_HEIGHT = 1.2;
const MEASURE_CACHE_LIMIT = 2000;
const LAYOUT_CACHE_LIMIT = 800;
const measureCache = new Map<string, number>();
const layoutCache = new Map<string, MarkdownLayoutResult>();

const getCacheKey = (text: string, options: TextMeasureOptions) =>
  JSON.stringify({
    text,
    width: options.width,
    fontSize: options.fontSize,
    fontFamily: options.fontFamily,
    fontStyle: options.fontStyle || 'normal',
    lineHeight: options.lineHeight || DEFAULT_LINE_HEIGHT,
  });

const readCache = <T>(cache: Map<string, T>, key: string): T | undefined => {
  if (!cache.has(key)) return undefined;
  const value = cache.get(key) as T;
  cache.delete(key);
  cache.set(key, value);
  return value;
};

const writeCache = <T>(cache: Map<string, T>, key: string, value: T, limit: number) => {
  if (cache.size >= limit) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(key, value);
};

export function measureTextHeight(text: string, options: TextMeasureOptions): number {
  const key = getCacheKey(text, options);
  const cached = readCache(measureCache, key);
  if (cached !== undefined) return cached;

  const { width, fontSize, fontFamily, fontStyle = 'normal', lineHeight = DEFAULT_LINE_HEIGHT } = options;
  const measureText = text && text.length > 0 ? text : ' ';
  const textNode = new Konva.Text({
    text: measureText,
    width,
    fontSize,
    fontFamily,
    fontStyle,
    lineHeight,
    wrap: 'word',
  });
  const height = textNode.height();
  writeCache(measureCache, key, height, MEASURE_CACHE_LIMIT);
  return height;
}

export function measureTextWidth(text: string, options: TextMeasureOptions): number {
  const { fontSize, fontFamily, fontStyle = 'normal' } = options;
  const textNode = new Konva.Text({
    text,
    fontSize,
    fontFamily,
    fontStyle,
    wrap: 'none',
  });
  return textNode.width();
}

function mergeFontStyles(base: string, override?: string): string {
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
}

export function layoutMarkdownText(
  text: string,
  options: TextMeasureOptions
): MarkdownLayoutResult {
  const key = getCacheKey(text, options);
  const cached = readCache(layoutCache, key);
  if (cached) return cached;

  const parsedLines = parseMarkdown(text || '');
  const lines: MarkdownLineLayout[] = [];
  let currentY = 0;

  for (const line of parsedLines) {
    let lineFontSize = options.fontSize;
    let baseStyle = line.fontStyle || 'normal';

    if (line.isHeading === 1) {
      lineFontSize = options.fontSize * 1.375; // 22px
      baseStyle = 'bold';
    } else if (line.isHeading === 2) {
      lineFontSize = options.fontSize * 1.25; // 20px
      baseStyle = 'bold';
    } else if (line.isHeading === 3) {
      lineFontSize = options.fontSize * 1.125; // 18px
      baseStyle = 'bold';
    }

    let lineHeight = 0;
    const segments = line.segments && line.segments.length > 0
      ? line.segments
      : [{ text: line.text }];
    const hasInline = segments.some((segment) => segment.fontStyle);

    if (!hasInline) {
      lineHeight = measureTextHeight(line.text, {
        ...options,
        fontSize: lineFontSize,
        fontStyle: baseStyle,
      });
    } else {
      // Replicate MarkdownText wrapping logic for accurate height
      const hPx = lineFontSize * (options.lineHeight || DEFAULT_LINE_HEIGHT);
      let cursorX = 0;
      let cursorY = 0;

      segments.forEach((segment) => {
        if (!segment.text) return;
        const fontStyle = mergeFontStyles(baseStyle, segment.fontStyle);
        const parts = segment.text.split(/(\s+)/).filter((part) => part.length > 0);

        parts.forEach((part) => {
          const isSpace = part.trim().length === 0;
          if (cursorX === 0 && isSpace) return;

          const partWidth = measureTextWidth(part, {
            ...options,
            fontSize: lineFontSize,
            fontStyle,
          });

          if (cursorX + partWidth > options.width && cursorX > 0) {
            cursorX = 0;
            cursorY += hPx;
            if (isSpace) return;
          }
          cursorX += partWidth;
        });
      });
      lineHeight = cursorY + hPx;
    }

    lines.push({
      text: line.text,
      y: currentY,
      fontSize: lineFontSize,
      fontStyle: baseStyle,
      height: lineHeight,
      segments: line.segments,
    });

    currentY += lineHeight;
  }

  const result = { lines, height: currentY };
  writeCache(layoutCache, key, result, LAYOUT_CACHE_LIMIT);
  return result;
}
