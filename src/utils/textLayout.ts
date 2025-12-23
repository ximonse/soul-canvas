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

export function measureTextHeight(text: string, options: TextMeasureOptions): number {
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
  return textNode.height();
}

export function layoutMarkdownText(
  text: string,
  options: TextMeasureOptions
): MarkdownLayoutResult {
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

  return { lines, height: currentY };
}
