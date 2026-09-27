import type { CanvasDocumentV2 } from './canvasDocument';
import { dataUrlToBlob } from './backupAssets';

export const PORTABLE_BACKUP_VERSION = 1;

export interface PortableBackupV1 {
  format: 'soul-canvas-backup';
  version: typeof PORTABLE_BACKUP_VERSION;
  exportedAt: string;
  document: CanvasDocumentV2;
  assets: Record<string, string>;
}

export function createPortableBackup(
  document: CanvasDocumentV2,
  assets: Record<string, string>,
): PortableBackupV1 {
  return {
    format: 'soul-canvas-backup',
    version: PORTABLE_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    document,
    assets: { ...assets },
  };
}

export function parsePortableBackup(raw: unknown): PortableBackupV1 {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Backupen måste vara ett JSON-objekt.');
  }
  const backup = raw as Partial<PortableBackupV1>;
  if (backup.format !== 'soul-canvas-backup' || backup.version !== PORTABLE_BACKUP_VERSION) {
    throw new Error('Filen är inte en Soul Canvas-backup av en version som stöds.');
  }
  if (!backup.document || !backup.assets || typeof backup.assets !== 'object' || Array.isArray(backup.assets)) {
    throw new Error('Backupen saknar dokument eller bilagor.');
  }
  return backup as PortableBackupV1;
}

// Writes a parsed backup's assets and data.json into a target directory —
// the disk side of restore, factored out of usePortableBackup so it can be
// exercised in a real roundtrip test (see tests/portableBackup.test.ts)
// without needing a browser file picker or window.confirm.
export async function writePortableBackupToDirectory(
  directory: FileSystemDirectoryHandle,
  backup: PortableBackupV1,
): Promise<void> {
  const assetsDir = await directory.getDirectoryHandle('assets', { create: true });
  for (const [assetPath, dataUrl] of Object.entries(backup.assets)) {
    const name = assetPath.replace(/^assets\//, '');
    if (!name || name.includes('/') || name.includes('\\')) throw new Error(`Ogiltig bilageväg: ${assetPath}`);
    const target = await assetsDir.getFileHandle(name, { create: true });
    const writable = await target.createWritable();
    await writable.write(dataUrlToBlob(dataUrl));
    await writable.close();
  }
  const dataFile = await directory.getFileHandle('data.json', { create: true });
  const writable = await dataFile.createWritable();
  await writable.write(JSON.stringify(backup.document, null, 2));
  await writable.close();
}
