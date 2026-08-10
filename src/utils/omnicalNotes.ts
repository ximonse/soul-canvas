import type { MindNode, OmnicalLink } from '../types/types';

export interface OmnicalMeta {
  done: boolean;
  archived: boolean;
  area: string;
  remindAt: string;
}

export interface OmnicalMarkdownNote extends OmnicalMeta {
  id: string;
  path: string;
  body: string;
  tags: string[];
  source: string;
  frontmatterLines: string[];
  lineEnding: '\n' | '\r\n';
}

export interface SharedMergePlan {
  conflictFields: Array<'body' | 'tags' | 'meta'>;
  body: string;
  tags: string[];
  meta: OmnicalMeta;
  writeBody: boolean;
  writeTags: boolean;
  writeMeta: boolean;
}

const INLINE_TAG = /#([^\s#]+)/g;

/** DELAT MED OMNICAL — se docs/shared-markdown-contract.md.
 *
 * FNV-1a. Motsvarighet: `stableContentHash` i Omnical
 * `src/lib/folder-notes.ts` — byte-identisk, och måste förbli det.
 *
 * Ändra aldrig algoritmen. Båda apparna sparar hashen som synkbaslinje på
 * disk: en ändring gör varje sparad baslinje ogiltig, oförändrade anteckningar
 * ser ändrade ut och trevägsmergen kan välja fel sida. Det finns ingen
 * migrationsväg. Kontrollvärden ligger i tests/sharedMarkdownContract.test.ts. */
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

/** DELAT MED OMNICAL — se docs/shared-markdown-contract.md.
 *
 * Motsvarighet: `mergeDayNoteTags` + `extractInlineTags` i Omnical
 * `src/lib/daynote.ts`. Samma taggar i samma fil ska ge samma lista i båda
 * apparna.
 *
 * Två kända skillnader, avsiktligt obeslutade: Omnical NFC-normaliserar inte
 * (ett `ä` skrivet på iPad kan därför räknas som två olika taggar beroende på
 * vilken app som läser), och Omnicals regex `#(\S+)` ger en tagg för `#a#b`
 * där `INLINE_TAG` här ger två. Utjämning kräver ett uttryckligt beslut. */
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

export function metaHash(meta: OmnicalMeta) {
  return stableTextHash(JSON.stringify({
    done: meta.done,
    archived: meta.archived,
    area: meta.area.trim().normalize('NFC'),
    remindAt: meta.remindAt.trim(),
  }));
}

/** DELAT MED OMNICAL — se docs/shared-markdown-contract.md.
 *
 * Motsvarighet: `parseScalar` i Omnical `src/lib/folder-notes.ts` (och en
 * tredje kopia i `cardMarkdown.ts` här bredvid).
 *
 * Känd skillnad, avsiktligt obeslutad: Omnical strippar inte citattecken, så
 * handskrivet `område: 'Skola'` blir `Skola` här och `'Skola'` där. Att jämna
 * ut det skriver tyst om befintliga filer — eget beslut, inte en ändring att
 * göra i förbifarten. */
