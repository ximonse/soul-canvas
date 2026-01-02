import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHistorySlice, historyInitialState } from '../src/store/slices/historySlice';
import type { MindNode, Session, Synapse } from '../src/types/types';

type TestState = typeof historyInitialState & {
  nodes: Map<string, MindNode>;
  synapses: Synapse[];
  selectedNodeIds: Set<string>;
  sessions: Session[];
  activeSessionId: string | null;
};

const makeNode = (id: string, x = 0, y = 0): MindNode => ({
  id,
  content: 'content',
  x,
  y,
  z: 0,
  tags: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  type: 'text',
});

const makeSession = (id: string, cardIds: string[] = []): Session => ({
  id,
  name: 'Session',
  cardIds,
  viewState: { x: 0, y: 0, zoom: 1 },
  createdAt: 0,
  lastOpened: 0,
});

describe('historySlice', () => {
  let state: TestState;
  let actions: ReturnType<typeof createHistorySlice>;
  let idCounter = 0;

  beforeEach(() => {
    idCounter = 0;
    vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => `uuid-${++idCounter}`);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const initStore = (overrides: Partial<TestState> = {}) => {
    state = {
      ...historyInitialState,
      nodes: new Map(),
      synapses: [],
      selectedNodeIds: new Set(),
      sessions: [],
      activeSessionId: null,
      ...overrides,
    };

    const set = (fn: (s: TestState) => Partial<TestState>) => {
      state = { ...state, ...fn(state) };
    };

    actions = createHistorySlice(set as unknown as (fn: (s: TestState) => Partial<TestState>) => void);
  };

  it('copies selected nodes into clipboard', () => {
    const nodeA = makeNode('a');
    const nodeB = makeNode('b');
    initStore({
      nodes: new Map([
        ['a', nodeA],
        ['b', nodeB],
      ]),
      selectedNodeIds: new Set(['b']),
    });

    actions.copySelectedNodes();

    expect(state.clipboard).toHaveLength(1);
    expect(state.clipboard[0].id).toBe('b');
  });

  it('pastes nodes into active session and selects new copies', () => {
    const nodeA = makeNode('a', 10, 20);
    const nodeB = makeNode('b', 30, 40);
    const session = makeSession('s1', ['a']);
    initStore({
      nodes: new Map([
        ['a', nodeA],
        ['b', nodeB],
      ]),
      clipboard: [nodeA, nodeB],
      activeSessionId: 's1',
      sessions: [session],
    });

    actions.pasteNodes(100, 200);

    expect(state.nodes.size).toBe(4);
    expect(state.selectedNodeIds.has('uuid-1')).toBe(true);
    expect(state.selectedNodeIds.has('uuid-2')).toBe(true);
    const updated = state.sessions.find((s) => s.id === 's1');
    expect(updated).toBeTruthy();
    expect(new Set(updated?.cardIds ?? [])).toEqual(new Set(['a', 'uuid-1', 'uuid-2']));
    expect(state.pendingSave).toBe(true);
  });

  it('does not change sessions when there is no active session', () => {
    const nodeA = makeNode('a', 10, 20);
    initStore({
      nodes: new Map([['a', nodeA]]),
      clipboard: [nodeA],
      sessions: [makeSession('s1', ['a'])],
      activeSessionId: null,
    });

    actions.pasteNodes(50, 50);

    expect(state.sessions[0].cardIds).toEqual(['a']);
  });
});
