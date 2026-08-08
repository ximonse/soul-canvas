// src/hooks/useFileSystem.ts
import { useCallback, useEffect, useState, useRef } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { set as setDb, get as getDb } from 'idb-keyval';
import { exportSessionForAI, sanitizeFilename } from '../utils/aiExport';
import { createEmptyCanvasDocument, parseCanvasDocument, serializeCanvasDocument } from '../utils/canvasDocument';
import { scanCardFiles, syncCardFiles } from '../utils/cardFileSync';
import { FEATURE_FLAGS } from '../utils/featureFlags';

// Helper to revoke all blob URLs in an assets map
function revokeAssetUrls(assets: Record<string, string>) {
  Object.values(assets).forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
}

export interface SaveConflictInfo {
  backupFilename: string;
  detectedAt: string;
}

export interface SaveResult {
  ok: boolean;
  // True when `ok` is false specifically because a save conflict was
  // detected (see saveConflict/resolveSaveConflict) — the conflict dialog
  // is already handling it, so callers should not also show a generic
  // "could not save" error toast for this case.
  conflict: boolean;
}

function backupFilenameFor(date: Date) {
  return `data.backup-${date.toISOString().replace(/[:.]/g, '-')}.json`;
}

export function useFileSystem() {
  const setFileHandle = useBrainStore((state) => state.setFileHandle);
  const loadNodes = useBrainStore((state) => state.loadNodes);
  const loadAssets = useBrainStore((state) => state.loadAssets);
  const loadOmnicalState = useBrainStore((state) => state.loadOmnicalState);
  const loadCardFiles = useBrainStore((state) => state.loadCardFiles);
  const loadConversations = useBrainStore((state) => state.loadConversations);
  const loadSessions = useBrainStore((state) => state.loadSessions);
  const loadTrails = useBrainStore((state) => state.loadTrails);
  const loadSequences = useBrainStore((state) => state.loadSequences);
  const setSelectedTrailIds = useBrainStore((state) => state.setSelectedTrailIds);
  const setShowActiveTrailLine = useBrainStore((state) => state.setShowActiveTrailLine);
  const addNotification = useBrainStore((state) => state.addNotification);
  const fileHandle = useBrainStore((state) => state.fileHandle);
  // Track current blob URLs for cleanup
  const currentAssetsRef = useRef<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);
  // The data.json `revision` we last read from disk (on open, or after our
  // own successful save). If a save is about to overwrite a file whose
  // on-disk revision no longer matches this, someone else (another device
  // syncing via OneDrive/Drive) wrote it since — see saveFile() below.
  const lastKnownRevisionRef = useRef<string | null>(null);
  const [saveConflict, setSaveConflict] = useState<SaveConflictInfo | null>(null);

  // --- LÄSA MAPPEN ---
  const readDirectory = useCallback(async (dirHandle: FileSystemDirectoryHandle) => {
    try {
      // 1. Be om lov
      const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        if ((await dirHandle.requestPermission({ mode: 'readwrite' })) !== 'granted') throw new Error("Ingen behörighet");
      }

      setFileHandle(dirHandle);
      await setDb('soul-folder-handle', dirHandle);

      // 2. Läs data.json. A corrupt or unsupported document must stop the
      // load instead of being mistaken for an empty workspace.
      let data = createEmptyCanvasDocument();
      try {
        const fileHandle = await dirHandle.getFileHandle('data.json');
        const file = await fileHandle.getFile();
        data = parseCanvasDocument(JSON.parse(await file.text()));
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'NotFoundError') {
          // New folder: keep the empty V1 document.
        } else {
          throw new Error(`Kunde inte läsa data.json: ${err instanceof Error ? err.message : String(err)}`);
        }
      }

      // 3. Ladda in bilder från 'assets'-mappen
      const assetsMap: Record<string, string> = {};
      try {
        const assetsHandle = await dirHandle.getDirectoryHandle('assets');
        // Loopa igenom alla filer i assets
        for await (const [name, handle] of assetsHandle.entries()) {
          if (handle.kind === 'file') {
            const file = await handle.getFile();
            // Skapa en URL som webbläsaren kan visa (blob:...)
            assetsMap[`assets/${name}`] = URL.createObjectURL(file);
          }
        }
      } catch {
        // No assets folder yet
      }

      // Revoke old blob URLs before loading new ones
      revokeAssetUrls(currentAssetsRef.current);
      currentAssetsRef.current = assetsMap;

      lastKnownRevisionRef.current = data.revision;
      setSaveConflict(null);

      loadNodes(data.nodes || [], data.synapses || []);
      loadAssets(assetsMap);
      loadOmnicalState(data.omnical);
      loadCardFiles(data.cardFiles);
      loadConversations(data.conversations || []);
      loadSessions(data.sessions || []);
      loadTrails(data.trails || []);
      loadSequences(data.sequences || []); // Ladda in
      if (data.trails && data.trails.length > 0) {
        const trailIds = new Set(data.trails.map((t: { id: string }) => t.id));
        const selectedTrailIds = data.trailUi?.selectedTrailIds?.filter((id: string) => trailIds.has(id)) || [];
        setSelectedTrailIds(selectedTrailIds);
      } else {
        setSelectedTrailIds([]);
      }
      setShowActiveTrailLine(data.trailUi.showActiveTrailLine);
      if (data.activeSessionId) {
        useBrainStore.getState().switchSession(data.activeSessionId);
      }

      // Fas 3b: mtime-scan cards/*.md in the background, after the canvas
      // has already rendered from data.json's cache — never block the
      // initial paint on this, regardless of card count.
      if (FEATURE_FLAGS.enableCardMarkdownFiles) {
        void (async () => {
          try {
            const current = useBrainStore.getState();
            const result = await scanCardFiles(dirHandle, current.nodes, current.sessions, current.cardFiles);
            const changed = result.merged > 0 || result.ingested > 0;
            useBrainStore.setState({
              nodes: result.nodes,
              sessions: result.sessions,
              cardFiles: result.baseline,
              ...(changed ? { pendingSave: true } : {}),
            });
            if (changed) {
              const parts: string[] = [];
              if (result.merged > 0) parts.push(`${result.merged} uppdaterade`);
              if (result.ingested > 0) parts.push(`${result.ingested} nya`);
              if (result.conflicts > 0) parts.push(`${result.conflicts} konflikt(er) (säkerhetskopierade i cards/.conflicts/)`);
              addNotification(`Kort-filer: ${parts.join(', ')} från disk.`, 'info', 6000);
            }
          } catch (err) {
            console.warn('[cardFileSync] Bakgrundsscan misslyckades:', err);
          }
        })();
      }
    } catch (err) {
      console.error('Kunde inte läsa mapp:', err);
      setFileHandle(null!);
    }
  }, [
    setFileHandle,
    loadNodes,
    loadAssets,
    loadOmnicalState,
    loadCardFiles,
    loadConversations,
    loadSessions,
    loadTrails,
    loadSequences,
    setSelectedTrailIds,
    setShowActiveTrailLine,
    addNotification,
  ]);

  // Cleanup blob URLs on unmount
  useEffect(() => {
    return () => {
      revokeAssetUrls(currentAssetsRef.current);
    };
  }, []);

  // --- ÖPPNA (Knappen) ---
  const openFile = useCallback(async () => {
    try {
      // Check if the API is available
      if (!('showDirectoryPicker' in window)) {
        console.error('File System Access API saknas. Använd Chrome/Edge eller annan Chromium-baserad webbläsare.');
        return;
      }

      const handle = await window.showDirectoryPicker();
      await readDirectory(handle);
    } catch (err: unknown) {
      // User cancelled the picker
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      console.error('Kunde inte öppna mappen:', err);
    }
  }, [readDirectory]);

  // --- SPARA DATA (JSON) ---
  // `force`: skip the conflict check and overwrite regardless. Used when the
  // user explicitly chooses "spara ändå" on the conflict dialog.
  // Returns a result object (not just boolean) so callers can tell "failed
  // to write" apart from "blocked by a conflict, waiting on the user" —
  // those need different UI (a generic error toast vs. letting the
  // conflict dialog speak for itself).
  const saveFile = useCallback(async (force = false): Promise<SaveResult> => {
    if (!fileHandle) return { ok: false, conflict: false };
    try {
      // Skapa/Öppna data.json i roten av mappen
      const fileRef = await fileHandle.getFileHandle('data.json', { create: true });

      if (!force) {
        try {
          const existingFile = await fileRef.getFile();
          if (existingFile.size > 0) {
            const existingText = await existingFile.text();
            const existingJson = JSON.parse(existingText) as { revision?: unknown };
            const diskRevision = typeof existingJson.revision === 'string' ? existingJson.revision : null;
            const knownRevision = lastKnownRevisionRef.current;
            if (diskRevision && knownRevision && diskRevision !== knownRevision) {
              // Someone else wrote data.json since we last read it. Don't
              // clobber their write silently — back it up and let the user
              // decide (see resolveSaveConflict below).
              const detectedAt = new Date();
              const backupFilename = backupFilenameFor(detectedAt);
              const backupRef = await fileHandle.getFileHandle(backupFilename, { create: true });
              const backupWritable = await backupRef.createWritable();
              await backupWritable.write(existingText);
              await backupWritable.close();
              console.warn(`[saveFile] Konflikt: data.json ändrades av någon annan sen senast. Backup: ${backupFilename}`);
              setSaveConflict({ backupFilename, detectedAt: detectedAt.toISOString() });
              return { ok: false, conflict: true };
            }
          }
        } catch (checkErr) {
          // Existing file unreadable/malformed — don't block the save on a
          // soft check that itself failed; fall through and write normally.
          console.warn('[saveFile] Kunde inte läsa befintlig data.json för konfliktkoll:', checkErr);
        }
      }

      // Write-only card .md sync (Fas 3a): hash-diffed against the stored
      // baseline, so this is cheap when nothing actually changed. Runs
      // after the conflict check so a "reload from disk" choice can't
      // still have written cards/*.md for state we're about to discard.
      //
      // Deliberately re-reading useBrainStore.getState() at every step
      // below instead of snapshotting it once: syncCardFiles() awaits a
      // lock shared with the background scan (Fas 3b, cardFileSync.ts). If
      // a scan finishes while this call is queued behind it, the store
      // already holds merged nodes/baseline by the time we resume — a
      // stale snapshot here would either overwrite the scan's merged file
      // with pre-scan content, or discard the merge from data.json below.
      let cardFiles = useBrainStore.getState().cardFiles;
      if (FEATURE_FLAGS.enableCardMarkdownFiles) {
        try {
          const freshState = useBrainStore.getState();
          const result = await syncCardFiles(fileHandle, freshState.nodes, freshState.cardFiles);
          cardFiles = result.baseline;
          if (result.written > 0 || result.trashed > 0) {
            console.log(`[cardFileSync] ${result.written} kort skrivna, ${result.trashed} flyttade till papperskorgen.`);
          }
        } catch (cardErr) {
          // A card-file write failure must not block the data.json save
          // that everything else depends on.
          console.warn('[cardFileSync] Kunde inte synka kort-filer:', cardErr);
        }
      }
      useBrainStore.getState().loadCardFiles(cardFiles);

      const writable = await fileRef.createWritable();

      const state = useBrainStore.getState();
      const dataToSave = serializeCanvasDocument({
        nodes: Array.from(state.nodes.values()),
        synapses: state.synapses,
        conversations: state.conversations,
        sessions: state.sessions,
        trails: state.trails,
        sequences: state.sequences,
        activeSessionId: state.activeSessionId,
        trailUi: {
          selectedTrailIds: state.selectedTrailIds,
          showActiveTrailLine: state.showActiveTrailLine,
        },
        omnical: state.omnical,
        cardFiles,
      });

      await writable.write(JSON.stringify(dataToSave, null, 2));
      await writable.close();
      lastKnownRevisionRef.current = dataToSave.revision;
      setSaveConflict(null);
      return { ok: true, conflict: false };
    } catch (err) {
      console.error('Kunde inte spara data.json:', err);
      return { ok: false, conflict: false };
    }
  }, [fileHandle]);

  // --- LÖS SPARKONFLIKT ---
  // 'overwrite': keep our in-memory version, write it over the (now backed
  //   up) disk version.
  // 'reload': discard our unsaved in-memory changes and load the other
  //   device's version from disk instead.
  const resolveSaveConflict = useCallback(async (action: 'overwrite' | 'reload'): Promise<boolean> => {
    if (action === 'overwrite') {
      const result = await saveFile(true);
      // saveFile(true) already clears saveConflict on success. If it failed
      // for some other reason (disk error etc.), clear it here too — the
      // backup is already safely on disk, so leaving the dialog up with no
      // dismiss path would just trap the user behind the error toast.
      if (!result.ok) setSaveConflict(null);
      return result.ok;
    }
    setSaveConflict(null);
    if (!fileHandle) return false;
    await readDirectory(fileHandle);
    return true;
  }, [saveFile, fileHandle, readDirectory]);

  // --- SPARA AI-EXPORT (Alla sessioner som .txt) ---
  const saveAIExports = useCallback(async () => {
    if (!fileHandle) return;
    try {
      const state = useBrainStore.getState();
      const { nodes, sessions, synapses } = state;

      // Skapa/hämta ai-exports mappen
      const exportsDir = await fileHandle.getDirectoryHandle('ai-exports', { create: true });

      // Exportera varje session
      for (const session of sessions) {
        const content = exportSessionForAI(session, nodes, synapses);
        const filename = `${sanitizeFilename(session.name)}.txt`;

        const fileRef = await exportsDir.getFileHandle(filename, { create: true });
        const writable = await fileRef.createWritable();
        await writable.write(content);
        await writable.close();
      }

      console.log(`[AI Export] Exported ${sessions.length} sessions to ai-exports/`);
    } catch (err) {
      console.error('[AI Export] Failed:', err);
    }
  }, [fileHandle]);

  const ensureNestedDirectory = useCallback(
    async (baseDir: FileSystemDirectoryHandle, subdir: string) => {
      const parts = subdir.split('/').map((p) => p.trim()).filter(Boolean);
      let current = baseDir;
      for (const part of parts) {
        current = await current.getDirectoryHandle(part, { create: true });
      }
      return current;
    },
    []
  );

  const ensureOriginalsReadme = useCallback(async (assetsDir: FileSystemDirectoryHandle) => {
    try {
      const originalsDir = await assetsDir.getDirectoryHandle('originals', { create: true });
      const readmeHandle = await originalsDir.getFileHandle('README.txt', { create: true });
      const existing = await readmeHandle.getFile();
      if (existing.size > 0) return;

      const writable = await readmeHandle.createWritable();
      await writable.write(
        [
          'Soul Canvas originals backup',
          '----------------------------',
          'Files in this folder are original imports kept as backup.',
          'It is safe to delete assets/originals if you need space.',
          '',
          'Do NOT delete:',
          '- data.json',
          '- assets/ (except assets/originals)',
          '',
        ].join('\n')
      );
      await writable.close();
    } catch {
      // Ignore README failures
    }
  }, []);

  // --- SPARA BILD (Ny funktion!) ---
  const saveAsset = useCallback(async (
    file: File,
    filename: string,
    options?: { subdir?: string; register?: boolean }
  ) => {
    if (!fileHandle) return null;
    try {
      // 1. Hämta/Skapa 'assets'-mappen
      const assetsDir = await fileHandle.getDirectoryHandle('assets', { create: true });

      const subdir = options?.subdir?.replace(/\\/g, '/').replace(/^\/|\/$/g, '') || '';
      const targetDir = subdir
        ? await ensureNestedDirectory(assetsDir, subdir)
        : assetsDir;

      if (subdir.startsWith('originals')) {
        await ensureOriginalsReadme(assetsDir);
      }

      // 2. Skapa filen där inne
      const fileRef = await targetDir.getFileHandle(filename, { create: true });
      const writable = await fileRef.createWritable();

      // 3. Skriv bild-datan
      await writable.write(file);
      await writable.close();

      // 4. Skapa en visnings-URL för sessionen
      const assetKey = subdir ? `assets/${subdir}/${filename}` : `assets/${filename}`;
      const register = options?.register ?? !subdir;
      if (!register) {
        return assetKey;
      }

      const objectUrl = URL.createObjectURL(file);

      // 5. Revoke old URL if replacing existing asset
      const oldUrl = useBrainStore.getState().assets[assetKey];
      if (oldUrl && oldUrl.startsWith('blob:')) {
        URL.revokeObjectURL(oldUrl);
      }

      // 6. Uppdatera vår assets-lista i minnet
      const newAssets = { ...useBrainStore.getState().assets, [assetKey]: objectUrl };
      currentAssetsRef.current = newAssets;
      useBrainStore.getState().loadAssets(newAssets);

      return assetKey;
    } catch {
      return null;
    }
  }, [fileHandle, ensureNestedDirectory, ensureOriginalsReadme]);

  // Restore session from IndexedDB
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedHandle = await getDb('soul-folder-handle');
        if (savedHandle) {
          await readDirectory(savedHandle);
        }
      } catch {
        // No saved session
      } finally {
        setIsReady(true);
      }
    };
    restoreSession();
  }, [readDirectory]);

  return { openFile, saveFile, saveAsset, saveAIExports, hasFile: !!fileHandle, isReady, saveConflict, resolveSaveConflict };
}
