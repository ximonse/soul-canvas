import type { MindNode } from '../types/types';

const isLikelyImageRef = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return (
    lower.startsWith('assets/') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://') ||
    lower.startsWith('blob:') ||
    lower.startsWith('data:image')
  );
};

export const getImageRef = (node: MindNode): string | null => {
  if (node.type !== 'image') return null;
  if (node.imageRef?.trim()) return node.imageRef.trim();
  if (node.content && isLikelyImageRef(node.content)) return node.content.trim();
  return null;
};

export const resolveImageUrl = (
  node: MindNode,
  assets: Record<string, string>
): string | null => {
  const ref = getImageRef(node);
  if (!ref) return null;

  // Check if it's a direct URL (http, https, blob, data)
  if (ref.startsWith('http://') ||
    ref.startsWith('https://') ||
    ref.startsWith('blob:') ||
    ref.startsWith('data:image')) {
    return ref;
  }

  // Check if it's in assets (either with assets/ prefix or direct key)
  if (ref.startsWith('assets/')) {
    return assets[ref] || null;
  }

  // Check if ref is a direct asset key (for cropped images etc)
  if (assets[ref]) {
    return assets[ref];
  }

  return null;
};

export const getImageText = (node: MindNode): string => {
  if (node.type !== 'image') return node.content || '';
  const content = node.content?.trim() || '';
  const imageRef = getImageRef(node);
  const contentIsImageRef = imageRef ? content === imageRef : false;
  if (content && !contentIsImageRef) return content;
  return node.ocrText || node.comment || '';
};
