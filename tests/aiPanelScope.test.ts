import { describe, expect, it } from 'vitest';
import { getAIPanelScope } from '../src/utils/aiPanelScope';
import type { MindNode, Session, Synapse } from '../src/types/types';

const makeNode = (id: string, embedded = false): MindNode => ({
  id,
  content: `node-${id}`,
  x: 0,
  y: 0,
  z: 0,
  tags: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  type: 'text',
  ...(embedded ? { embedding: [0.1, 0.2, 0.3] } : {}),
});

const makeSession = (id: string, cardIds: string[]): Session => ({
  id,
  name: `session-${id}`,
  cardIds,
  viewState: { x: 0, y: 0, zoom: 1 },
  createdAt: 0,
  lastOpened: 0,
});

const makeSynapse = (id: string, sourceId: string, targetId: string): Synapse => ({
  id,
  sourceId,
  targetId,
  strength: 1,
});

describe('getAIPanelScope', () => {
  it('returns zero counts for an active empty session', () => {
    const scope = getAIPanelScope({
      nodes: new Map([
        ['a', makeNode('a', true)],
        ['b', makeNode('b')],
      ]),
      sessions: [makeSession('empty', [])],
      activeSessionId: 'empty',
      selectedNodeIds: new Set(['a']),
      synapses: [makeSynapse('s1', 'a', 'b')],
    });

    expect(scope.totalCount).toBe(0);
    expect(scope.embeddedCount).toBe(0);
    expect(scope.selectedCount).toBe(0);
    expect(scope.synapses).toEqual([]);
    expect(scope.nodes).toEqual([]);
  });

  it('only counts cards, selection, and synapses inside the active session', () => {
    const scope = getAIPanelScope({
      nodes: new Map([
        ['a', makeNode('a', true)],
        ['b', makeNode('b')],
        ['c', makeNode('c', true)],
      ]),
      sessions: [makeSession('focus', ['a', 'b'])],
      activeSessionId: 'focus',
      selectedNodeIds: new Set(['a', 'c']),
      synapses: [
        makeSynapse('ab', 'a', 'b'),
        makeSynapse('ac', 'a', 'c'),
      ],
    });

    expect(scope.totalCount).toBe(2);
    expect(scope.embeddedCount).toBe(1);
    expect(scope.selectedCount).toBe(1);
    expect(scope.nodes.map((node) => node.id)).toEqual(['a', 'b']);
    expect(scope.selectedNodes.map((node) => node.id)).toEqual(['a']);
    expect(scope.synapses.map((synapse) => synapse.id)).toEqual(['ab']);
  });
});
