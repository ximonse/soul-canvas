import type { MindNode, OmnicalLink } from '../types/types';

export interface OmnicalMarkdownNote {
  id: string;
  path: string;
  body: string;
  tags: string[];
  source: string;
  frontmatterLines: string[];
  lineEnding: '\n' | '\r\n';
}

export interface SharedMergePlan {
  conflictFields: Array<'body' | 'tags'>;
  body: string;
  tags: string[];
  writeBody: boolean;
  writeTags: boolean;
}

const INLINE_TAG = /#([^\s#]+)/g;

export function stableTextHash(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

export function bodyHash(body: string) {
  return stableTextHash(body.replace(/\r\n?/g, '\n').normalize('NFC'));
}

export function normalizeTags(tags: readonly string[], body = '') {
  const result: string[] = [];
  const seen = new Set<string>();
  const inline = [...body.matchAll(INLINE_TAG)].map((match) => match[1].replace(/[.,;:!?]+$/, ''));
  for (const raw of [...tags, ...inline]) {
    const tag = raw.trim().replace(/^#/, '').normalize('NFC');
    const key = tag.toLocaleLowerCase('sv-SE');
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
  }
  return result;
}

export function tagsHash(tags: readonly string[]) {
  return stableTextHash(JSON.stringify(
    normalizeTags(tags)
      .map((tag) => tag.toLocaleLowerCase('sv-SE'))
      .sort((left, right) => left.localeCompare(right, 'sv-SE')),
  ));
}

function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed.replace(/^['"]|['"]$/g, '');
  }
}

function parseValues(lines: string[]) {
  const values = new Map<string, unknown>();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([^\s:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const raw = match[2];
    if (key === 'tags' && !raw.trim()) {
      const tags: string[] = [];
      for (let child = index + 1; child < lines.length; child += 1) {
        const item = lines[child].match(/^\s+-\s+(.*)$/);
        if (!item) break;
        const parsed = parseScalar(item[1]);
        if (typeof parsed === 'string') tags.push(parsed);
      }
      values.set(key, tags);
    } else if (key === 'tags' && /^\[.*\]$/.test(raw.trim())) {
      const parsed = parseScalar(raw);
      values.set(key, Array.isArray(parsed)
        ? parsed
        : raw.trim().slice(1, -1).split(',').map((tag) => String(parseScalar(tag) ?? '').trim()).filter(Boolean));
    } else {
      values.set(key, parseScalar(raw));
    }
  }
  return values;
}

function splitMarkdown(source: string) {
  const lineEnding = source.includes('\r\n') ? '\r\n' as const : '\n' as const;
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?([\s\S]*)$/);
  if (!match) return null;
  return {
    frontmatterLines: match[1].split(/\r?\n/),
    body: match[2].replace(/^\r?\n/, '').replace(/\r?\n$/, ''),
    lineEnding,
  };
}

export function parseOmnicalMarkdown(source: string, path: string): OmnicalMarkdownNote | null {
  const split = splitMarkdown(source);
  if (!split) return null;
  const values = parseValues(split.frontmatterLines);
  const id = values.get('omnicalId');
  if (typeof id !== 'string' || !id.trim()) return null;
  const rawTags = values.get('tags');
  const propertyTags = Array.isArray(rawTags) && rawTags.every((tag) => typeof tag === 'string')
    ? rawTags
    : [];
  return {
    id,
    path,
    body: split.body,
    tags: normalizeTags(propertyTags, split.body),
    source,
    frontmatterLines: split.frontmatterLines,
    lineEnding: split.lineEnding,
  };
}

function replaceFrontmatterField(lines: string[], key: string, value: string) {
  const result: string[] = [];
  let replaced = false;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([^\s:#][^:]*):/);
    if (match?.[1].trim() !== key) {
      result.push(lines[index]);
      continue;
    }
    if (!replaced) result.push(key + ': ' + value);
    replaced = true;
    if (key === 'tags') {
      while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) index += 1;
    }
  }
  if (!replaced) result.push(key + ': ' + value);
  return result;
}

export function writeSharedMarkdown(note: OmnicalMarkdownNote, body: string, tags: string[], updated = new Date().toISOString()) {
  let lines = replaceFrontmatterField(note.frontmatterLines, 'tags', JSON.stringify(normalizeTags(tags, body)));
  lines = replaceFrontmatterField(lines, 'updated', JSON.stringify(updated));
  const eol = note.lineEnding;
  return [
    '---',
    ...lines,
    '---',
    '',
    body.replace(/\r\n?/g, eol).replace(new RegExp(eol + '$'), ''),
    '',
  ].join(eol);
}

export function fingerprintForPending(body: string) {
  return bodyHash(body);
}

export function planSharedMerge(node: Pick<MindNode, 'content' | 'tags'>, link: OmnicalLink, remote: OmnicalMarkdownNote): SharedMergePlan {
  const soulBodyHash = bodyHash(node.content);
  const soulTagsHash = tagsHash(normalizeTags(node.tags, node.content));
  const remoteBodyHash = bodyHash(remote.body);
  const remoteTagsHash = tagsHash(remote.tags);

  const soulBodyChanged = soulBodyHash !== link.bodyHash;
  const soulTagsChanged = soulTagsHash !== link.tagsHash;
  const remoteBodyChanged = remoteBodyHash !== link.bodyHash;
  const remoteTagsChanged = remoteTagsHash !== link.tagsHash;
  const conflictFields: Array<'body' | 'tags'> = [];

  if (soulBodyChanged && remoteBodyChanged && soulBodyHash !== remoteBodyHash) conflictFields.push('body');
  if (soulTagsChanged && remoteTagsChanged && soulTagsHash !== remoteTagsHash) conflictFields.push('tags');

  const body = soulBodyChanged ? node.content : remote.body;
  const tags = soulTagsChanged ? normalizeTags(node.tags, node.content) : remote.tags;
  return {
    conflictFields,
    body,
    tags,
    writeBody: bodyHash(body) !== remoteBodyHash,
    writeTags: tagsHash(tags) !== remoteTagsHash,
  };
}
