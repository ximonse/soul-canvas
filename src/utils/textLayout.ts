// src/utils/textLayout.ts
// Measure and lay out markdown/plain text for Konva rendering.

import Konva from 'konva';
import { parseMarkdown } from './markdownParser';

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
    let fontStyle = 'normal';

    if (line.isHeading === 1) {
      lineFontSize = options.fontSize * 1.5;
      fontStyle = 'bold';
    } else if (line.isHeading === 2) {
      lineFontSize = options.fontSize * 1.3;
      fontStyle = 'bold';
    } else if (line.isHeading === 3) {
      lineFontSize = options.fontSize * 1.15;
      fontStyle = 'bold';
    }

    const height = measureTextHeight(line.text, {
      ...options,
      fontSize: lineFontSize,
      fontStyle,
    });

    lines.push({
      text: line.text,
      y: currentY,
      fontSize: lineFontSize,
      fontStyle,
      height,
    });

    currentY += height;
  }

  const result = { lines, height: currentY };
  writeCache(layoutCache, key, result, LAYOUT_CACHE_LIMIT);
  return result;
}
