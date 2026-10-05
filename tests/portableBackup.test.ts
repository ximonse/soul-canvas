import { describe, expect, it } from 'vitest';
import { createEmptyCanvasDocument, parseCanvasDocument, serializeCanvasDocument } from '../src/utils/canvasDocument';
import { createPortableBackup, createWorkspaceBackup, parsePortableBackup, writePortableBackupToDirectory } from '../src/utils/portableBackup';
import { blobToDataUrl } from '../src/utils/backupAssets';
import type { MindNode, Session } from '../src/types/types';
import { MockDirectoryHandle, MockFileHandle } from './helpers/mockFileSystem';

describe('portable backup', () => {
  it('keeps a complete document and asset payload', () => {
    const document = createEmptyCanvasDocument();
    const backup = createPortableBackup(document, { 'assets/card.jpg': 'data:image/jpeg;base64,AA==' });

    expect(parsePortableBackup(JSON.parse(JSON.stringify(backup)))).toEqual(backup);
  });

  it('rejects unrelated JSON before any restore can begin', () => {
    expect(() => parsePortableBackup({ nodes: [] })).toThrow('inte en Soul Canvas-backup');
  });
});

// The acceptance criterion from docs/STABLE_LOCAL_V1_PLAN.md: "Exporten ska
// kunna importeras i en tom lokal workspace och ge samma noder, synapser,
// sessioner och bildreferenser." This drives the actual disk-write path
// (writePortableBackupToDirectory, also used by usePortableBackup's
// restoreBackup) against a fresh, empty mock directory — not just
// JSON.stringify/parse of the in-memory objects.
describe('portable backup roundtrip into an empty workspace', () => {
  it('restores the same nodes, synapses, sessions and image asset bytes', async () => {
    const textNode: MindNode = {
      id: 'n1', type: 'text', content: 'Anteckning', x: 10, y: 20, z: 0, tags: ['a'],
      createdAt: '2026-08-08T10:00:00.000Z',
    };
    const imageNode: MindNode = {
      id: 'n2', type: 'image', content: '', imageRef: 'assets/pic.png', x: 30, y: 40, z: 0, tags: [],
      createdAt: '2026-08-08T10:00:00.000Z',
    };
    const session: Session = {
      id: 's1', name: 'Session 1', cardIds: ['n1', 'n2'],
      viewState: { x: 0, y: 0, zoom: 1 },
      createdAt: 1754640000000, lastOpened: 1754640000000,
    };

    const sourceDocument = serializeCanvasDocument({
      nodes: [textNode, imageNode],
      synapses: [{ id: 'syn1', sourceId: 'n1', targetId: 'n2', strength: 1 }],
      conversations: [],
      sessions: [session],
      trails: [],
      sequences: [],
      activeSessionId: 's1',
      trailUi: { selectedTrailIds: [], showActiveTrailLine: true },
      omnical: { pendingFiles: [], ignoredNoteIds: [] },
      cardFiles: {},
    });

    // Non-text bytes expose corruption that a Blob.text() mock would hide.
    const originalAssetBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 255, 128, 254]);
    const originalPdfBytes = Uint8Array.from([37, 80, 68, 70, 0, 255, 129]);
    const source = new MockDirectoryHandle();
    const sourceAssets = await source.getDirectoryHandle('assets', { create: true });
    sourceAssets.files.set('pic.png', new MockFileHandle(new Blob([originalAssetBytes], { type: 'image/png' })));
    const originals = await sourceAssets.getDirectoryHandle('originals', { create: true });
    originals.files.set('paper.pdf', new MockFileHandle(new Blob([originalPdfBytes], { type: 'application/pdf' })));
    const backup = await createWorkspaceBackup(source as unknown as FileSystemDirectoryHandle, sourceDocument);
    expect(backup.manifest?.assetCount).toBe(2);
    expect(backup.manifest?.assets.find((asset) => asset.path.endsWith('paper.pdf'))?.role).toBe('original');

    // Round-trip through JSON exactly like a real export file would.
    const parsedBackup = parsePortableBackup(JSON.parse(JSON.stringify(backup)));

    // "Tom lokal workspace": a brand new directory with nothing in it.
    const emptyWorkspace = new MockDirectoryHandle() as unknown as FileSystemDirectoryHandle;
    await writePortableBackupToDirectory(emptyWorkspace, parsedBackup);

    // Read data.json back the same way readDirectory() does on folder open.
    const dataFileHandle = await emptyWorkspace.getFileHandle('data.json');
    const restoredDocument = parseCanvasDocument(JSON.parse(await (await dataFileHandle.getFile()).text()));

    expect(restoredDocument.nodes).toEqual(sourceDocument.nodes);
    expect(restoredDocument.synapses).toEqual(sourceDocument.synapses);
    expect(restoredDocument.sessions).toEqual(sourceDocument.sessions);
    expect(restoredDocument.activeSessionId).toBe('s1');

    // Read the asset back the same way readDirectory() enumerates assets/.
    const assetsDir = await emptyWorkspace.getDirectoryHandle('assets');
    const restoredAssetHandle = await assetsDir.getFileHandle('pic.png');
    const restoredAsset = await restoredAssetHandle.getFile();
    expect(new Uint8Array(await restoredAsset.arrayBuffer())).toEqual(originalAssetBytes);
    expect(restoredAsset.type).toBe('image/png');
    const restoredOriginal = await (await (await assetsDir.getDirectoryHandle('originals')).getFileHandle('paper.pdf')).getFile();
    expect(new Uint8Array(await restoredOriginal.arrayBuffer())).toEqual(originalPdfBytes);
  });
});

