import { describe, expect, it } from 'vitest';
import { createEmptyCanvasDocument } from '../src/utils/canvasDocument';
import { createPortableBackup, parsePortableBackup } from '../src/utils/portableBackup';

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
