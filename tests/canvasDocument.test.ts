import { describe, expect, it } from 'vitest';
import {
  CANVAS_DOCUMENT_VERSION,
  createEmptyCanvasDocument,
  parseCanvasDocument,
  serializeCanvasDocument,
} from '../src/utils/canvasDocument';

describe('CanvasDocumentV2', () => {
  it('migrates the legacy folder document shape without dropping core data', () => {
    const document = parseCanvasDocument({
      version: '3.0-folder',
      nodes: { node: { id: 'node', content: 'Hello' } },
      synapses: [{ id: 's', sourceId: 'node', targetId: 'other', strength: 1 }],
      selectedTrailIds: ['trail'],
      showActiveTrailLine: false,
    });

    expect(document.schemaVersion).toBe(CANVAS_DOCUMENT_VERSION);
    expect(document.nodes).toHaveLength(1);
    expect(document.synapses).toHaveLength(1);
    expect(document.trailUi).toEqual({ selectedTrailIds: ['trail'], showActiveTrailLine: false });
    expect(document.omnical).toEqual({ pendingFiles: [], ignoredNoteIds: [] });
  });

  it('preserves v2 Omnical pending files and ignore tombstones', () => {
    const document = parseCanvasDocument({
      nodes: [],
      omnical: {
        pendingFiles: [{ nodeId: 'node', path: 'pending.md', fingerprint: 'abc', bodyHash: 'body', tagsHash: 'tags', createdAt: '2026-08-05T10:00:00.000Z' }],
        ignoredNoteIds: ['ignored-id'],
      },
    });

    expect(document.omnical.pendingFiles).toMatchObject([{ nodeId: 'node', path: 'pending.md' }]);
    expect(document.omnical.ignoredNoteIds).toEqual(['ignored-id']);
  });

  it('rejects malformed Omnical sync state and future document versions', () => {
    expect(() => parseCanvasDocument({ nodes: [], omnical: { pendingFiles: [{}], ignoredNoteIds: [] } })).toThrow('ogiltigt omnical-fält');
    expect(() => parseCanvasDocument({ schemaVersion: 99, nodes: [] })).toThrow('stöds inte');
  });

  it('rejects a document with a malformed nodes field', () => {
    expect(() => parseCanvasDocument({ nodes: 'not-an-array' })).toThrow('ogiltigt nodes-fält');
  });

  it('serializes an immutable V2 document', () => {
    const empty = createEmptyCanvasDocument();
    const serialized = serializeCanvasDocument(empty);

    expect(serialized.schemaVersion).toBe(CANVAS_DOCUMENT_VERSION);
    expect(serialized).not.toBe(empty);
    expect(serialized.nodes).not.toBe(empty.nodes);
  });
});
