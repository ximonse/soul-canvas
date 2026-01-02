// src/utils/markdownParser.ts
// Simple parser for markdown headings and inline emphasis.

export interface MarkdownSegment {
  text: string;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic';
}

export interface ParsedLine {
  text: string;
  isHeading?: 1 | 2 | 3;
  fontStyle?: 'normal' | 'bold' | 'italic' | 'bold italic';
  segments?: MarkdownSegment[];
}

/**
 * Parses a line and returns text with optional heading info.
 */
const INLINE_PATTERN = /\*\*\*([^*]+)\*\*\*|___([^_]+)___|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_/g;

const parseInlineMarkdown = (text: string): { segments: MarkdownSegment[]; plainText: string; hasFormatting: boolean } => {
  const segments: MarkdownSegment[] = [];
  let lastIndex = 0;
  let hasFormatting = false;

  INLINE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = INLINE_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    const matchedText = match[1] || match[2] || match[3] || match[4] || match[5] || match[6] || '';
    if (matchedText) {
      let fontStyle: MarkdownSegment['fontStyle'] = 'italic';
      if (match[1] || match[2]) {
        fontStyle = 'bold italic';
      } else if (match[3] || match[4]) {
        fontStyle = 'bold';
      }
      segments.push({ text: matchedText, fontStyle });
      hasFormatting = true;
    }

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  if (segments.length === 0) {
    segments.push({ text });
  }

  const plainText = segments.map((segment) => segment.text).join('');
  return { segments, plainText, hasFormatting };
};

function parseLine(line: string): ParsedLine {
  // H3: ### text
  const h3Match = line.match(/^###\s*(.+)$/);
  if (h3Match) {
    const inline = parseInlineMarkdown(h3Match[1]);
    return { text: inline.plainText, isHeading: 3, segments: inline.segments };
  }

  // H2: ## text
  const h2Match = line.match(/^##\s*(.+)$/);
  if (h2Match) {
    const inline = parseInlineMarkdown(h2Match[1]);
    return { text: inline.plainText, isHeading: 2, segments: inline.segments };
  }

  // H1: # text
  const h1Match = line.match(/^#\s*(.+)$/);
  if (h1Match) {
    const inline = parseInlineMarkdown(h1Match[1]);
    return { text: inline.plainText, isHeading: 1, segments: inline.segments };
  }

  const trimmed = line.trim();

  const emphasisMatch = trimmed.match(/^\*\*\*.+\*\*\*$/)
    || trimmed.match(/^___.+___$/)
    || trimmed.match(/^\*\*.+\*\*$/)
    || trimmed.match(/^__.+__$/)
    || trimmed.match(/^\*.+\*$/)
    || trimmed.match(/^_.+_$/);
  if (emphasisMatch) {
    const inline = parseInlineMarkdown(trimmed);
    return { text: inline.plainText, segments: inline.segments };
  }

  // Bullet list: - item or * item (with or without space)
  const bulletMatch = line.match(/^\s*[-*]\s*(.+)$/);
  if (bulletMatch) {
    const inline = parseInlineMarkdown(bulletMatch[1]);
    const prefix = '\u2022 ';
    return {
      text: `${prefix}${inline.plainText}`,
      segments: [{ text: prefix }, ...inline.segments],
    };
  }

  const inline = parseInlineMarkdown(line);
  if (inline.hasFormatting) {
    return { text: inline.plainText, segments: inline.segments };
  }

  // Vanlig text
  return { text: line };
}

/**
 * Parses markdown text and returns parsed lines.
 */
export function parseMarkdown(text: string): ParsedLine[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.map(line => parseLine(line));
}
