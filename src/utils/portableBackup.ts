import { parseCanvasDocument, type CanvasDocumentV2 } from './canvasDocument';
import { collectDirectoryAssetDataUrls, dataUrlToBlob } from './backupAssets';
import { findMissingLocalAssets, getImageRef } from './imageRefs';

export const PORTABLE_BACKUP_VERSION = 1;

interface AssetManifestEntry {
  path: string;
  size: number;
  contentType: string;
  sha256: string;
  role: 'original' | 'asset';
}

export interface PortableBackupV1 {
  format: 'soul-canvas-backup';
  version: typeof PORTABLE_BACKUP_VERSION;
  exportedAt: string;
  document: CanvasDocumentV2;
  assets: Record<string, string>;
  // Optional so previously exported v1 backups remain readable.
  manifest?: { version: 1; nodeCount: number; assetCount: number; assets: AssetManifestEntry[] };
}

export function createPortableBackup(document: CanvasDocumentV2, assets: Record<string, string>): PortableBackupV1 {
  return { format: 'soul-canvas-backup', version: PORTABLE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(), document, assets: { ...assets } };
}

function assetParts(path: string): string[] {
  const parts = path.split('/');
  if (parts[0] !== 'assets' || parts.length < 2 || parts.some((part) => (
    !part || part === '.' || part === '..' || /[\\:]/.test(part) || /[. ]$/.test(part)
    || Array.from(part).some((character) => character.charCodeAt(0) < 32)
  ))) throw new Error(`Ogiltig bilageväg: ${path}`);
  return parts;
}

export function parsePortableBackup(raw: unknown): PortableBackupV1 {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Backupen måste vara ett JSON-objekt.');
  const backup = raw as Partial<PortableBackupV1>;
  if (backup.format !== 'soul-canvas-backup' || backup.version !== PORTABLE_BACKUP_VERSION) {
    throw new Error('Filen är inte en Soul Canvas-backup av en version som stöds.');
  }
  if (!backup.document || !backup.assets || typeof backup.assets !== 'object' || Array.isArray(backup.assets)) {
    throw new Error('Backupen saknar dokument eller bilagor.');
  }
  // Loading legacy documents is permissive; restore must reject missing collections.
  for (const key of ['nodes', 'synapses', 'sessions', 'conversations', 'trails', 'sequences'] as const) {
    if (!Array.isArray(backup.document[key])) throw new Error(`Backupen har ett ogiltigt ${key}-fält.`);
  }
  const document = parseCanvasDocument(backup.document);
  const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');
  if (document.sessions.some((session) => !session || typeof session.id !== 'string'
    || typeof session.name !== 'string' || !stringArray(session.cardIds) || !session.viewState
    || !Number.isFinite(session.viewState.x) || !Number.isFinite(session.viewState.y)
    || !Number.isFinite(session.viewState.zoom) || !Number.isFinite(session.createdAt) || !Number.isFinite(session.lastOpened))
    || document.synapses.some((link) => !link || typeof link.id !== 'string' || typeof link.sourceId !== 'string'
      || typeof link.targetId !== 'string' || !Number.isFinite(link.strength))
    || document.sequences.some((sequence) => !sequence || typeof sequence.id !== 'string'
      || !stringArray(sequence.nodeIds) || typeof sequence.createdAt !== 'string')
    || document.conversations.some((conversation) => !conversation || typeof conversation.id !== 'string'
      || !Array.isArray(conversation.messages) || !stringArray(conversation.contextNodeIds)
      || conversation.messages.some((message) => !message || typeof message.content !== 'string'
        || !['system', 'user', 'assistant'].includes(message.role)))) {
    throw new Error('Backupen har ogiltiga sessioner, kopplingar, sekvenser eller samtal.');
  }
  const ids = new Set<string>();
  for (const node of document.nodes) {
    if (!node || typeof node.id !== 'string' || !node.id || ids.has(node.id)
      || typeof node.content !== 'string' || !Array.isArray(node.tags)
      || !node.tags.every((tag) => typeof tag === 'string')
      || !['text', 'image', 'zotero'].includes(node.type)
      || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !Number.isFinite(node.z)
      || typeof node.createdAt !== 'string') throw new Error('Backupen har ogiltiga eller dubbla kort.');
    ids.add(node.id);
    const ref = getImageRef(node);
    if (ref?.startsWith('blob:')) throw new Error('Backupen innehåller en tillfällig bildlänk som inte kan återställas.');
  }
  const paths = new Set<string>();
  for (const [path, value] of Object.entries(backup.assets)) {
    assetParts(path);
    const normalized = path.toLowerCase();
    if (paths.has(normalized)) throw new Error(`Dubbla bilagevägar: ${path}`);
    paths.add(normalized);
    if (typeof value !== 'string') throw new Error(`Ogiltig bilaga: ${path}`);
    dataUrlToBlob(value);
  }
  if (findMissingLocalAssets(document.nodes, backup.assets).length) throw new Error('Backupen saknar bildfiler som korten refererar till.');
  if (backup.manifest) {
    const manifest = backup.manifest;
    if (manifest.version !== 1 || manifest.nodeCount !== document.nodes.length
      || manifest.assetCount !== paths.size || !Array.isArray(manifest.assets)
      || manifest.assets.length !== paths.size) throw new Error('Backupens bilageförteckning är ogiltig.');
    const listed = new Set<string>();
    for (const entry of manifest.assets) {
      if (!entry || typeof entry.path !== 'string' || !Object.prototype.hasOwnProperty.call(backup.assets, entry.path)
        || listed.has(entry.path) || !Number.isSafeInteger(entry.size) || entry.size < 0
        || typeof entry.contentType !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sha256)
        || !['original', 'asset'].includes(entry.role)) throw new Error('Backupens bilageförteckning är ogiltig.');
      listed.add(entry.path);
    }
  }
  return { ...backup, document } as PortableBackupV1;
}

