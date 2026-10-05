import { useCallback, useState } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { set as setDb } from 'idb-keyval';
import { createWorkspaceBackup, validatePortableBackup, writePortableBackupToDirectory, type PortableBackupV1 } from '../utils/portableBackup';
import { serializeCanvasDocument } from '../utils/canvasDocument';
import { withCardFileLock } from '../utils/cardFileSync';

const backupFilename = () => `soul-canvas-backup-${new Date().toISOString().slice(0, 10)}.json`;

export function usePortableBackup() {
  const [pendingRestore, setPendingRestore] = useState<PortableBackupV1 | null>(null);
  const [restoring, setRestoring] = useState(false);
  const exportBackup = useCallback(async (): Promise<boolean> => {
    try {
      const backup = await withCardFileLock(async () => {
        const state = useBrainStore.getState();
        if (!state.fileHandle) throw new Error('Anslut en arbetsmapp först.');
        const document = serializeCanvasDocument({
          nodes: Array.from(state.nodes.values()), synapses: state.synapses, conversations: state.conversations,
          sessions: state.sessions, trails: state.trails, sequences: state.sequences, activeSessionId: state.activeSessionId,
          trailUi: { selectedTrailIds: state.selectedTrailIds, showActiveTrailLine: state.showActiveTrailLine },
          omnical: state.omnical,
          cardFiles: state.cardFiles,
        });
        return createWorkspaceBackup(state.fileHandle, document);
      });
      const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' }));
      const link = window.document.createElement('a');
      link.href = url; link.download = backupFilename(); link.click();
      URL.revokeObjectURL(url);
      useBrainStore.getState().addNotification('Backup exporterad med bilder och originalfiler.', 'success');
      return true;
    } catch (error) {
      console.error('Kunde inte exportera backup:', error);
      useBrainStore.getState().addNotification(`Kunde inte exportera backup: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error', 8000);
      return false;
    }
  }, []);

  const restoreBackup = useCallback(async (): Promise<boolean> => {
    const input = window.document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    const file = await new Promise<File | null>((resolve) => {
      input.onchange = () => resolve(input.files?.[0] || null);
      input.oncancel = () => resolve(null);
      input.click();
    });
    if (!file) return false;
    try {
      const backup = await validatePortableBackup(JSON.parse(await file.text()));
      setPendingRestore(backup);
      return true;
    } catch (error) {
      useBrainStore.getState().addNotification(`Kunde inte läsa backup: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error', 10000);
      return false;
    }
  }, []);

  const completeRestore = useCallback(async (): Promise<boolean> => {
    if (!pendingRestore || restoring) return false;
    setRestoring(true);
    try {
      // Called directly by a button: retain the browser's user activation.
      const directory = await window.showDirectoryPicker({ mode: 'readwrite' });
      await withCardFileLock(async () => {
        await writePortableBackupToDirectory(directory, pendingRestore);
        await setDb('soul-folder-handle', directory);
        // Prevent queued saves of the old canvas from running after restore.
        useBrainStore.getState().setFileHandle(null);
        window.location.reload();
      });
      return true;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return false;
      console.error('Kunde inte återställa backup:', error);
      useBrainStore.getState().addNotification(`Kunde inte återställa backup: ${error instanceof Error ? error.message : 'Okänt fel'}`, 'error', 10000);
      return false;
    } finally {
      setRestoring(false);
    }
  }, [pendingRestore, restoring]);

  return { exportBackup, restoreBackup, pendingRestore, restoring, completeRestore, cancelRestore: () => setPendingRestore(null) };
}
