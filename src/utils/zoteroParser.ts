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
  const match = citationText.match(/\(([^,]+),\s*(\d{4})/);
  if (match) {
    tags.push(match[1].trim());  // Författare
    tags.push(match[2]);         // År
  }

  return tags;
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

    notes.push({
      content,
      caption,
      tags,
      pdfLink,
      zoteroLink,
      color,
    });
  });

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