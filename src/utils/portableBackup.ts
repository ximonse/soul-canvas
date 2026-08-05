import type { CanvasDocumentV2 } from './canvasDocument';

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
