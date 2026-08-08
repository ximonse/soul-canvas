import { describe, expect, it } from 'vitest';
import { scanCardFiles, syncCardFiles } from '../src/utils/cardFileSync';
import { bodyHash, frontmatterHash, nodeToCardFrontmatter, parseCardMarkdown, writeCardMarkdown, type CardFrontmatter } from '../src/utils/cardMarkdown';
import type { MindNode, Session } from '../src/types/types';
import { MockDirectoryHandle, MockFileHandle } from './helpers/mockFileSystem';

const emptyFrontmatter: CardFrontmatter = { id: null, tags: [], semanticTags: [] };

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

async function editFileDirectly(cardsDir: MockDirectoryHandle, filename: string, frontmatter: CardFrontmatter, body: string) {
  const handle = cardsDir.files.get(filename)!;
  const raw = (await handle.getFile()).text_;
  const parsed = parseCardMarkdown(raw, `cards/${filename}`);
  const rewritten = writeCardMarkdown(parsed, frontmatter, body);
  const writable = await handle.createWritable();
  await writable.write(rewritten);
  await writable.close();
}

describe('scanCardFiles', () => {
  it('merges an externally edited file into the node when only the file changed', async () => {
    const dir = root();
    const a = node({ title: 'Original' });
    const first = await syncCardFiles(dir, new Map([[a.id, a]]), {});
    const filename = first.baseline[a.id].mdPath.split('/').pop()!;
    const cardsDir = (dir as unknown as MockDirectoryHandle).dirs.get('cards')!;

    await editFileDirectly(cardsDir, filename, { ...emptyFrontmatter, id: a.id, title: 'Ändrad utanför appen' }, a.content);

    const result = await scanCardFiles(dir, new Map([[a.id, a]]), [], first.baseline);
    expect(result.merged).toBe(1);
    expect(result.conflicts).toBe(0);
    expect(result.nodes.get(a.id)!.title).toBe('Ändrad utanför appen');
  });

  it('leaves the node untouched when the file mtime has not changed since the baseline', async () => {
    const dir = root();
    const a = node({ title: 'Oförändrad' });
    const first = await syncCardFiles(dir, new Map([[a.id, a]]), {});

    const editedInMemory = { ...a, content: 'Redigerat i appen men inte sparat till fil än' };
    const result = await scanCardFiles(dir, new Map([[a.id, editedInMemory]]), [], first.baseline);

    expect(result.merged).toBe(0);
    expect(result.nodes.get(a.id)!.content).toBe(editedInMemory.content);
  });

  it('backs up the losing side and keeps Soul when both sides changed the same field differently', async () => {
    const dir = root();
    const a = node({ content: 'Original' });
    const first = await syncCardFiles(dir, new Map([[a.id, a]]), {});
    const filename = first.baseline[a.id].mdPath.split('/').pop()!;
    const cardsDir = (dir as unknown as MockDirectoryHandle).dirs.get('cards')!;

    // The file changes externally...
    await editFileDirectly(cardsDir, filename, { ...emptyFrontmatter, id: a.id }, 'Disktext');
    // ...while Soul also changed the same field, without having synced yet
    // (baseline still reflects the pre-edit 'Original' content).
    const soulEdited = { ...a, content: 'Souls text' };

    const result = await scanCardFiles(dir, new Map([[a.id, soulEdited]]), [], first.baseline);
    expect(result.conflicts).toBe(1);
    expect(result.nodes.get(a.id)!.content).toBe('Souls text');

    const conflictsDir = cardsDir.dirs.get('.conflicts')!;
    const backedUp = [...conflictsDir.files.values()][0];
    expect((await backedUp.getFile()).text_).toContain('Disktext');
  });

  it('re-links a node to its file when the baseline entry is missing, instead of duplicating it', async () => {
    const dir = root();
    const a = node({ title: 'Ska inte dubbleras' });
    await syncCardFiles(dir, new Map([[a.id, a]]), {});

    // Simulate a lost/cleared baseline: the file and node both still carry
    // the same id, but nothing on Soul's side remembers the link.
    const result = await scanCardFiles(dir, new Map([[a.id, a]]), [], {});
    expect(result.nodes.size).toBe(1);
    expect(result.ingested).toBe(0);
    expect(result.merged).toBe(1);
  });

  it('does not bump updatedAt on a re-link merge when both sides already agree', async () => {
    const dir = root();
    const a = node({ title: 'Identisk', updatedAt: '2020-01-01T00:00:00.000Z' });
    await syncCardFiles(dir, new Map([[a.id, a]]), {});

    // Baseline lost, but the file on disk is byte-identical to the node —
    // re-link must not manufacture a change out of nothing.
    const result = await scanCardFiles(dir, new Map([[a.id, a]]), [], {});
    expect(result.nodes.get(a.id)!.updatedAt).toBe('2020-01-01T00:00:00.000Z');
  });

  it('ingests a brand new external file with no id, minting one and writing it back', async () => {
    const dir = root();
    const cardsDir = new MockDirectoryHandle();
    (dir as unknown as MockDirectoryHandle).dirs.set('cards', cardsDir);
    const content = writeCardMarkdown(null, { ...emptyFrontmatter, title: 'Extern anteckning' }, 'Text skriven i Obsidian');
    cardsDir.files.set('extern.md', new MockFileHandle(content, Date.now()));

    const result = await scanCardFiles(dir, new Map(), [], {});
    expect(result.ingested).toBe(1);
    expect(result.nodes.size).toBe(1);
    const [newNode] = [...result.nodes.values()];
    expect(newNode.title).toBe('Extern anteckning');
    expect(newNode.content).toBe('Text skriven i Obsidian');

    const session = result.sessions.find((s: Session) => s.id === 'soul-external-cards-session');
    expect(session?.cardIds).toContain(newNode.id);

    const rewritten = (await cardsDir.files.get('extern.md')!.getFile()).text_;
    expect(rewritten).toContain(`id: "${newNode.id}"`);
  });

  it('does not re-ingest the same file on a second scan (loop-safety)', async () => {
    const dir = root();
    const cardsDir = new MockDirectoryHandle();
    (dir as unknown as MockDirectoryHandle).dirs.set('cards', cardsDir);
    const content = writeCardMarkdown(null, { ...emptyFrontmatter, title: 'En gång' }, 'Text');
    cardsDir.files.set('en-gang.md', new MockFileHandle(content, Date.now()));

    const first = await scanCardFiles(dir, new Map(), [], {});
    expect(first.ingested).toBe(1);

    const second = await scanCardFiles(dir, first.nodes, first.sessions, first.baseline);
    expect(second.ingested).toBe(0);
    expect(second.merged).toBe(0);
    expect(second.nodes.size).toBe(1);
  });

  it('adopts an id already present in an unrecognized file instead of minting a new one', async () => {
    const dir = root();
    const cardsDir = new MockDirectoryHandle();
    (dir as unknown as MockDirectoryHandle).dirs.set('cards', cardsDir);
    const content = writeCardMarkdown(null, { ...emptyFrontmatter, id: 'copied-id', title: 'Kopierad fil' }, 'Text');
    cardsDir.files.set('kopierad.md', new MockFileHandle(content, Date.now()));

    const result = await scanCardFiles(dir, new Map(), [], {});
    expect(result.ingested).toBe(1);
    expect(result.nodes.has('copied-id')).toBe(true);
  });

  it('excludes cards/.trash and cards/.conflicts from being ingested as new cards', async () => {
    const dir = root();
    const cardsDir = new MockDirectoryHandle();
    (dir as unknown as MockDirectoryHandle).dirs.set('cards', cardsDir);
    const trashDir = new MockDirectoryHandle();
    const conflictsDir = new MockDirectoryHandle();
    cardsDir.dirs.set('.trash', trashDir);
    cardsDir.dirs.set('.conflicts', conflictsDir);
    const strayContent = writeCardMarkdown(null, { ...emptyFrontmatter, title: 'Ska inte plockas in' }, 'Text');
    trashDir.files.set('gammal.md', new MockFileHandle(strayContent, Date.now()));
    conflictsDir.files.set('konflikt.md', new MockFileHandle(strayContent, Date.now()));

    const result = await scanCardFiles(dir, new Map(), [], {});
    expect(result.ingested).toBe(0);
    expect(result.nodes.size).toBe(0);
  });
});
