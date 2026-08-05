import { describe, expect, it } from 'vitest';
import {
  parseObsidianMarkdownFile,
  resolveObsidianLinks,
  slugifyObsidianReference,
} from '../src/utils/obsidianImport';

describe('parseObsidianMarkdownFile', () => {
  it('ignores frontmatter, uses first h1 as title, and extracts tags without removing them from content', () => {
    const parsed = parseObsidianMarkdownFile('Stoicism.md', `---
tags:
  - ignored
aliases:
  - Also ignored
---
# Stoicism

Longer note body with #philosophy and #practice.

[[Marcus Aurelius]] matters here.`);

    expect(parsed.fileStem).toBe('Stoicism');
    expect(parsed.title).toBe('Stoicism');
    expect(parsed.tags).toEqual(['philosophy', 'practice']);
    expect(parsed.content).toContain('Longer note body with #philosophy and #practice.');
    expect(parsed.content).toContain('[[Marcus Aurelius]] matters here.');
    expect(parsed.content).not.toContain('aliases:');
    expect(parsed.content).not.toContain('# Stoicism');
    expect(parsed.wikilinks).toEqual(['Marcus Aurelius']);
  });
});

describe('resolveObsidianLinks', () => {
  it('creates links for imported files and fallback tags for unresolved wikilinks', () => {
    const resolved = resolveObsidianLinks([
      {
        nodeId: 'node-a',
        fileStem: 'Stoicism',
        title: 'Stoicism',
        wikilinks: ['Marcus Aurelius', 'Missing Note', 'folder/Daily Notes|Alias'],
      },
      {
        nodeId: 'node-b',
        fileStem: 'Marcus Aurelius',
        title: 'Meditations',
        wikilinks: [],
      },
      {
        nodeId: 'node-c',
        fileStem: 'Daily Notes',
        title: 'May 2026',
        wikilinks: [],
      },
    ]);

    expect(resolved.links).toEqual([
      { sourceId: 'node-a', targetId: 'node-b' },
      { sourceId: 'node-a', targetId: 'node-c' },
    ]);
    expect(resolved.unresolvedTags.get('node-a')).toEqual(['missing note']);
  });

  it('normalizes obsidian references consistently', () => {
    expect(slugifyObsidianReference('Folder/Deep Note#Section|Alias')).toBe('deep note');
  });
});
