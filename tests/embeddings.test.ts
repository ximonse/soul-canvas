import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MindNode } from '../src/types/types';
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('openai', () => ({ default: class { embeddings = { create }; } }));
vi.mock('../src/utils/rateLimiter', () => ({ openaiLimiter: { enqueue: (fn: () => Promise<unknown>) => fn() } }));
vi.mock('../src/utils/tokenLogging', () => ({ logTokenEstimate: vi.fn(), logUsage: vi.fn() }));
import { batchGenerateEmbeddings } from '../src/utils/embeddings';
const node = (id: string): MindNode => ({ id, content: id, type: 'text', tags: [], x: 0, y: 0, z: 0, createdAt: '2026-10-05' });

beforeEach(() => { create.mockReset(); vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {}); });
describe('batch embedding failure reporting', () => {
  it('retains successes and reports terminal failures after individual fallback', async () => {
    create.mockRejectedValueOnce(new Error('batch unavailable'))
      .mockResolvedValueOnce({ data: [{ embedding: [1, 2] }] })
      .mockRejectedValueOnce(new Error('service unavailable'));
    const failure = vi.fn();
    const result = await batchGenerateEmbeddings([node('a'), node('b')], 'test-only', undefined, failure);
    expect([...result.entries()]).toEqual([['a', [1, 2]]]);
    expect(failure).toHaveBeenCalledTimes(1);
    expect(failure.mock.calls[0][0]).toBe('b');
  });
  it('reports complete provider failure rather than silently returning an empty result', async () => {
    create.mockRejectedValue(new Error('invalid credentials'));
    const failure = vi.fn();
    expect((await batchGenerateEmbeddings([node('a'), node('b')], 'test-only', undefined, failure)).size).toBe(0);
    expect(failure).toHaveBeenCalledTimes(2);
  });
  it('does not report a failed batch if fallback recovers every card', async () => {
    create.mockRejectedValueOnce(new Error('batch unavailable'))
      .mockResolvedValue({ data: [{ embedding: [3] }] });
    const failure = vi.fn();
    expect((await batchGenerateEmbeddings([node('a')], 'test-only', undefined, failure)).size).toBe(1);
    expect(failure).not.toHaveBeenCalled();
  });
});
