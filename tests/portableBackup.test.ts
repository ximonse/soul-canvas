import { describe, expect, it } from 'vitest';
import { createEmptyCanvasDocument, parseCanvasDocument, serializeCanvasDocument } from '../src/utils/canvasDocument';
import { createPortableBackup, parsePortableBackup, writePortableBackupToDirectory } from '../src/utils/portableBackup';
import type { MindNode, Session } from '../src/types/types';
import { MockDirectoryHandle } from './helpers/mockFileSystem';

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

    const originalAssetBytes = 'not-really-png-bytes';
    const assetDataUrl = `data:image/png;base64,${Buffer.from(originalAssetBytes).toString('base64')}`;
    const backup = createPortableBackup(sourceDocument, { 'assets/pic.png': assetDataUrl });

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
    const restoredAssetText = await (await restoredAssetHandle.getFile()).text();
    expect(restoredAssetText).toBe(originalAssetBytes);
  });
});
