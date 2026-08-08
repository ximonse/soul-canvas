// src/utils/cardFileSync.ts
// Write-only sync of cards/*.md against the in-memory node set, gated
// behind featureFlags.enableCardMarkdownFiles (see plan: kort som
// .md-filer, Fas 3a). Hash-diffs against a stored per-card baseline
// instead of instrumenting every node mutation site — cheap, pure JS,
// and can't silently miss a change the way a hand-wired dirty flag could.
//
// One-way only: never reads a card's .md content back into the canvas.
// That's Fas 3b (background mtime scan + planCardMerge), deliberately
// deferred until this write path has been exercised against real data.
import type { CardFileBaselineEntry, MindNode } from '../types/types';
import { bodyHash, cardFilename, frontmatterHash, nodeToCardFrontmatter, parseCardMarkdown, writeCardMarkdown } from './cardMarkdown';

const CARDS_DIR = 'cards';
const TRASH_DIR = '.trash';

async function readExistingIfAny(dir: FileSystemDirectoryHandle, filename: string) {
  try {
    const handle = await dir.getFileHandle(filename);
    const file = await handle.getFile();
    if (file.size === 0) return null;
    return parseCardMarkdown(await file.text(), `${CARDS_DIR}/${filename}`);
  } catch {
    return null;
  }
}

async function writeOneCard(cardsDir: FileSystemDirectoryHandle, node: MindNode, filename: string): Promise<CardFileBaselineEntry> {
  const { frontmatter, body } = nodeToCardFrontmatter(node);
  const existing = await readExistingIfAny(cardsDir, filename);
  const content = writeCardMarkdown(existing, frontmatter, body);

  const fileHandle = await cardsDir.getFileHandle(filename, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(content);
  await writable.close();

  // Read mtime back from the handle we just wrote — must reflect *our*
  // write, not the pre-write file, or the next open's background scan
  // (Fas 3b) will mistake our own save for an external edit.
  const written = await fileHandle.getFile();
  return {
    mdPath: `${CARDS_DIR}/${filename}`,
    mdMtime: written.lastModified,
    bodyHash: bodyHash(body),
    frontmatterHash: frontmatterHash(frontmatter),
  };
}

async function moveToTrash(cardsDir: FileSystemDirectoryHandle, filename: string) {
  try {
    const sourceHandle = await cardsDir.getFileHandle(filename);
    const sourceFile = await sourceHandle.getFile();
    const text = await sourceFile.text();
    const trashDir = await cardsDir.getDirectoryHandle(TRASH_DIR, { create: true });
    const trashHandle = await trashDir.getFileHandle(filename, { create: true });
    const writable = await trashHandle.createWritable();
    await writable.write(text);
    await writable.close();
    await cardsDir.removeEntry(filename);
  } catch (err) {
    // A card whose .md was already deleted by hand, or a permissions
    // hiccup — don't let this abort the rest of the save.
    console.warn(`[cardFileSync] Kunde inte flytta ${filename} till papperskorgen:`, err);
  }
}

export interface CardFileSyncResult {
  baseline: Record<string, CardFileBaselineEntry>;
  written: number;
  trashed: number;
}

/**
 * Diffs `nodes` against `baseline` by hash, writes only the cards that
 * actually changed, moves cards whose node was deleted into cards/.trash/,
 * and returns the updated baseline to persist in data.json.
 */
export async function syncCardFiles(
  root: FileSystemDirectoryHandle,
  nodes: Map<string, MindNode>,
  baseline: Record<string, CardFileBaselineEntry>,
): Promise<CardFileSyncResult> {
  const cardsDir = await root.getDirectoryHandle(CARDS_DIR, { create: true });
  const nextBaseline: Record<string, CardFileBaselineEntry> = { ...baseline };
  let written = 0;
  let trashed = 0;

  for (const [id, node] of nodes) {
    const { frontmatter, body } = nodeToCardFrontmatter(node);
    const currentBodyHash = bodyHash(body);
    const currentFmHash = frontmatterHash(frontmatter);
    const existingEntry = baseline[id];

    if (existingEntry && existingEntry.bodyHash === currentBodyHash && existingEntry.frontmatterHash === currentFmHash) {
      continue; // unchanged since last write — skip the disk round-trip
    }

    const filename = existingEntry ? existingEntry.mdPath.split('/').pop()! : cardFilename(node);
    nextBaseline[id] = await writeOneCard(cardsDir, node, filename);
    written += 1;
  }

  for (const id of Object.keys(baseline)) {
    if (nodes.has(id)) continue;
    const filename = baseline[id].mdPath.split('/').pop()!;
    await moveToTrash(cardsDir, filename);
    delete nextBaseline[id];
    trashed += 1;
  }

  return { baseline: nextBaseline, written, trashed };
}
