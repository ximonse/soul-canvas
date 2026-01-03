// src/utils/zoteroParser.ts

/**
 * Parse Zotero HTML export and split into individual notes
 * Each <p> tag with highlights becomes a separate note
 * Extracts structured data for mapping to MindNode fields
 */
export interface ZoteroNote {
  content: string;        // Ren highlight-text (citat)
  caption?: string;       // Kommentar efter "(pdf)"
  tags: string[];         // Författare + år från citation
  pdfLink?: string;       // zotero://open-pdf/... länken
  pdfName?: string;       // Saniterat PDF-namn för tagg
  zoteroItemKey?: string; // Zotero item key from link
  zoteroLink?: string;    // zotero://select/... länken
  color?: string;         // Highlightfärgen
}

/**
 * Extrahera författare och år från citation-text
 * Input: "(Karlsson Holst och Nilsson, 2022, p. 2)"
 * Output: ["Karlsson Holst och Nilsson", "2022"]
 */
const extractTagsFromCitation = (citationText: string): string[] => {
  const tags: string[] = [];

  // Matcha författare och år: (Författare, YYYY, ...)
  const match = citationText.match(/\(?([^,]+),\s*(\d{4})/);
  if (match) {
    tags.push(match[1].trim());  // Författare
    tags.push(match[2]);         // År
  }

  return tags;
};

/**
 * Extract and sanitize PDF name from link for use as tag
 * Keeps only letters and numbers, replaces everything else with _
 */
const extractPdfName = (pdfLink: string | undefined): string | undefined => {
  if (!pdfLink) return undefined;

  // Try to extract filename from various link formats
  // zotero://open-pdf/library/items/ITEMID?page=1
  // file:///path/to/file.pdf#page=1
  let filename: string | undefined;

  // For zotero:// links, try to get item ID
  const zoteroMatch = pdfLink.match(/\/items\/([A-Z0-9]+)/);
  if (zoteroMatch) {
    filename = zoteroMatch[1];
  } else {
    // For file:// links, extract filename
    const fileMatch = pdfLink.match(/\/([^/]+)\.pdf/i);
    if (fileMatch) {
      filename = fileMatch[1];
    }
  }

  if (!filename) return undefined;

  // Sanitize: keep only letters and numbers, replace everything else with _
  return filename.replace(/[^a-zA-Z0-9]/g, '_');
};


const extractZoteroItemKey = (pdfLink: string | undefined): string | undefined => {
  if (!pdfLink) return undefined;
  const zoteroMatch = pdfLink.match(/\/items\/([A-Z0-9]+)/);
  return zoteroMatch ? zoteroMatch[1] : undefined;
};

const stripMarkdownLinks = (text: string): string => (
  text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
);

const extractQuotedText = (text: string): string => {
  const match = text.match(/[“"]([\s\S]+?)[”"]/);
  return match ? match[1].trim() : '';
};

export const parseZoteroHTML = (html: string): ZoteroNote[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const notes: ZoteroNote[] = [];

  // Find all <p> tags within .zotero-note
  const paragraphs = doc.querySelectorAll('.zotero-note p');

  paragraphs.forEach((p) => {
    // Extract the highlighted text
    const highlight = p.querySelector('.highlight');
    if (!highlight) return;

    // Text kan vara direkt i .highlight eller i en span inuti
    const highlightSpan = highlight.querySelector('span[style]');
    let text = (highlightSpan?.textContent || highlight.textContent)?.trim() || '';

    if (!text) return;

    // Ta bort omgivande citattecken om de finns
    if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('"') && text.endsWith('"'))) {
      text = text.slice(1, -1).trim();
    }

    // Extract background color for accent stripe (från span med style om den finns)
    const style = highlightSpan?.getAttribute('style') || highlight.getAttribute('style') || '';
    const colorMatch = style.match(/background-color:\s*([^;]+)/);
    const color = colorMatch ? colorMatch[1] : undefined;

    // Extract PDF link - stöd både zotero:// och file:// länkar
    let pdfLink: string | undefined;
    const allLinks = p.querySelectorAll('a');
    allLinks.forEach(link => {
      if (link.textContent?.trim().toLowerCase() === 'pdf') {
        pdfLink = link.getAttribute('href') || undefined;
      }
    });

    // Extract Zotero library link from citation
    const citationEl = p.querySelector('.citation');
    const zoteroLinkEl = citationEl?.querySelector('a[href^="zotero://select"]');
    const zoteroLink = zoteroLinkEl?.getAttribute('href') || undefined;
    const citationText = citationEl?.textContent?.trim() || '';

    // Extract tags from citation (författare + år)
    const tags = extractTagsFromCitation(citationText);

    // Extract comment (text after "(pdf)")
    // Zotero format: "...(pdf) Kommentar" eller "...(pdf)  Kommentar"
    const fullText = p.textContent || '';
    let caption: string | undefined;

    // Hitta text efter "(pdf)" - kan vara whitespace mellan
    const pdfIndex = fullText.indexOf('(pdf)');
    if (pdfIndex !== -1) {
      const afterPdf = fullText.slice(pdfIndex + 5).trim();
      if (afterPdf) {
        caption = afterPdf;
      }
    }

    // Content är ren highlight-text (utan citerings-prefix)
    const content = text;

    // Extract and sanitize PDF name for tag
    const pdfName = extractPdfName(pdfLink);
    const zoteroItemKey = extractZoteroItemKey(pdfLink);

    notes.push({
      content,
      caption,
      tags,
      pdfLink,
      pdfName,
      zoteroItemKey,
      zoteroLink,
      color,
    });
  });

  return notes;
};

