export interface ParsedObsidianMarkdownFile {
  fileName: string;
  fileStem: string;
  title?: string;
  content: string;
  tags: string[];
  wikilinks: string[];
}

export interface ResolvedObsidianLink {
  sourceId: string;
  targetId: string;
}

export interface ObsidianLinkDraft {
  nodeId: string;
  fileStem: string;
  title?: string;
  wikilinks: string[];
}

const FRONTMATTER_PATTERN = /^---\s*\n[\s\S]*?\n---\s*\n?/;
const H1_PATTERN = /^#\s+(.+)$/m;
const WIKILINK_PATTERN = /!?\[\[([^[\]]+)\]\]/g;
const TAG_PATTERN = /(^|[\s(])#([^\s#]+)/gm;

const unique = (values: string[]) => Array.from(new Set(values));

export const stripMarkdownFrontmatter = (text: string): string => (
  text.replace(FRONTMATTER_PATTERN, '')
);

export const slugifyObsidianReference = (value: string): string => {
  const withoutAlias = value.split('|')[0] ?? value;
  const withoutHeading = withoutAlias.split('#')[0] ?? withoutAlias;
  const withoutFolder = withoutHeading.split('/').pop() ?? withoutHeading;
  return withoutFolder.trim().toLowerCase();
};

export const extractObsidianWikilinks = (text: string): string[] => {
  const links: string[] = [];
  for (const match of text.matchAll(WIKILINK_PATTERN)) {
    const raw = match[1]?.trim();
    if (raw) links.push(raw);
  }
  return unique(links);
};

export const extractObsidianTags = (text: string): string[] => {
  const tags: string[] = [];
  for (const match of text.matchAll(TAG_PATTERN)) {
    const tag = match[2]?.trim().toLowerCase().replace(/[.,;:!?]+$/g, '');
    if (tag) tags.push(tag);
  }
  return unique(tags);
};

export const parseObsidianMarkdownFile = (
  fileName: string,
  rawText: string,
): ParsedObsidianMarkdownFile => {
  const fileStem = fileName.replace(/\.(md|markdown)$/i, '').trim();
  const withoutFrontmatter = stripMarkdownFrontmatter(rawText);
  const titleMatch = withoutFrontmatter.match(H1_PATTERN);
  const title = titleMatch?.[1]?.trim() || undefined;
  const content = title
    ? withoutFrontmatter.replace(H1_PATTERN, '').trim()
    : withoutFrontmatter.trim();

  return {
    fileName,
    fileStem,
    title,
    content: content || title || fileStem,
    tags: extractObsidianTags(content),
    wikilinks: extractObsidianWikilinks(content),
  };
};

export const resolveObsidianLinks = (drafts: ObsidianLinkDraft[]) => {
  const byReference = new Map<string, string>();
  drafts.forEach((draft) => {
    byReference.set(slugifyObsidianReference(draft.fileStem), draft.nodeId);
    if (draft.title) {
      byReference.set(slugifyObsidianReference(draft.title), draft.nodeId);
    }
  });

  const links: ResolvedObsidianLink[] = [];
  const unresolvedTags = new Map<string, string[]>();

  drafts.forEach((draft) => {
    draft.wikilinks.forEach((wikilink) => {
      const reference = slugifyObsidianReference(wikilink);
      const targetId = byReference.get(reference);
      if (targetId && targetId !== draft.nodeId) {
        links.push({ sourceId: draft.nodeId, targetId });
        return;
      }

      const existing = unresolvedTags.get(draft.nodeId) ?? [];
      unresolvedTags.set(draft.nodeId, unique([...existing, reference]));
    });
  });

  return { links, unresolvedTags };
};
