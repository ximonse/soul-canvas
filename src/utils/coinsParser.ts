// src/utils/coinsParser.ts

import type { RisMetadata } from './risParser';

const decodeMaybe = (value: string) => {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
};

const extractYear = (value: string) => {
  const match = value.match(/\b\d{4}\b/);
  return match ? match[0] : value;
};

const extractDoi = (value: string) => {
  const match = value.match(/10\.\d{4,9}\/[^\s]+/i);
  return match ? match[0] : '';
};

export const parseCoinsHtml = (html: string): RisMetadata | null => {
  if (!html.trim()) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const span = doc.querySelector('span.Z3988');
  if (!span) return null;
  const title = span.getAttribute('title');
  if (!title) return null;

  const params = new URLSearchParams(title.replace(/&amp;/g, '&'));
  const metadata: RisMetadata = { authors: [], keywords: [] };

  const authors = params.getAll('rft.au').map(decodeMaybe).filter(Boolean);
  if (authors.length > 0) {
    metadata.authors.push(...authors);
  } else {
    const last = params.get('rft.aulast');
    const first = params.get('rft.aufirst');
    if (last) {
      metadata.authors.push(
        first ? `${decodeMaybe(last)}, ${decodeMaybe(first)}` : decodeMaybe(last)
      );
    }
  }

  const titleValue = params.get('rft.title');
  if (titleValue) metadata.title = decodeMaybe(titleValue);

  const dateValue = params.get('rft.date');
  if (dateValue) metadata.year = extractYear(decodeMaybe(dateValue));

  const keywords = params.getAll('rft.subject').concat(params.getAll('rft.keywords'));
  keywords.forEach((keyword) => {
    const clean = decodeMaybe(keyword).trim();
    if (clean) metadata.keywords.push(clean);
  });

  const idValues = params.getAll('rft_id').concat(params.getAll('rft.identifier'));
  for (const raw of idValues) {
    const decoded = decodeMaybe(raw);
    if (!metadata.doi) {
      const doi = extractDoi(decoded);
      if (doi) metadata.doi = doi;
    }
    if (!metadata.url) {
      if (decoded.startsWith('http')) metadata.url = decoded;
    }
  }

  if (!metadata.url && metadata.doi) {
    metadata.url = `https://doi.org/${metadata.doi}`;
  }

  return metadata;
};
