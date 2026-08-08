import { describe, expect, it } from 'vitest';
import { syncCardFiles } from '../src/utils/cardFileSync';
import { bodyHash, frontmatterHash, nodeToCardFrontmatter, parseCardMarkdown } from '../src/utils/cardMarkdown';
import type { MindNode } from '../src/types/types';
import { MockDirectoryHandle } from './helpers/mockFileSystem';

function node(overrides: Partial<MindNode> = {}): MindNode {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    content: 'Innehåll',
    x: 0, y: 0, z: 0,
    tags: [],
    type: 'text',
    createdAt: '2026-08-08T10:00:00.000Z',
    ...overrides,
  };
}

function root() {
  return new MockDirectoryHandle() as unknown as FileSystemDirectoryHandle;
}

describe('syncCardFiles', () => {
  it('writes a .md file for a new card and records a matching baseline', async () => {
    const dir = root();
    const a = node({ title: 'Fotosyntes' });
    const { baseline, written } = await syncCardFiles(dir, new Map([[a.id, a]]), {});

    expect(written).toBe(1);
    const entry = baseline[a.id];
    expect(entry).toBeDefined();
    expect(entry.mdPath).toMatch(/^cards\/2026-08-08-fotosyntes-/);

    const { frontmatter, body } = nodeToCardFrontmatter(a);
    expect(entry.bodyHash).toBe(bodyHash(body));
    expect(entry.frontmatterHash).toBe(frontmatterHash(frontmatter));
  });

  it('skips writing a card whose hash matches the baseline (no disk write)', async () => {
    const dir = root();
    const a = node({ title: 'Cellandning' });
    const first = await syncCardFiles(dir, new Map([[a.id, a]]), {});
    expect(first.written).toBe(1);

    const cardsDir = (dir as unknown as MockDirectoryHandle).dirs.get('cards')!;
    const filename = first.baseline[a.id].mdPath.split('/').pop()!;
    const before = cardsDir.files.get(filename)!;
    const beforeMtime = (await before.getFile()).lastModified;

    const second = await syncCardFiles(dir, new Map([[a.id, a]]), first.baseline);
    expect(second.written).toBe(0);
    const after = cardsDir.files.get(filename)!;
    expect((await after.getFile()).lastModified).toBe(beforeMtime);
  });

  it('rewrites only the card whose content actually changed', async () => {
    const dir = root();
    const a = node({ title: 'A' });
    const b = node({ title: 'B' });
    const first = await syncCardFiles(dir, new Map([[a.id, a], [b.id, b]]), {});
    expect(first.written).toBe(2);

    const changedA = { ...a, content: 'Nytt innehåll' };
    const second = await syncCardFiles(dir, new Map([[changedA.id, changedA], [b.id, b]]), first.baseline);
    expect(second.written).toBe(1);
    expect(second.baseline[a.id].bodyHash).toBe(bodyHash('Nytt innehåll'));
    expect(second.baseline[b.id]).toEqual(first.baseline[b.id]);
  });

  it('preserves foreign frontmatter when rewriting an existing card file', async () => {
    const dir = root();
    const a = node({ id: 'card-x', title: 'Original' });
    const first = await syncCardFiles(dir, new Map([[a.id, a]]), {});
    const filename = first.baseline[a.id].mdPath.split('/').pop()!;
    const cardsDir = (dir as unknown as MockDirectoryHandle).dirs.get('cards')!;

    // Simulate a human hand-editing the file to add a foreign property.
    const handle = cardsDir.files.get(filename)!;
    const raw = (await handle.getFile()).text_;
    const withForeignKey = raw.replace('---\n', '---\ncustom: "räksmörgås"\n');
    const writable = await handle.createWritable();
    await writable.write(withForeignKey);
    await writable.close();

    const changedA = { ...a, title: 'Ändrad' };
    await syncCardFiles(dir, new Map([[changedA.id, changedA]]), first.baseline);

    const finalText = (await cardsDir.files.get(filename)!.getFile()).text_;
    expect(finalText).toContain('custom: "räksmörgås"');
    expect(finalText).toContain('title: "Ändrad"');
  });

  it('moves a card to cards/.trash/ when its node no longer exists', async () => {
    const dir = root();
    const a = node({ title: 'Ska bort' });
    const first = await syncCardFiles(dir, new Map([[a.id, a]]), {});
    const filename = first.baseline[a.id].mdPath.split('/').pop()!;

    const second = await syncCardFiles(dir, new Map(), first.baseline);
    expect(second.trashed).toBe(1);
    expect(second.baseline[a.id]).toBeUndefined();

    const cardsDir = (dir as unknown as MockDirectoryHandle).dirs.get('cards')!;
    expect(cardsDir.files.has(filename)).toBe(false);
    const trashDir = cardsDir.dirs.get('.trash')!;
    expect(trashDir.files.has(filename)).toBe(true);
  });

  it('reuses the original filename across edits instead of renaming on title change', async () => {
    const dir = root();
    const a = node({ title: 'Första titeln' });
    const first = await syncCardFiles(dir, new Map([[a.id, a]]), {});
    const renamed = { ...a, title: 'Helt annan titel' };
    const second = await syncCardFiles(dir, new Map([[renamed.id, renamed]]), first.baseline);

    expect(second.baseline[a.id].mdPath).toBe(first.baseline[a.id].mdPath);
  });

  it('round-trips through parseCardMarkdown with the id and owned fields intact', async () => {
    const dir = root();
    const a = node({ title: 'Rundtur', tags: ['skola'], done: true });
    const { baseline } = await syncCardFiles(dir, new Map([[a.id, a]]), {});
    const filename = baseline[a.id].mdPath.split('/').pop()!;
    const cardsDir = (dir as unknown as MockDirectoryHandle).dirs.get('cards')!;
    const raw = (await cardsDir.files.get(filename)!.getFile()).text_;

    const parsed = parseCardMarkdown(raw, baseline[a.id].mdPath)!;
    expect(parsed.frontmatter.id).toBe(a.id);
    expect(parsed.frontmatter.title).toBe('Rundtur');
    expect(parsed.frontmatter.tags).toEqual(['skola']);
    expect(parsed.frontmatter.done).toBe(true);
  });
});
