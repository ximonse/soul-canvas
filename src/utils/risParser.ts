// src/utils/risParser.ts

export type RisMetadata = {
  title?: string;
  year?: string;
  authors: string[];
  keywords: string[];
  doi?: string;
  url?: string;
};

export const parseRis = (text: string): RisMetadata => {
  const metadata: RisMetadata = {
    authors: [],
    keywords: [],
  };

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([A-Z0-9]{2})\s*-\s*(.*)$/);
    if (!match) continue;
    const tag = match[1];
    const value = match[2].trim();
    if (!value) continue;

    switch (tag) {
      case 'TI':
      case 'T1':
        if (!metadata.title) metadata.title = value;
        break;
      case 'AU':
      case 'A1':
        metadata.authors.push(value);
        break;
      case 'PY':
      case 'Y1': {
        if (!metadata.year) {
          const yearMatch = value.match(/\b\d{4}\b/);
          metadata.year = yearMatch ? yearMatch[0] : value;
        }
        break;
      }
      case 'KW':
        metadata.keywords.push(value);
        break;
      case 'DO':
        if (!metadata.doi) metadata.doi = value;
        break;
      case 'UR':
      case 'L1':
        if (!metadata.url) metadata.url = value;
        break;
      default:
        break;
    }
  }

  return metadata;
};