async function checksum(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function createWorkspaceBackup(directory: FileSystemDirectoryHandle, document: CanvasDocumentV2): Promise<PortableBackupV1> {
  const backup = createPortableBackup(document, await collectDirectoryAssetDataUrls(directory));
  const entries: AssetManifestEntry[] = [];
  for (const [path, value] of Object.entries(backup.assets)) {
    const blob = dataUrlToBlob(value);
    entries.push({ path, size: blob.size, contentType: blob.type, sha256: await checksum(blob),
      role: path.startsWith('assets/originals/') ? 'original' : 'asset' });
  }
  backup.manifest = { version: 1, nodeCount: document.nodes.length, assetCount: entries.length, assets: entries };
  return parsePortableBackup(backup);
}

export async function validatePortableBackup(raw: unknown): Promise<PortableBackupV1> {
  const backup = parsePortableBackup(raw);
  for (const entry of backup.manifest?.assets ?? []) {
    const blob = dataUrlToBlob(backup.assets[entry.path]);
    if (blob.size !== entry.size || blob.type !== entry.contentType || await checksum(blob) !== entry.sha256) {
      throw new Error(`Bilagan är skadad: ${entry.path}`);
    }
  }
  return backup;
}

// Preflight everything before creating files, and restore only into an empty
// folder. I/O failures can leave a partial new workspace, never overwrite a
// live workspace or mix old cards/*.md with a restored document.
export async function writePortableBackupToDirectory(directory: FileSystemDirectoryHandle, raw: PortableBackupV1): Promise<void> {
  const backup = await validatePortableBackup(raw);
  for await (const entry of directory.entries()) {
    throw new Error(`Välj en tom mapp för återställning (innehåller ${entry[0]}).`);
  }
  for (const [path, value] of Object.entries(backup.assets)) {
    const parts = assetParts(path);
    const filename = parts.pop()!;
    let targetDir = directory;
    for (const part of parts) targetDir = await targetDir.getDirectoryHandle(part, { create: true });
    const target = await targetDir.getFileHandle(filename, { create: true });
    const writable = await target.createWritable();
    await writable.write(dataUrlToBlob(value));
    await writable.close();
  }
  const target = await directory.getFileHandle('data.json', { create: true });
  const writable = await target.createWritable();
  // Old mtimes describe another directory; let card files regenerate on save.
  await writable.write(JSON.stringify({ ...backup.document, cardFiles: {} }, null, 2));
  await writable.close();
}
