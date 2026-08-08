// src/utils/cardMarkdown.ts
// Card-agnostic markdown+frontmatter I/O, for the planned "every card is
// also a .md file" feature (see plan: kort som .md-filer). Generalizes the
// same non-destructive frontmatter pattern already proven in
// omnicalNotes.ts (which stays untouched — it's a separate, narrower
// subsystem in production use for Omnical-linked notes specifically) to
// cover any card and any owned field, while still leaving foreign
// frontmatter keys and comments byte-for-byte untouched on write.
import type { MindNode } from '../types/types';
import { bodyHash, normalizeTags, stableTextHash, tagsHash } from './omnicalNotes';

export { bodyHash, normalizeTags, tagsHash };

// The frontmatter keys Soul Canvas owns on a card's .md file. Anything not
// in this list is foreign (added by another app, or by hand) and is always
// passed through untouched.
export const CARD_SCALAR_KEYS = [
  'id', 'title', 'caption', 'comment', 'link', 'value', 'event', 'remindAt',
  'area', 'done', 'archived', 'imageRef', 'background', 'updated', 'mdPath',
] as const;
export const CARD_ARRAY_KEYS = ['tags', 'semanticTags'] as const;

export type CardScalarKey = typeof CARD_SCALAR_KEYS[number];
export type CardArrayKey = typeof CARD_ARRAY_KEYS[number];

export interface CardFrontmatter {
  id: string | null;
  title?: string;
  caption?: string;
  comment?: string;
  link?: string;
  value?: number;
  event?: string;
  remindAt?: string;
  area?: string;
  done?: boolean;
  archived?: boolean;
  imageRef?: string;
  background?: string;
  updated?: string;
  // Path to this card's own .md file, relative to the connected folder
  // (e.g. "cards/2026-08-08-....md"). Owned by Soul so the file is
  // self-describing and the editor can link back to it. Absent until the
  // card has been written to disk at least once.
  mdPath?: string;
  tags: string[];
  semanticTags: string[];
}

