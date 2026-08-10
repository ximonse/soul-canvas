// Driftdetektor för det delade Markdown-kontraktet.
// Se docs/shared-markdown-contract.md.
//
//   node scripts/markdown-drift.mjs "C:/Users/ximon/Hermes Vault/Omnical"
//
// Kontraktstesterna kollar att varje app beter sig som vi tror på ett handfull
// konstruerade exempel. Det här skriptet kollar det testerna inte kan: att de
// tre parsningskopiorna faktiskt ger samma svar på dina *riktiga* filer — de
// som Obsidian, VS Code, apparna och du själv har skrivit under flera år, med
// kantfall ingen kommer på att hitta på.
//
// Kör det innan och efter en ändring i parsningen i endera repot. Exitar
// non-zero vid drift.
//
// SKRIPTET FINNS I BÅDA REPONA OCH SKA VARA IDENTISKT:
//   Omnical/scripts/markdown-drift.mjs
//   soul-canvas/scripts/markdown-drift.mjs
//
// VIKTIGT OM KOPIORNA NEDAN: implementationerna är modulprivata i båda apparna
// och går inte att importera, så de ligger här som ordagranna kopior. Ändrar du
// parsningen i en app måste du uppdatera kopian här — annars mäter skriptet ett
// beteende som inte längre finns, och svarar glatt "ingen drift" om något som
// är trasigt. Kontraktstesterna kör mot den riktiga koden och fångar det fallet;
// de två verktygen kompletterar varandra och ersätter inte varandra.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* ── ordagrann kopia: Omnical src/lib/folder-notes.ts ────────────────────── */

function omnicalParseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try { return JSON.parse(trimmed); } catch { return trimmed; }
}

function omnicalSplit(source) {
  const markdownLineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?([\s\S]*)$/);
  if (!match) return { frontmatter: null, body: source, markdownLineEnding };
  return { frontmatter: match[1].split(/\r?\n/), body: match[2], markdownLineEnding };
}

