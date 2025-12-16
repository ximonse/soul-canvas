// src/utils/markdownParser.ts
// Enkel parser för markdown-rubriker

export interface ParsedLine {
  text: string;
  isHeading?: 1 | 2 | 3;
}

/**
 * Parsar en rad text och returnerar text med ev. rubriknivå
 */
function parseLine(line: string): ParsedLine {
  // H3: ### text
  const h3Match = line.match(/^###\s+(.*)$/);
  if (h3Match) {
    return { text: h3Match[1], isHeading: 3 };
  }

  // H2: ## text
  const h2Match = line.match(/^##\s+(.*)$/);
  if (h2Match) {
    return { text: h2Match[1], isHeading: 2 };
  }

  // H1: # text
  const h1Match = line.match(/^#\s+(.*)$/);
  if (h1Match) {
    return { text: h1Match[1], isHeading: 1 };
  }

  // Vanlig text
  return { text: line };
}

/**
 * Parsar markdown-text och returnerar array av parsade rader
 */
export function parseMarkdown(text: string): ParsedLine[] {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.map(line => parseLine(line));
}