export interface CardMarkdownFile {
  path: string;
  body: string;
  frontmatter: CardFrontmatter;
  frontmatterLines: string[];
  lineEnding: '\n' | '\r\n';
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

const ARRAY_KEY_SET = new Set<string>(CARD_ARRAY_KEYS);

function parseValues(lines: string[]): Map<string, unknown> {
  const values = new Map<string, unknown>();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([^\s:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const raw = match[2];
    if (ARRAY_KEY_SET.has(key) && !raw.trim()) {
      const items: string[] = [];
      for (let child = index + 1; child < lines.length; child += 1) {
        const item = lines[child].match(/^\s+-\s+(.*)$/);
        if (!item) break;
        const parsed = parseScalar(item[1]);
        if (typeof parsed === 'string') items.push(parsed);
      }
      values.set(key, items);
    } else if (ARRAY_KEY_SET.has(key) && /^\[.*\]$/.test(raw.trim())) {
      const parsed = parseScalar(raw);
      values.set(key, Array.isArray(parsed)
        ? parsed
        : raw.trim().slice(1, -1).split(',').map((item) => String(parseScalar(item) ?? '').trim()).filter(Boolean));
    } else {
      values.set(key, parseScalar(raw));
    }
  }
  return values;
}

function splitMarkdown(source: string) {
  const lineEnding = source.includes('\r\n') ? '\r\n' as const : '\n' as const;
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?([\s\S]*)$/);
  if (match) {
    return {
      frontmatterLines: match[1].split(/\r?\n/),
      body: match[2].replace(/^\r?\n/, '').replace(/\r?\n$/, ''),
      lineEnding,
    };
  }
  // No frontmatter block at all — a file someone just typed plain text
  // into, with no `---` delimiters, must still become a card rather than
  // being silently skipped. Treat the whole file as body with empty
  // (no-owned-fields) frontmatter; writeCardMarkdown will add a proper
  // frontmatter block the first time Soul writes it (e.g. once an id is
  // minted and written back during ingest).
  return {
    frontmatterLines: [],
    body: source.replace(/\r?\n$/, ''),
    lineEnding,
  };
}

/**
 * Parse a card's .md source. `id` may be missing (a file created outside
 * the app) — callers are expected to mint one and write it back rather than
 * rejecting the file, since new external .md files are meant to become
 * cards (see plan: "Ny .md-fil skapad utanför appen").
 */
export function parseCardMarkdown(source: string, path: string): CardMarkdownFile | null {
  const split = splitMarkdown(source);
  if (!split) return null;
  const values = parseValues(split.frontmatterLines);

  const id = values.get('id');
  const tags = values.get('tags');
  const semanticTags = values.get('semanticTags');

  const mutable: Record<string, unknown> = {
    id: typeof id === 'string' && id.trim() ? id : null,
    tags: normalizeTags(Array.isArray(tags) && tags.every((t) => typeof t === 'string') ? tags : [], split.body),
    semanticTags: Array.isArray(semanticTags) && semanticTags.every((t) => typeof t === 'string') ? semanticTags : [],
  };
  for (const key of CARD_SCALAR_KEYS) {
    if (key === 'id') continue;
    const value = values.get(key);
    if (value === undefined) continue;
    if (key === 'done' || key === 'archived') {
      if (typeof value === 'boolean') mutable[key] = value;
    } else if (key === 'value') {
      if (typeof value === 'number') mutable[key] = value;
    } else if (typeof value === 'string') {
      mutable[key] = value;
    }
  }
  const frontmatter = mutable as unknown as CardFrontmatter;

  return {
    path,
    body: split.body,
    frontmatter,
    frontmatterLines: split.frontmatterLines,
    lineEnding: split.lineEnding,
  };
}

function replaceFrontmatterField(lines: string[], key: string, rawValue: string, isArray: boolean) {
  const result: string[] = [];
  let replaced = false;
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([^\s:#][^:]*):/);
    if (match?.[1].trim() !== key) {
      result.push(lines[index]);
      continue;
    }
    if (!replaced) result.push(key + ': ' + rawValue);
    replaced = true;
    if (isArray) {
      while (index + 1 < lines.length && /^\s+-\s+/.test(lines[index + 1])) index += 1;
    }
  }
  if (!replaced) result.push(key + ': ' + rawValue);
  return result;
}

/**
 * Write a card's owned frontmatter fields + body, leaving every other line
 * in the existing file (foreign properties, comments, unrelated arrays)
 * untouched. Pass `existingLines: null` to create a brand new file.
 */
export function writeCardMarkdown(
  existing: { frontmatterLines: string[]; lineEnding: '\n' | '\r\n' } | null,
  frontmatter: CardFrontmatter,
  body: string,
): string {
  const eol = existing?.lineEnding ?? '\n';
  let lines = existing ? [...existing.frontmatterLines] : [];

  const setScalar = (key: CardScalarKey, value: unknown) => {
    // `id` is typed string | null, and every other owned field is simply
    // absent (undefined) when the card never set it — either way, an unset
    // field must not turn into a literal "key: null" line in a file a
    // human is meant to read and hand-edit.
    if (value === undefined || value === null) return;
    lines = replaceFrontmatterField(lines, key, JSON.stringify(value), false);
  };
  const setArray = (key: CardArrayKey, value: string[]) => {
    lines = replaceFrontmatterField(lines, key, JSON.stringify(value), true);
  };

  const frontmatterRecord = frontmatter as unknown as Record<string, unknown>;
  setScalar('id', frontmatter.id);
  for (const key of CARD_SCALAR_KEYS) {
    if (key === 'id') continue;
    setScalar(key, frontmatterRecord[key]);
  }
  setArray('tags', frontmatter.tags);
  setArray('semanticTags', frontmatter.semanticTags);

  return [
    '---',
    ...lines,
    '---',
    '',
    body.replace(/\r\n?/g, eol).replace(new RegExp(eol + '$'), ''),
    '',
  ].join(eol);
}

/** Stable hash over the full owned-frontmatter surface, for conflict/merge detection. */
export function frontmatterHash(frontmatter: CardFrontmatter): string {
  const frontmatterRecord = frontmatter as unknown as Record<string, unknown>;
  const scalarPart: Record<string, unknown> = {};
  for (const key of CARD_SCALAR_KEYS) {
    // Deliberately not coalescing to null here: JSON.stringify drops
    // undefined-valued keys but keeps explicit nulls, so "field never set"
    // and "field explicitly cleared" hash differently — an external
    // deletion of a frontmatter line must register as a real change for
    // planCardMerge to catch it.
    const value = frontmatterRecord[key];
    if (value !== undefined) scalarPart[key] = value;
  }
  return stableTextHash(JSON.stringify({
    ...scalarPart,
    tags: tagsHash(frontmatter.tags),
    semanticTags: [...frontmatter.semanticTags].sort(),
  }));
}

export interface CardMergePlan {
  conflictFields: Array<'body' | 'frontmatter'>;
  body: string;
  frontmatter: CardFrontmatter;
  writeBody: boolean;
  writeFrontmatter: boolean;
}

/**
 * Three-way merge between what Soul Canvas has in memory, a stored
 * baseline (hashes captured at the last successful sync), and what's
 * currently on disk. Mirrors planSharedMerge's shape in omnicalNotes.ts:
 * a field only conflicts when *both* sides changed it *and* landed on
 * different results.
 */
export function planCardMerge(
  soul: { body: string; frontmatter: CardFrontmatter },
  baseline: { bodyHash: string; frontmatterHash: string },
  disk: { body: string; frontmatter: CardFrontmatter },
): CardMergePlan {
  const soulBodyHash = bodyHash(soul.body);
  const diskBodyHash = bodyHash(disk.body);
  const soulFmHash = frontmatterHash(soul.frontmatter);
  const diskFmHash = frontmatterHash(disk.frontmatter);

  const soulBodyChanged = soulBodyHash !== baseline.bodyHash;
  const diskBodyChanged = diskBodyHash !== baseline.bodyHash;
  const soulFmChanged = soulFmHash !== baseline.frontmatterHash;
  const diskFmChanged = diskFmHash !== baseline.frontmatterHash;

  const conflictFields: Array<'body' | 'frontmatter'> = [];
  if (soulBodyChanged && diskBodyChanged && soulBodyHash !== diskBodyHash) conflictFields.push('body');
  if (soulFmChanged && diskFmChanged && soulFmHash !== diskFmHash) conflictFields.push('frontmatter');

  const body = soulBodyChanged ? soul.body : disk.body;
  const frontmatter = soulFmChanged ? soul.frontmatter : disk.frontmatter;

  return {
    conflictFields,
    body,
    frontmatter,
    writeBody: bodyHash(body) !== diskBodyHash,
    writeFrontmatter: frontmatterHash(frontmatter) !== diskFmHash,
  };
}

/** Maps a MindNode to its .md representation. Pure — does no I/O.
 *  `mdPath` is the card's own .md file path (relative to the connected
 *  folder), sourced from the sync baseline; pass undefined for a card
 *  that hasn't been written to disk yet. */
export function nodeToCardFrontmatter(node: MindNode, mdPath?: string): { frontmatter: CardFrontmatter; body: string } {
  // Image cards store the asset reference in `content`; the readable text
  // is the OCR pass ("baksidan"). Everything else uses `content` directly.
  const body = node.type === 'image' ? (node.ocrText ?? '') : node.content;
  const frontmatter: CardFrontmatter = {
    id: node.id,
    title: node.title,
    caption: node.caption,
    comment: node.comment,
    link: node.link,
    value: node.value,
    event: node.event,
    remindAt: node.remindAt,
    area: node.area,
    done: node.done,
    archived: node.archived,
    imageRef: node.imageRef,
    // `background` is a human/foreign-app override slot, never populated
    // from the node's own backgroundColor — Soul never writes this key,
    // so an existing override line is left alone (see writeCardMarkdown).
    background: undefined,
    updated: node.updatedAt,
    mdPath,
    tags: node.tags,
    semanticTags: node.semanticTags ?? [],
  };
  return { frontmatter, body };
}

/**
 * Inverse of nodeToCardFrontmatter, scoped to what an *ingested* external
 * file actually needs — not a perfect mirror. A file created outside the
 * app has no meaningful `imageRef`/image type to reconstruct (nobody
 * hand-writes an image card), so ingested cards are always type: 'text'.
 */
export function cardFrontmatterToNodeFields(frontmatter: CardFrontmatter, body: string) {
  return {
    content: body,
    title: frontmatter.title,
    caption: frontmatter.caption,
    comment: frontmatter.comment,
    link: frontmatter.link,
    value: frontmatter.value,
    event: frontmatter.event,
    remindAt: frontmatter.remindAt,
    area: frontmatter.area,
    done: frontmatter.done,
    archived: frontmatter.archived,
    tags: frontmatter.tags,
    semanticTags: frontmatter.semanticTags,
  };
}

function slugify(text: string): string {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/[^a-z0-9åäö]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned.slice(0, 50) || 'kort';
}

/**
 * Stable filename for a card's .md file: YYYY-MM-DD-<slug>-<kortid>.md,
 * matching the Hermes Vault convention. Only called once, for a card that
 * doesn't have a baseline entry yet — callers must reuse the stored
 * mdPath afterwards rather than recomputing this, since a title edit must
 * not rename (and thereby orphan/duplicate) an already-synced file.
 */
export function cardFilename(node: MindNode): string {
  const date = (node.createdAt || new Date().toISOString()).slice(0, 10);
  const base = node.title?.trim() || node.content?.trim() || 'kort';
  const shortId = node.id.replace(/-/g, '').slice(0, 6);
  return `${date}-${slugify(base)}-${shortId}.md`;
}
