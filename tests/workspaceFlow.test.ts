import { afterAll, describe, expect, it, vi } from 'vitest';
import { serializeCanvasDocument, parseCanvasDocument } from '../src/utils/canvasDocument';
import { createWorkspaceBackup, writePortableBackupToDirectory } from '../src/utils/portableBackup';
import { writeSaveSnapshot } from '../src/utils/saveSnapshot';
import { filterNodesByTags, filterNodesBySession } from '../src/utils/nodeFilters';
import { MockDirectoryHandle, MockFileHandle } from './helpers/mockFileSystem';

afterAll(() => vi.unstubAllGlobals());
describe('core workspace flow', () => {
  it('creates and organizes cards, saves/reloads, exports and restores without losing Omnical links or binary assets', async () => {
    // Isolated Node store; never reads browser keys or the user's folders.
    vi.stubGlobal('localStorage', { getItem: () => null });
    const { useBrainStore: store } = await import('../src/store/useBrainStore');
    const source = new MockDirectoryHandle();
    const directory = source as unknown as FileSystemDirectoryHandle;
    store.getState().setFileHandle(directory);
    const sessionId = store.getState().createSession('QA research');
    store.getState().addNodeWithId('text', 'Imported note', 10, 20, 'text');
    store.getState().addNodeWithId('image', '', 40, 50, 'image');
    const link = { omnicalId: 'remote-qa', status: 'linked' as const, path: 'note.md', bodyHash: 'baseline', tagsHash: 'tags' };
    store.getState().updateNode('text', { tags: ['research'], omnicalLink: link });
    store.getState().updateNode('image', { imageRef: 'assets/nested/pic.png' });
    store.getState().addSynapse('text', 'image');
    expect(store.getState().pendingSave).toBe(true);
    const visible = filterNodesBySession([...store.getState().nodes.values()], store.getState().sessions.find((session) => session.id === sessionId)!);
    expect(visible).toHaveLength(2);
    expect(filterNodesByTags(visible, ['research'], []).map((node) => node.id)).toEqual(['text']);
    const assets = await source.getDirectoryHandle('assets', { create: true });
    const nested = await assets.getDirectoryHandle('nested', { create: true });
    const bytes = Uint8Array.of(137, 80, 78, 71, 0, 255, 128);
    nested.files.set('pic.png', new MockFileHandle(new Blob([bytes], { type: 'image/png' })));
    const state = store.getState();
    const document = serializeCanvasDocument({ nodes: [...state.nodes.values()], synapses: state.synapses,
      sessions: state.sessions, conversations: state.conversations, trails: state.trails,
      sequences: state.sequences, activeSessionId: state.activeSessionId,
      trailUi: { selectedTrailIds: state.selectedTrailIds, showActiveTrailLine: state.showActiveTrailLine },
      omnical: state.omnical, cardFiles: state.cardFiles });
    await writeSaveSnapshot(state, store.getState, async () => {
      const writable = await (await directory.getFileHandle('data.json', { create: true })).createWritable();
      await writable.write(JSON.stringify(document));
      await writable.close();
    }, (pending) => store.getState().setPendingSave(pending));
    expect(store.getState().pendingSave).toBe(false);
    const loaded = parseCanvasDocument(JSON.parse(await (await (await directory.getFileHandle('data.json')).getFile()).text()));
    store.getState().loadNodes(loaded.nodes, loaded.synapses);
    store.getState().loadSessions(loaded.sessions);
    expect(store.getState().nodes.get('text')?.omnicalLink).toEqual(link);
    const backup = await createWorkspaceBackup(directory, loaded);
    const target = new MockDirectoryHandle() as unknown as FileSystemDirectoryHandle;
    await writePortableBackupToDirectory(target, JSON.parse(JSON.stringify(backup)));
    const restored = parseCanvasDocument(JSON.parse(await (await (await target.getFileHandle('data.json')).getFile()).text()));
    expect(restored.nodes).toEqual(loaded.nodes);
    expect(restored.sessions).toEqual(loaded.sessions);
    expect(restored.synapses).toEqual(loaded.synapses);
    expect(restored.nodes.find((node) => node.id === 'text')?.omnicalLink).toEqual(link);
    const restoredImage = await (await (await (await target.getDirectoryHandle('assets')).getDirectoryHandle('nested')).getFileHandle('pic.png')).getFile();
    expect(new Uint8Array(await restoredImage.arrayBuffer())).toEqual(bytes);
  });
});
