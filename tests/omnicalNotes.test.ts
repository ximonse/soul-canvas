import { describe, expect, it } from 'vitest';
import {
  bodyHash,
  metaHash,
  normalizeTags,
  parseOmnicalMarkdown,
  planSharedMerge,
  tagsHash,
  writeSharedMarkdown,
} from '../src/utils/omnicalNotes';
import type { MindNode, OmnicalLink } from '../src/types/types';

const source = [
  '---',
  'omnicalId: "note-1"',
  'date: "2026-08-05"',
  '# foreign comment',
  'custom: "räksmörgås"',
  'tags: ["delad"]',
  'done: false',
  'updated: "2026-08-05T10:00:00.000Z"',
  '---',
  '',
  'Original #inline',
  '',
].join('\r\n');

const remote = parseOmnicalMarkdown(source, 'nested/note.md')!;

function node(content = remote.body, tags = remote.tags): Pick<MindNode, 'content' | 'tags' | 'done' | 'archived' | 'area' | 'remindAt'> {
  return { content, tags, done: remote.done, archived: remote.archived, area: remote.area, remindAt: remote.remindAt };
}

function link(body = remote.body, tags = remote.tags): OmnicalLink {
  return {
    omnicalId: remote.id,
    path: remote.path,
    status: 'linked',
    bodyHash: bodyHash(body),
    tagsHash: tagsHash(tags),
    metaHash: metaHash(remote),
  };
}

describe('Omnical shared Markdown contract', () => {
  it('parses shared body and property plus inline tags', () => {
    expect(remote.body).toBe('Original #inline');
    expect(remote.tags).toEqual(['delad', 'inline']);
    expect(remote.lineEnding).toBe('\r\n');
  });

  it('writes only body, tags, and updated while preserving all foreign frontmatter', () => {
    const written = writeSharedMarkdown(remote, 'Ny brödtext', ['ny'], remote, '2026-08-05T11:00:00.000Z');

    expect(written).toContain('date: "2026-08-05"\r\n# foreign comment\r\ncustom: "räksmörgås"');
    expect(written).toContain('done: false');
    expect(written).toContain('tags: ["ny"]');
    expect(written).toContain('updated: "2026-08-05T11:00:00.000Z"');
    expect(written.endsWith('Ny brödtext\r\n')).toBe(true);
    expect(written.replace(/\r\n/g, '')).not.toContain('\n');
  });

  it('writes done, archived, område and remindAt to frontmatter', () => {
    const written = writeSharedMarkdown(remote, remote.body, remote.tags, {
      done: true,
      archived: true,
      area: 'Skola',
      remindAt: '260810_0900',
    }, '2026-08-05T12:00:00.000Z');

    expect(written).toContain('done: true');
    expect(written).toContain('archived: true');
    expect(written).toContain('område: "Skola"');
    expect(written).toContain('remindAt: "260810_0900"');
  });

  it('round-trips done/archived/område/remindAt through parse', () => {
    const withMeta = [
      '---',
      'omnicalId: "note-2"',
      'område: "Jobb"',
      'tags: []',
      'done: true',
      'archived: false',
      'remindAt: "260901_0800"',
      '---',
      '',
      'Body',
      '',
    ].join('\n');
    const parsed = parseOmnicalMarkdown(withMeta, 'note2.md')!;
    expect(parsed.done).toBe(true);
    expect(parsed.archived).toBe(false);
    expect(parsed.area).toBe('Jobb');
    expect(parsed.remindAt).toBe('260901_0800');
  });

  it('merges meta when only one side changed it', () => {
    const changedRemote = { ...remote, done: true };
    const plan = planSharedMerge(node(), link(), changedRemote);

    expect(plan.conflictFields).toEqual([]);
    expect(plan.meta.done).toBe(true);
    expect(plan.writeMeta).toBe(false);
  });

  it('flags a conflict when both sides changed meta differently', () => {
    const changedRemote = { ...remote, done: true };
    const soulNode = node();
    soulNode.archived = true;
    const plan = planSharedMerge(soulNode, link(), changedRemote);

    expect(plan.conflictFields).toEqual(['meta']);
  });

  it('merges edits in different shared fields', () => {
    const changedRemote = { ...remote, body: 'Omnical body', tags: remote.tags };
    const plan = planSharedMerge(node(remote.body, ['soul-tag']), link(), changedRemote);

    expect(plan.conflictFields).toEqual([]);
    expect(plan.body).toBe('Omnical body');
    expect(plan.tags).toEqual(['soul-tag', 'inline']);
    expect(plan.writeTags).toBe(true);
  });

  it('stops when both sides changed the same field differently', () => {
    const changedRemote = { ...remote, body: 'Omnical body', tags: ['omnical-tag'] };
    const plan = planSharedMerge(node('Soul body', ['soul-tag']), link(), changedRemote);

    expect(plan.conflictFields).toEqual(['body', 'tags']);
  });

  it('does not conflict when both sides reached the same result', () => {
    const changedRemote = { ...remote, body: 'Samma', tags: ['samma'] };
    const plan = planSharedMerge(node('Samma', ['samma']), link(), changedRemote);

    expect(plan.conflictFields).toEqual([]);
    expect(plan.writeBody).toBe(false);
    expect(plan.writeTags).toBe(false);
  });

  it('normalizes duplicate property and inline tags deterministically', () => {
    expect(normalizeTags(['Delad', '#delad'], 'Text #DELAD #ny.')).toEqual(['Delad', 'ny']);
  });
});