function omnicalValues(lines) {
  const values = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([^\s:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const value = match[2];
    if (key === 'tags' && !value.trim()) {
      const tags = [];
      for (let child = index + 1; child < lines.length; child += 1) {
        const item = lines[child].match(/^\s+-\s+(.*)$/);
        if (!item) break;
        const parsed = omnicalParseScalar(item[1]);
        if (typeof parsed === 'string') tags.push(parsed);
      }
      values.set(key, tags);
    } else if (key === 'tags' && /^\[.*\]$/.test(value.trim())) {
      const parsed = omnicalParseScalar(value);
      values.set(key, Array.isArray(parsed) ? parsed
        : value.trim().slice(1, -1).split(',').map((tag) => String(omnicalParseScalar(tag) ?? '').trim()).filter(Boolean));
    } else {
      values.set(key, omnicalParseScalar(value));
    }
  }
  return values;
}

/* ── ordagrann kopia: soul-canvas src/utils/omnicalNotes.ts ──────────────── */

function soulParseScalar(value) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  try { return JSON.parse(trimmed); } catch { return trimmed.replace(/^['"]|['"]$/g, ''); }
}

function soulSplit(source) {
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?([\s\S]*)$/);
  if (!match) return null;
  return {
    frontmatterLines: match[1].split(/\r?\n/),
    body: match[2].replace(/^\r?\n/, '').replace(/\r?\n$/, ''),
    lineEnding,
  };
}

function soulValues(lines) {
  const values = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([^\s:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const raw = match[2];
    if (key === 'tags' && !raw.trim()) {
      const tags = [];
      for (let child = index + 1; child < lines.length; child += 1) {
        const item = lines[child].match(/^\s+-\s+(.*)$/);
        if (!item) break;
        const parsed = soulParseScalar(item[1]);
        if (typeof parsed === 'string') tags.push(parsed);
      }
      values.set(key, tags);
    } else if (key === 'tags' && /^\[.*\]$/.test(raw.trim())) {
      const parsed = soulParseScalar(raw);
      values.set(key, Array.isArray(parsed) ? parsed
        : raw.trim().slice(1, -1).split(',').map((tag) => String(soulParseScalar(tag) ?? '').trim()).filter(Boolean));
    } else {
      values.set(key, soulParseScalar(raw));
    }
  }
  return values;
}

/* ── ordagrann kopia: soul-canvas src/utils/cardMarkdown.ts ──────────────── */

const CARD_ARRAY_KEYS = new Set(['tags', 'semanticTags']);

function cardSplit(source) {
  const lineEnding = source.includes('\r\n') ? '\r\n' : '\n';
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n)?([\s\S]*)$/);
  if (match) {
    return {
      frontmatterLines: match[1].split(/\r?\n/),
      body: match[2].replace(/^\r?\n/, '').replace(/\r?\n$/, ''),
      lineEnding,
    };
  }
  return { frontmatterLines: [], body: source.replace(/\r?\n$/, ''), lineEnding };
}

function cardValues(lines) {
  const values = new Map();
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(/^([^\s:#][^:]*):\s*(.*)$/);
    if (!match) continue;
    const key = match[1].trim();
    const raw = match[2];
    if (CARD_ARRAY_KEYS.has(key) && !raw.trim()) {
      const items = [];
      for (let child = index + 1; child < lines.length; child += 1) {
        const item = lines[child].match(/^\s+-\s+(.*)$/);
        if (!item) break;
        const parsed = soulParseScalar(item[1]);
        if (typeof parsed === 'string') items.push(parsed);
      }
      values.set(key, items);
    } else if (CARD_ARRAY_KEYS.has(key) && /^\[.*\]$/.test(raw.trim())) {
      const parsed = soulParseScalar(raw);
      values.set(key, Array.isArray(parsed) ? parsed
        : raw.trim().slice(1, -1).split(',').map((item) => String(soulParseScalar(item) ?? '').trim()).filter(Boolean));
    } else {
      values.set(key, soulParseScalar(raw));
    }
  }
  return values;
}

/* ── vad som får skilja sig ──────────────────────────────────────────────── */

/** Den dokumenterade citattecken-skillnaden: Soul strippar ett omgivande par,
 *  Omnical inte. Gäller bara värden JSON inte kan tolka. Allt annat som skiljer
 *  är drift. */
function isDocumentedQuoteDifference(omnicalValue, soulValue) {
  if (typeof omnicalValue !== 'string' || typeof soulValue !== 'string') return false;
  return omnicalValue.replace(/^['"]|['"]$/g, '') === soulValue;
}

/* ── korpus ──────────────────────────────────────────────────────────────── */

const SKIP_DIRS = new Set(['.obsidian', '.smart-env', '.trash', 'node_modules', '.git']);

function walk(dir, out = [], depth = 0) {
  if (depth > 8) return out;
  let entries;
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (SKIP_DIRS.has(name)) continue;
    const path = join(dir, name);
    let stats;
    try { stats = statSync(path); } catch { continue; }
    if (stats.isDirectory()) walk(path, out, depth + 1);
    else if (name.endsWith('.md')) out.push(path);
  }
  return out;
}

const roots = process.argv.slice(2);
if (roots.length === 0) {
  console.error('usage: node scripts/markdown-drift.mjs <mapp> [mapp...]');
  process.exit(2);
}

const files = roots.flatMap((root) => walk(root));
if (files.length === 0) {
  console.error(`Hittade inga .md-filer under: ${roots.join(', ')}`);
  process.exit(2);
}

const drift = [];
const documented = { quotes: 0, noFrontmatter: 0 };

for (const file of files) {
  const source = readFileSync(file, 'utf8');
  const omnical = omnicalSplit(source);
  const soul = soulSplit(source);
  const card = cardSplit(source);

  // 1. Radslut läses likadant av alla tre. Ingen tillåten skillnad.
  if (omnical.markdownLineEnding !== card.lineEnding || (soul && soul.lineEnding !== card.lineEnding)) {
    drift.push({ file, what: 'radslut', detail: JSON.stringify({ omnical: omnical.markdownLineEnding, soul: soul?.lineEnding, card: card.lineEnding }) });
  }

  // 2. Fil utan frontmatter-block: den dokumenterade trevägsskillnaden.
  if (omnical.frontmatter === null) {
    if (soul !== null) drift.push({ file, what: 'fil utan ---', detail: 'Soul såg ett frontmatter-block där Omnical inte gjorde det' });
    else if (card.frontmatterLines.length !== 0) drift.push({ file, what: 'fil utan ---', detail: 'kortläsaren gav frontmatter-rader ur en fil utan block' });
    else documented.noFrontmatter += 1;
    continue;
  }

  if (soul === null) {
    drift.push({ file, what: 'fil med ---', detail: 'Omnical såg ett frontmatter-block, Soul returnerade null' });
    continue;
  }

  // 3. Frontmatter-raderna ska vara identiska — det är dem båda apparna
  //    bevarar rad för rad, och skiljer de sig går främmande nycklar förlorade.
  const omnicalLines = JSON.stringify(omnical.frontmatter);
  if (omnicalLines !== JSON.stringify(soul.frontmatterLines) || omnicalLines !== JSON.stringify(card.frontmatterLines)) {
    drift.push({ file, what: 'frontmatter-rader', detail: 'de tre läsarna delade upp filen olika' });
  }

  // 4. Body: Omnical trimmar vid anropsplatsen, Soul inne i splitten. Efter
  //    Omnicals trim ska de vara identiska — annars är texten olika i apparna.
  const omnicalBody = omnical.body.replace(/^\r?\n/, '').replace(/\r?\n$/, '');
  if (omnicalBody !== soul.body || omnicalBody !== card.body) {
    drift.push({ file, what: 'body', detail: 'brödtexten skiljer sig efter trim' });
  }

  // 5. Värdena per nyckel. Enda tillåtna skillnaden är citattecknen.
  const omnicalParsed = omnicalValues(omnical.frontmatter);
  const soulParsed = soulValues(soul.frontmatterLines);
  const cardParsed = cardValues(card.frontmatterLines);

  for (const [key, omnicalValue] of omnicalParsed) {
    const soulValue = soulParsed.get(key);
    if (JSON.stringify(omnicalValue) === JSON.stringify(soulValue)) continue;
    if (isDocumentedQuoteDifference(omnicalValue, soulValue)) {
      documented.quotes += 1;
      continue;
    }
    drift.push({ file, what: `värdet för "${key}"`, detail: `Omnical: ${JSON.stringify(omnicalValue)}  Soul: ${JSON.stringify(soulValue)}` });
  }

  // Kortläsaren får bara skilja sig på semanticTags, som bara den läser som lista.
  for (const [key, cardValue] of cardParsed) {
    if (key === 'semanticTags') continue;
    const soulValue = soulParsed.get(key);
    if (JSON.stringify(cardValue) !== JSON.stringify(soulValue)) {
      drift.push({ file, what: `kortläsaren för "${key}"`, detail: `kort: ${JSON.stringify(cardValue)}  Soul: ${JSON.stringify(soulValue)}` });
    }
  }
}

console.log(`Filer: ${files.length}`);
console.log(`Dokumenterade skillnader: ${documented.quotes} värden med citattecken, ${documented.noFrontmatter} filer utan frontmatter-block`);
console.log(`Drift: ${drift.length}`);

for (const item of drift.slice(0, 20)) {
  console.log(`\n  ${item.what}\n  ${item.file}\n  ${item.detail}`);
}
if (drift.length > 20) console.log(`\n  ...och ${drift.length - 20} till`);

process.exit(drift.length > 0 ? 1 : 0);
