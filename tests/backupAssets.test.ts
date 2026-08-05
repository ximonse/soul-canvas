import { describe, expect, it } from 'vitest';
import { dataUrlToBlob } from '../src/utils/backupAssets';

describe('backup assets', () => {
  it('restores a base64 asset without changing its media type', async () => {
    const blob = dataUrlToBlob('data:text/plain;base64,aGVsbG8=');
    expect(blob.type).toBe('text/plain');
    await expect(blob.text()).resolves.toBe('hello');
  });

  it('rejects malformed asset data', () => {
    expect(() => dataUrlToBlob('not-a-data-url')).toThrow('ogiltigt dataformat');
  });
});
