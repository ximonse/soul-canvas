// src/components/MarkdownText.tsx
// Konva-komponent för att rendera text med markdown-rubriker

import React, { useMemo } from 'react';
import { Group, Text } from 'react-konva';
import { parseMarkdown } from '../utils/markdownParser';
import { CARD } from '../utils/constants';

interface MarkdownTextProps {
  text: string;
  x: number;
  y: number;
  width: number;
  fill: string;
  fontSize?: number;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;
}

interface RenderedLine {
  text: string;
  y: number;
  fontSize: number;
  fontStyle: string;
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
}) => {
  const renderedLines = useMemo(() => {
    const parsedLines = parseMarkdown(text);
    const lines: RenderedLine[] = [];

    let currentY = 0;

    for (const line of parsedLines) {
      let lineFontSize = fontSize;
      let fontStyle = 'normal';

      if (line.isHeading === 1) {
        lineFontSize = fontSize * 1.5;
        fontStyle = 'bold';
      } else if (line.isHeading === 2) {
        lineFontSize = fontSize * 1.3;
        fontStyle = 'bold';
      } else if (line.isHeading === 3) {
        lineFontSize = fontSize * 1.15;
        fontStyle = 'bold';
      }

      lines.push({
        text: line.text,
        y: currentY,
        fontSize: lineFontSize,
        fontStyle,
      });

      // Nästa rad börjar efter denna radhöjd
      currentY += lineFontSize * lineHeight;
    }

    return lines;
  }, [text, fontSize, lineHeight]);

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
        />
      ))}
    </Group>
  );
};

export default MarkdownText;