export const parseZoteroPlainText = (text: string): ZoteroNote[] => {
  if (!text) return [];
  if (!text.includes('zotero://open-pdf')) return [];

  const blocks = text
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const notes: ZoteroNote[] = [];

  for (const block of blocks) {
    if (!block.includes('zotero://open-pdf')) continue;

    const pdfLinkMatch = block.match(/zotero:\/\/open-pdf\/[^\s)]+/);
    if (!pdfLinkMatch) continue;
    const pdfLink = pdfLinkMatch[0];

    const zoteroLinkMatch = block.match(/zotero:\/\/select\/[^\s)]+/);
    const zoteroLink = zoteroLinkMatch ? zoteroLinkMatch[0] : undefined;

    let content = extractQuotedText(block);
    if (!content) {
      const cleaned = stripMarkdownLinks(block).replace(/\s+/g, ' ').trim();
      if (!cleaned) continue;
      content = cleaned;
    }

    const citationMatch = block.match(/\[([^\]]+)\]\(zotero:\/\/select\/[^)]+\)/);
    const citationText = citationMatch?.[1] || '';
    const tags = citationText ? extractTagsFromCitation(citationText) : [];

    const pdfName = extractPdfName(pdfLink);
    const zoteroItemKey = extractZoteroItemKey(pdfLink);

    notes.push({
      content,
      caption: undefined,
      tags,
      pdfLink,
      pdfName,
      zoteroItemKey,
      zoteroLink,
      color: undefined,
    });
  }

  return notes;
};

/**
 * Check if HTML content is a Zotero export
 */
export const isZoteroHTML = (html: string): boolean => {
  return html.includes('class="zotero-notes"') || html.includes('class="zotero-note"');
};

/**
 * Extract a clean title from citation for display
 */
export const extractTitleFromCitation = (citation: string): string => {
  // Try to extract author and year from citation like "(Karlsson Holst och Nilsson, 2022, p. 2)"
  const match = citation.match(/\(([^,]+),\s*(\d{4})/);
  if (match) {
    return `${match[1]} (${match[2]})`;
  }
  return citation.substring(0, 50);
};
