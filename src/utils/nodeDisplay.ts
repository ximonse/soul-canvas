import type { MindNode } from '../types/types';
import { parseMarkdown } from './markdownParser';

export const getNodeDisplayTitle = (node: MindNode): string | null => {
  const title = node.title?.trim();
  if (title) return title;
  if (node.type !== 'text') return null;
  const line = parseMarkdown(node.content || '').find(
    (entry) => entry.isHeading && entry.text.trim(),
  );
  return line?.text?.trim() ?? null;
};
