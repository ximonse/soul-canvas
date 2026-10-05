import { describe, expect, it } from 'vitest';
import type { useBrainStore } from '../src/store/useBrainStore';
import { writeSaveSnapshot } from '../src/utils/saveSnapshot';
import { withCardFileLock } from '../src/utils/cardFileSync';

type State = ReturnType<typeof useBrainStore.getState>;
function fixture() {
  let state = {
    nodes: new Map(), synapses: [], conversations: [], sessions: [], trails: [], sequences: [],
    activeSessionId: null, selectedTrailIds: [], showActiveTrailLine: true,
    omnical: { pendingFiles: [], ignoredNoteIds: [] }, cardFiles: {},
    fileHandle: {} as FileSystemDirectoryHandle, pendingSave: true,
  } as unknown as State;
  return {
    get: () => state,
    patch: (patch: Partial<State>) => { state = { ...state, ...patch }; },
    dirty: (pendingSave: boolean) => { state = { ...state, pendingSave }; },
  };
}

describe('save snapshot acknowledgement', () => {
  it('keeps an edit made during the write dirty, then acknowledges the next save', async () => {
    const store = fixture();
    const before = store.get();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const save = writeSaveSnapshot(before, store.get, () => gate, store.dirty);
    store.patch({ nodes: new Map(before.nodes) });
    release();
    expect(await save).toBe(true);
    expect(store.get().pendingSave).toBe(true);
    await writeSaveSnapshot(store.get(), store.get, async () => {}, store.dirty);
    expect(store.get().pendingSave).toBe(false);
  });

  it('does not acknowledge new Omnical merge baselines with an older write', async () => {
    const store = fixture();
    await writeSaveSnapshot(store.get(), store.get, async () => {
      store.patch({ omnical: { pendingFiles: [], ignoredNoteIds: ['remote-note'] } });
    }, store.dirty);
    expect(store.get().pendingSave).toBe(true);
    expect(store.get().omnical.ignoredNoteIds).toEqual(['remote-note']);
  });

  it('serializes an incoming sync behind completion, leaving its changes dirty', async () => {
    const store = fixture();
    let release!: () => void;
    let started!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const ready = new Promise<void>((resolve) => { started = resolve; });
    const order: string[] = [];
    const save = withCardFileLock(() => writeSaveSnapshot(store.get(), store.get, async () => {
      started();
      await gate;
      order.push('saved');
    }, store.dirty));
    await ready;
    const sync = withCardFileLock(async () => {
      order.push('merged');
      store.patch({ nodes: new Map(store.get().nodes), pendingSave: true });
    });
    release();
    await Promise.all([save, sync]);
    expect(order).toEqual(['saved', 'merged']);
    expect(store.get().pendingSave).toBe(true);
  });

  it('preserves dirty state on write failure and does not acknowledge another folder', async () => {
    const store = fixture();
    await expect(writeSaveSnapshot(store.get(), store.get, async () => {
      throw new Error('disk failure');
    }, store.dirty)).rejects.toThrow('disk failure');
    expect(store.get().pendingSave).toBe(true);
    await writeSaveSnapshot(store.get(), store.get, async () => {
      store.patch({ fileHandle: {} as FileSystemDirectoryHandle });
    }, store.dirty);
    expect(store.get().pendingSave).toBe(true);
  });

  it('ignores transient selection changes', async () => {
    const store = fixture();
    await writeSaveSnapshot(store.get(), store.get, async () => {
      store.patch({ selectedNodeIds: new Set(['selected']) });
    }, store.dirty);
    expect(store.get().pendingSave).toBe(false);
  });
});
