// src/components/MarkdownText.tsx
// Konva-komponent för att rendera text med markdown-rubriker

import React, { useMemo } from 'react';
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

  return (
    <Group x={x} y={y}>
      {renderedLines.map((line, i) => (
        <Text
          key={i}
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
      ))}
    </Group>
  );
};

export default React.memo(MarkdownText);
