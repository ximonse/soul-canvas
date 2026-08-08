import { describe, expect, it } from 'vitest';
import {
  bodyHash,
  frontmatterHash,
  parseCardMarkdown,
  planCardMerge,
  writeCardMarkdown,
  type CardFrontmatter,
} from '../src/utils/cardMarkdown';

const emptyFrontmatter: CardFrontmatter = { id: null, tags: [], semanticTags: [] };

function frontmatter(overrides: Partial<CardFrontmatter> = {}): CardFrontmatter {
  return { ...emptyFrontmatter, ...overrides };
}

const source = [
  '---',
  'id: "card-1"',
  'date: "2026-08-08"',
  '# foreign comment',
  'custom: "räksmörgås"',
  'tags: ["skola"]',
  'semanticTags: ["fotosyntes", "cellandning"]',
  'done: false',
  'title: "Mitt kort"',
  '---',
  '',
  'Brödtext #inline',
  '',
].join('\r\n');

describe('card markdown contract', () => {
  it('parses id, owned scalar/array fields, and inline tags', () => {
    const parsed = parseCardMarkdown(source, 'cards/card-1.md')!;
    expect(parsed.frontmatter.id).toBe('card-1');
    expect(parsed.frontmatter.title).toBe('Mitt kort');
    expect(parsed.frontmatter.done).toBe(false);
    expect(parsed.frontmatter.tags).toEqual(['skola', 'inline']);
    expect(parsed.frontmatter.semanticTags).toEqual(['fotosyntes', 'cellandning']);
    expect(parsed.body).toBe('Brödtext #inline');
    expect(parsed.lineEnding).toBe('\r\n');
  });

  it('returns a null id for a file without one, instead of rejecting it', () => {
    const noId = ['---', 'title: "Ny anteckning"', '---', '', 'Text', ''].join('\n');
    const parsed = parseCardMarkdown(noId, 'cards/new.md')!;
    expect(parsed.frontmatter.id).toBeNull();
    expect(parsed.frontmatter.title).toBe('Ny anteckning');
  });

  it('writes owned fields while preserving unrelated frontmatter and comments byte-for-byte', () => {
    const parsed = parseCardMarkdown(source, 'cards/card-1.md')!;
    const written = writeCardMarkdown(parsed, frontmatter({
      id: 'card-1',
      title: 'Nytt namn',
      tags: ['skola'],
      semanticTags: ['fotosyntes', 'cellandning'],
    }), 'Ny brödtext');

    expect(written).toContain('date: "2026-08-08"\r\n# foreign comment\r\ncustom: "räksmörgås"');
    expect(written).toContain('title: "Nytt namn"');
    expect(written.endsWith('Ny brödtext\r\n')).toBe(true);
    expect(written.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('rewrites the semanticTags array without treating it as the tags blocklist', () => {
    const parsed = parseCardMarkdown(source, 'cards/card-1.md')!;
    const written = writeCardMarkdown(parsed, frontmatter({
      id: 'card-1',
      tags: ['skola'],
      semanticTags: ['ny-tagg'],
    }), parsed.body);

    expect(written).toContain('semanticTags: ["ny-tagg"]');
    expect(written).toContain('tags: ["skola"]');
    // the old semanticTags dash-list items must not linger as stray lines
    expect(written).not.toContain('fotosyntes');
    expect(written).not.toContain('cellandning');
  });

  it('never writes a literal null for an unset field or a null id', () => {
    const written = writeCardMarkdown(null, frontmatter({ id: null }), 'Text');
    expect(written).not.toContain('null');
  });

  it('distinguishes a field that was never set from one explicitly cleared to null', () => {
    const neverSet = frontmatterHash(frontmatter({ id: 'x' }));
    const explicitlyNull = frontmatterHash({ ...frontmatter({ id: 'x' }), area: null as unknown as string });
    expect(neverSet).not.toBe(explicitlyNull);
  });

  it('creates a fresh file from scratch when there is nothing to preserve', () => {
    const written = writeCardMarkdown(null, frontmatter({ id: 'card-2', title: 'Nytt kort', tags: ['a'] }), 'Innehåll');
    const reparsed = parseCardMarkdown(written, 'cards/card-2.md')!;
    expect(reparsed.frontmatter.id).toBe('card-2');
    expect(reparsed.frontmatter.title).toBe('Nytt kort');
    expect(reparsed.body).toBe('Innehåll');
  });

  it('keeps frontmatterHash stable across re-serialization of the same owned fields', () => {
    const a = frontmatter({ id: 'x', title: 'Samma', tags: ['t'], done: true });
    const b = frontmatter({ id: 'x', title: 'Samma', tags: ['t'], done: true });
    expect(frontmatterHash(a)).toBe(frontmatterHash(b));
  });

  it('changes frontmatterHash when an owned field differs', () => {
    const a = frontmatter({ id: 'x', title: 'A' });
    const b = frontmatter({ id: 'x', title: 'B' });
    expect(frontmatterHash(a)).not.toBe(frontmatterHash(b));
  });

  it('merges when only one side changed', () => {
    const baseline = { bodyHash: bodyHash('Original'), frontmatterHash: frontmatterHash(frontmatter({ id: 'x', title: 'A' })) };
    const soul = { body: 'Original', frontmatter: frontmatter({ id: 'x', title: 'A' }) };
    const disk = { body: 'Original', frontmatter: frontmatter({ id: 'x', title: 'B' }) };

    const plan = planCardMerge(soul, baseline, disk);
    expect(plan.conflictFields).toEqual([]);
    expect(plan.frontmatter.title).toBe('B');
    expect(plan.writeFrontmatter).toBe(false);
  });

  it('flags a conflict when both sides changed the same field differently', () => {
    const baseline = { bodyHash: bodyHash('Original'), frontmatterHash: frontmatterHash(frontmatter({ id: 'x', title: 'A' })) };
    const soul = { body: 'Soul body', frontmatter: frontmatter({ id: 'x', title: 'A' }) };
    const disk = { body: 'Disk body', frontmatter: frontmatter({ id: 'x', title: 'A' }) };

    const plan = planCardMerge(soul, baseline, disk);
    expect(plan.conflictFields).toEqual(['body']);
  });

  it('does not conflict when both sides reached the same result', () => {
    const baseline = { bodyHash: bodyHash('Original'), frontmatterHash: frontmatterHash(frontmatter({ id: 'x' })) };
    const soul = { body: 'Samma', frontmatter: frontmatter({ id: 'x' }) };
    const disk = { body: 'Samma', frontmatter: frontmatter({ id: 'x' }) };

    const plan = planCardMerge(soul, baseline, disk);
    expect(plan.conflictFields).toEqual([]);
    expect(plan.writeBody).toBe(false);
  });
});