function parseScalar(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed.replace(/^['"]|['"]$/g, '');
  }
}

/** DELAT MED OMNICAL — se docs/shared-markdown-contract.md.
 *
 * Motsvarighet: `frontmatterValues` i Omnical `src/lib/folder-notes.ts`
 * (identisk). Båda YAML-formerna för listor måste stödjas: inline `[a, b]`
 * och blocket med `  - rad` under nyckeln — Obsidian skriver den senare,
 * apparna den förra, och samma fil kan innehålla båda över tid. */
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

/** DELAT MED OMNICAL — se docs/shared-markdown-contract.md.
 *
 * Motsvarighet: `splitMarkdown` i Omnical `src/lib/folder-notes.ts` (som
 * returnerar hela filen som body när `---`-block saknas, så att godtycklig .md
 * kan adopteras) och i `cardMarkdown.ts` här bredvid (tom frontmatter + body).
 * Den här returnerar `null` — en fil utan frontmatter är osynlig för synken.
 *
 * Trimning av body sker här inne, hos Omnical vid anropsplatserna. Samma
 * resultat, olika ställe — flytta inte utan att läsa kontraktet. */
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
  const done = values.get('done');
  const archived = values.get('archived');
  const area = values.get('område');
  const remindAt = values.get('remindAt');
  return {
    id,
    path,
    body: split.body,
    tags: normalizeTags(propertyTags, split.body),
    source,
    frontmatterLines: split.frontmatterLines,
    lineEnding: split.lineEnding,
    done: typeof done === 'boolean' ? done : false,
    archived: typeof archived === 'boolean' ? archived : false,
    area: typeof area === 'string' ? area : '',
    remindAt: typeof remindAt === 'string' ? remindAt : '',
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

/** DELAT MED OMNICAL — se docs/shared-markdown-contract.md.
 *
 * De sex nycklarna nedan är de enda Soul skriver i en delad anteckning, och
 * alla sex ägs även av Omnical (`RESERVED_FRONTMATTER_KEYS` i
 * `src/lib/folder-notes.ts`) — avsiktligt delade fält. Lägg aldrig till en
 * nyckel här utan att den finns i Omnicals lista, och skriv aldrig
 * `omnicalId`, `date`, `created`, `trackId`, `activityId`, `sources` eller
 * `omnicalDraft`: de är Omnicals att minta och underhålla. Skriver Soul
 * `omnicalId` hoppar adoptionen över filen som redan adopterad.
 *
 * `soulCardId` skrivs av `publishedShareMarkdown` och ligger utanför Omnicals
 * lista med flit — den bärs vidare som främmande frontmatter. */
export function writeSharedMarkdown(
  note: OmnicalMarkdownNote,
  body: string,
  tags: string[],
  meta: OmnicalMeta,
  updated = new Date().toISOString(),
) {
  let lines = replaceFrontmatterField(note.frontmatterLines, 'tags', JSON.stringify(normalizeTags(tags, body)));
  lines = replaceFrontmatterField(lines, 'done', JSON.stringify(meta.done));
  lines = replaceFrontmatterField(lines, 'archived', JSON.stringify(meta.archived));
  lines = replaceFrontmatterField(lines, 'område', JSON.stringify(meta.area));
  lines = replaceFrontmatterField(lines, 'remindAt', meta.remindAt.trim() ? JSON.stringify(meta.remindAt.trim()) : '');
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

export function planSharedMerge(
  node: Pick<MindNode, 'content' | 'tags' | 'done' | 'archived' | 'area' | 'remindAt'>,
  link: OmnicalLink,
  remote: OmnicalMarkdownNote,
): SharedMergePlan {
  const soulBodyHash = bodyHash(node.content);
  const soulTagsHash = tagsHash(normalizeTags(node.tags, node.content));
  const remoteBodyHash = bodyHash(remote.body);
  const remoteTagsHash = tagsHash(remote.tags);

  const soulBodyChanged = soulBodyHash !== link.bodyHash;
  const soulTagsChanged = soulTagsHash !== link.tagsHash;
  const remoteBodyChanged = remoteBodyHash !== link.bodyHash;
  const remoteTagsChanged = remoteTagsHash !== link.tagsHash;
  const conflictFields: Array<'body' | 'tags' | 'meta'> = [];

  if (soulBodyChanged && remoteBodyChanged && soulBodyHash !== remoteBodyHash) conflictFields.push('body');
  if (soulTagsChanged && remoteTagsChanged && soulTagsHash !== remoteTagsHash) conflictFields.push('tags');

  const body = soulBodyChanged ? node.content : remote.body;
  const tags = soulTagsChanged ? normalizeTags(node.tags, node.content) : remote.tags;

  const soulMeta: OmnicalMeta = {
    done: node.done ?? false,
    archived: node.archived ?? false,
    area: node.area ?? '',
    remindAt: node.remindAt ?? '',
  };
  const remoteMeta: OmnicalMeta = {
    done: remote.done,
    archived: remote.archived,
    area: remote.area,
    remindAt: remote.remindAt,
  };
  const linkMetaHash = link.metaHash ?? '';
  const soulMetaHash = metaHash(soulMeta);
  const remoteMetaHash = metaHash(remoteMeta);
  const soulMetaChanged = soulMetaHash !== linkMetaHash;
  const remoteMetaChanged = remoteMetaHash !== linkMetaHash;

  if (soulMetaChanged && remoteMetaChanged && soulMetaHash !== remoteMetaHash) conflictFields.push('meta');

  const meta = soulMetaChanged ? soulMeta : remoteMeta;
  return {
    conflictFields,
    body,
    tags,
    meta,
    writeBody: bodyHash(body) !== remoteBodyHash,
    writeTags: tagsHash(tags) !== remoteTagsHash,
    writeMeta: metaHash(meta) !== remoteMetaHash,
  };
}
