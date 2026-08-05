export type ImportCardDraft = {
  title?: string;
  content: string;
  tags: string[];
};

const isTagToken = (word: string) => word.startsWith('#') && word.length > 1;

export const parseImportText = (text: string): ImportCardDraft[] => {
  const blocks = text.split(/\n\n+/).filter((block) => block.trim());

  return blocks
    .map((block) => {
      const lines = block.trim().split('\n');
      const lastLine = lines[lines.length - 1]?.trim() ?? '';
      const tagWords = lastLine.split(/\s+/).filter(Boolean);
      const hasTagLine = lines.length > 1 && tagWords.length > 0 && tagWords.every(isTagToken);
      const tags = hasTagLine
        ? (lines.pop() ?? '')
            .split(/\s+/)
            .filter(isTagToken)
            .map((tag) => tag.slice(1).trim())
            .filter(Boolean)
        : [];

      const title = lines[0]?.trim() ?? '';
      const cleanTitle = title.replace(/^#+\s*/, '');
      const rawContent = lines.slice(1).join('\n').trim();

      return {
        title: cleanTitle || undefined,
        content: rawContent || cleanTitle,
        tags,
      };
    })
    .filter((card) => card.content.length > 0 || card.title);
};