describe('backup preflight', () => {
  it('rejects a malformed final asset before creating anything', async () => {
    const target = new MockDirectoryHandle();
    const backup = createPortableBackup(createEmptyCanvasDocument(), {
      'assets/good.png': 'data:image/png;base64,AA==', 'assets/bad.png': 'bad',
    });
    await expect(writePortableBackupToDirectory(target as unknown as FileSystemDirectoryHandle, backup)).rejects.toThrow();
    expect(target.files.size).toBe(0);
    expect(target.dirs.size).toBe(0);
  });

  it('rejects valid-base64 corruption using the manifest before any write', async () => {
    const source = new MockDirectoryHandle();
    const assets = await source.getDirectoryHandle('assets', { create: true });
    assets.files.set('pic.png', new MockFileHandle(new Blob([Uint8Array.of(0, 255)], { type: 'image/png' })));
    const backup = await createWorkspaceBackup(source as unknown as FileSystemDirectoryHandle, createEmptyCanvasDocument());
    backup.assets['assets/pic.png'] = await blobToDataUrl(new Blob([Uint8Array.of(0, 254)], { type: 'image/png' }));
    const target = new MockDirectoryHandle();
    await expect(writePortableBackupToDirectory(target as unknown as FileSystemDirectoryHandle, backup)).rejects.toThrow('skadad');
    expect(target.dirs.size).toBe(0);
    expect(target.files.size).toBe(0);
  });

  it('refuses an occupied workspace without overwriting its document or cards', async () => {
    const target = new MockDirectoryHandle();
    target.files.set('data.json', new MockFileHandle('keep me'));
    const cards = await target.getDirectoryHandle('cards', { create: true });
    cards.files.set('note.md', new MockFileHandle('keep the note'));
    await expect(writePortableBackupToDirectory(target as unknown as FileSystemDirectoryHandle,
      createPortableBackup(createEmptyCanvasDocument(), {}))).rejects.toThrow('tom mapp');
    expect(await (await target.files.get('data.json')!.getFile()).text()).toBe('keep me');
    expect(await (await cards.files.get('note.md')!.getFile()).text()).toBe('keep the note');
  });

  it.each(['assets/../bad', 'assets/a\\bad', 'assets/a/', 'assets//bad', 'outside.png'])(
    'rejects unsafe path %s before writing', async (path) => {
      const target = new MockDirectoryHandle();
      const backup = createPortableBackup(createEmptyCanvasDocument(), { [path]: 'data:image/png;base64,AA==' });
      await expect(writePortableBackupToDirectory(target as unknown as FileSystemDirectoryHandle, backup)).rejects.toThrow('bilageväg');
      expect(target.dirs.size).toBe(0);
    },
  );

  it('validates document collections before any write', async () => {
    const target = new MockDirectoryHandle();
    const backup = createPortableBackup(createEmptyCanvasDocument(), {});
    Object.assign(backup.document, { sessions: 'invalid' });
    await expect(writePortableBackupToDirectory(target as unknown as FileSystemDirectoryHandle, backup)).rejects.toThrow('sessions');
    expect(target.files.size).toBe(0);
  });
});
