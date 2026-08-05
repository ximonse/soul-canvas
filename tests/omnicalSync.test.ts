import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseOmnicalMarkdown, writeSharedMarkdown } from '../src/utils/omnicalNotes';

const idb = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: async (key: string) => idb.get(key),
  set: async (key: string, value: unknown) => { idb.set(key, value); },
  del: async (key: string) => { idb.delete(key); },
}));

class MemoryFileHandle {
  readonly kind = 'file' as const;
  constructor(readonly name: string, private readonly read: () => string, private readonly write: (value: string) => void) {}
  async getFile() {
    const source = this.read();
    return { text: async () => source, size: source.length };
  }
  async createWritable() {
    let value = '';
    return {
      write: async (next: string) => { value = next; },
      close: async () => { this.write(value); },
    };
  }
}

class MemoryDirectoryHandle {
  readonly kind = 'directory' as const;
  readonly files = new Map<string, string>();
  readonly directories = new Map<string, MemoryDirectoryHandle>();
  constructor(readonly name: string) {}
  async queryPermission() { return 'granted' as const; }
  async requestPermission() { return 'granted' as const; }
  async getFileHandle(name: string, options?: { create?: boolean }) {
    if (!this.files.has(name) && !options?.create) throw new DOMException('Missing', 'NotFoundError');
    if (!this.files.has(name)) this.files.set(name, '');
    return new MemoryFileHandle(name, () => this.files.get(name) ?? '', (value) => this.files.set(name, value));
  }
  async getDirectoryHandle(name: string) {
    const directory = this.directories.get(name);
    if (!directory) throw new DOMException('Missing', 'NotFoundError');
    return directory;
  }
  async *entries(): AsyncIterableIterator<[string, MemoryFileHandle | MemoryDirectoryHandle]> {
    for (const name of this.files.keys()) yield [name, await this.getFileHandle(name)];
    for (const entry of this.directories) yield entry;
  }
}

const markdown = (body = 'Original', tags = ['start']) => [
  '---',
  'omnicalId: "note-1"',
  'date: "2026-08-05"',
  'done: false',
  'custom: "bevara"',
  'tags: ' + JSON.stringify(tags),
  'updated: "2026-08-05T10:00:00.000Z"',
  '---',
  '',
  body,
  '',
].join('\n');

type BrainStoreModule = typeof import('../src/store/useBrainStore');
type SyncModule = typeof import('../src/utils/omnicalSync');

let brain: BrainStoreModule;
let sync: SyncModule;
let root: MemoryDirectoryHandle;
const storage = new Map<string, string>();

beforeAll(async () => {
  const events = new EventTarget();
  const fakeWindow = Object.assign(events, {
    confirm: vi.fn(() => true),
    showDirectoryPicker: vi.fn(),
    setTimeout,
    clearTimeout,
  });
  vi.stubGlobal('window', fakeWindow);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  brain = await import('../src/store/useBrainStore');
  sync = await import('../src/utils/omnicalSync');
});

beforeEach(async () => {
  root = new MemoryDirectoryHandle('Omnical');
  root.files.set('note.md', markdown());
  vi.mocked(window.showDirectoryPicker).mockResolvedValue(root as unknown as FileSystemDirectoryHandle);
  vi.mocked(window.confirm).mockReturnValue(true);
  brain.useBrainStore.setState({
    nodes: new Map(),
    sessions: [],
    activeSessionId: null,
    synapses: [],
    omnical: { pendingFiles: [], ignoredNoteIds: [] },
    omnicalConflicts: [],
    omnicalSyncStatus: 'disconnected',
    omnicalSyncMessage: null,
    pendingSave: false,
  });
  await sync.disconnectOmnicalFolder();
});

afterAll(() => {
  vi.unstubAllGlobals();
});

describe('Omnical folder round trip', () => {
  it('imports, writes shared fields only, and reads a later Markdown edit', async () => {
    await sync.connectOmnicalFolder();
    let state = brain.useBrainStore.getState();
    const linked = [...state.nodes.values()][0];
    expect(linked.content).toBe('Original');
    expect(linked.tags).toEqual(['start']);
    expect(state.sessions.find((session) => session.name === 'Omnical')?.cardIds).toContain(linked.id);

    state.updateNode(linked.id, { content: 'Ändrad i Soul', tags: ['delad'] });
    await sync.syncOmnicalNotes();
    const afterSoul = root.files.get('note.md')!;
    expect(afterSoul).toContain('Ändrad i Soul');
    expect(afterSoul).toContain('tags: ["delad"]');
    expect(afterSoul).toContain('done: false');
    expect(afterSoul).toContain('custom: "bevara"');

    const parsed = parseOmnicalMarkdown(afterSoul, 'note.md')!;
    root.files.set('note.md', writeSharedMarkdown(parsed, 'Ändrad i Omnical', ['extern']));
    await sync.syncOmnicalNotes();
    state = brain.useBrainStore.getState();
    expect(state.nodes.get(linked.id)).toMatchObject({ content: 'Ändrad i Omnical', tags: ['extern'] });
  });

  it('creates a conflict copy and never deletes Markdown when Soul removes a linked card', async () => {
    await sync.connectOmnicalFolder();
    let state = brain.useBrainStore.getState();
    const linked = [...state.nodes.values()][0];

    state.updateNode(linked.id, { content: 'Soul-version' });
    const remote = parseOmnicalMarkdown(root.files.get('note.md')!, 'note.md')!;
    root.files.set('note.md', writeSharedMarkdown(remote, 'Omnical-version', remote.tags));
    await sync.syncOmnicalNotes();

    state = brain.useBrainStore.getState();
    expect(state.omnicalConflicts).toHaveLength(1);
    await sync.resolveOmnicalConflict(state.omnicalConflicts[0].id, 'both');
    state = brain.useBrainStore.getState();
    expect([...state.nodes.values()].some((node) => !node.omnicalLink && node.content === 'Soul-version')).toBe(true);
    expect(state.nodes.get(linked.id)?.content).toBe('Omnical-version');

    state.removeNode(linked.id);
    state = brain.useBrainStore.getState();
    expect(state.omnical.ignoredNoteIds).toContain('note-1');
    expect(root.files.has('note.md')).toBe(true);
    await sync.syncOmnicalNotes();
    expect([...brain.useBrainStore.getState().nodes.values()].some((node) => node.omnicalLink?.omnicalId === 'note-1')).toBe(false);
  });

  it('keeps a linked card detached when its Omnical file disappears', async () => {
    await sync.connectOmnicalFolder();
    const linked = [...brain.useBrainStore.getState().nodes.values()][0];
    root.files.delete('note.md');

    await sync.syncOmnicalNotes();

    expect(brain.useBrainStore.getState().nodes.get(linked.id)?.omnicalLink?.status).toBe('detached');
  });
});
