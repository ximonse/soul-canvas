import { useCallback } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { collectAssetDataUrls, dataUrlToBlob } from '../utils/backupAssets';
import { createPortableBackup, parsePortableBackup } from '../utils/portableBackup';
import { serializeCanvasDocument } from '../utils/canvasDocument';

const backupFilename = () => `soul-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`;

export function usePortableBackup() {
  const exportBackup = useCallback(async (): Promise<boolean> => {
    try {
      const state = useBrainStore.getState();
      const document = serializeCanvasDocument({
        nodes: Array.from(state.nodes.values()), synapses: state.synapses, conversations: state.conversations,
        sessions: state.sessions, trails: state.trails, sequences: state.sequences, activeSessionId: state.activeSessionId,
        trailUi: { selectedTrailIds: state.selectedTrailIds, showActiveTrailLine: state.showActiveTrailLine },
        omnical: state.omnical,
      });
      const backup = createPortableBackup(document, await collectAssetDataUrls(state.assets));
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      const link = window.document.createElement('a');
      link.href = url; link.download = backupFilename(); link.click();
      URL.revokeObjectURL(url);
      return true;
    } catch (error) {
      console.error('Kunde inte exportera backup:', error);
      return false;
    }
  }, []);

  const restoreBackup = useCallback(async (): Promise<boolean> => {
    const directory = useBrainStore.getState().fileHandle;
    if (!directory) return false;
    const input = window.document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    const file = await new Promise<File | null>((resolve) => {
      input.onchange = () => resolve(input.files?.[0] || null);
      input.click();
    });
    if (!file) return false;
    try {
      const backup = parsePortableBackup(JSON.parse(await file.text()));
      if (!window.confirm('Återställ backupen? data.json och berörda bilagor i den anslutna mappen ersätts.')) return false;
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
      window.location.reload();
      return true;
    } catch (error) {
      console.error('Kunde inte återställa backup:', error);
      return false;
    }
  }, []);

  return { exportBackup, restoreBackup };
}
