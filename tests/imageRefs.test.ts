import { describe, expect, it } from 'vitest';
import { findMissingLocalAssets, getImageRef, resolveImageUrl } from '../src/utils/imageRefs';
import type { MindNode } from '../src/types/types';

function node(overrides: Partial<MindNode> = {}): MindNode {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    content: '',
    x: 0, y: 0, z: 0,
    tags: [],
    type: 'image',
    createdAt: '2026-08-08T10:00:00.000Z',
    ...overrides,
  };
}

describe('findMissingLocalAssets', () => {
  it('flags an image node whose assets/ ref is not in the loaded assets map', () => {
    const missing = node({ imageRef: 'assets/gone.png', title: 'Gammal bild' });
    const result = findMissingLocalAssets([missing], {});
    expect(result).toEqual([{ nodeId: missing.id, ref: 'assets/gone.png', label: 'Gammal bild' }]);
  });

  it('does not flag an image node whose asset is present', () => {
    const present = node({ imageRef: 'assets/here.png' });
    const result = findMissingLocalAssets([present], { 'assets/here.png': 'blob:fake-url' });
    expect(result).toEqual([]);
  });

  it('ignores external refs (http/blob/data) since they cannot be verified against disk', () => {
    const remote = node({ imageRef: 'https://example.com/pic.png' });
    const blob = node({ imageRef: 'blob:fake' });
    const dataUri = node({ imageRef: 'data:image/png;base64,aaaa' });
    const result = findMissingLocalAssets([remote, blob, dataUri], {});
    expect(result).toEqual([]);
  });

  it('ignores text-type nodes entirely', () => {
    const textNode = node({ type: 'text', content: 'assets/looks-like-a-path.png' });
    const result = findMissingLocalAssets([textNode], {});
    expect(result).toEqual([]);
  });

  it('falls back to caption then node id when no title is set', () => {
    const noTitle = node({ imageRef: 'assets/gone.png', caption: 'Fångad skiss' });
    const noLabelAtAll = node({ imageRef: 'assets/gone2.png' });
    const result = findMissingLocalAssets([noTitle, noLabelAtAll], {});
    expect(result[0].label).toBe('Fångad skiss');
    expect(result[1].label).toBe(noLabelAtAll.id);
  });
});

describe('resolveImageUrl stays consistent with findMissingLocalAssets', () => {
  it('resolves to null for the same ref findMissingLocalAssets flags as missing', () => {
    const missing = node({ imageRef: 'assets/gone.png' });
    expect(getImageRef(missing)).toBe('assets/gone.png');
    expect(resolveImageUrl(missing, {})).toBeNull();
    expect(findMissingLocalAssets([missing], {})).toHaveLength(1);
  });
});
