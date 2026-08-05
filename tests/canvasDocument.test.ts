import { describe, expect, it } from 'vitest';
import {
  CANVAS_DOCUMENT_VERSION,
  createEmptyCanvasDocument,
  parseCanvasDocument,
  serializeCanvasDocument,
} from '../src/utils/canvasDocument';

describe('CanvasDocumentV1', () => {
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
  });

  it('rejects a document with a malformed nodes field', () => {
    expect(() => parseCanvasDocument({ nodes: 'not-an-array' })).toThrow('ogiltigt nodes-fält');
  });

  it('serializes an immutable V1 document', () => {
    const empty = createEmptyCanvasDocument();
    const serialized = serializeCanvasDocument(empty);

    expect(serialized.schemaVersion).toBe(CANVAS_DOCUMENT_VERSION);
    expect(serialized).not.toBe(empty);
    expect(serialized.nodes).not.toBe(empty.nodes);
  });
});
