// src/hooks/useFileSystem.ts
import { useCallback, useEffect, useState, useRef } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { set as setDb, get as getDb } from 'idb-keyval';

// Helper to revoke all blob URLs in an assets map
function revokeAssetUrls(assets: Record<string, string>) {
  Object.values(assets).forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  });
}

export function useFileSystem() {
  const setFileHandle = useBrainStore((state) => state.setFileHandle);
  const loadNodes = useBrainStore((state) => state.loadNodes);
  const loadAssets = useBrainStore((state) => state.loadAssets);
  const loadConversations = useBrainStore((state) => state.loadConversations);
  const loadSessions = useBrainStore((state) => state.loadSessions);
  const loadTrails = useBrainStore((state) => state.loadTrails);
  const setSelectedTrailIds = useBrainStore((state) => state.setSelectedTrailIds);
  const setShowActiveTrailLine = useBrainStore((state) => state.setShowActiveTrailLine);
  const fileHandle = useBrainStore((state) => state.fileHandle);
  // Track current blob URLs for cleanup
  const currentAssetsRef = useRef<Record<string, string>>({});
  const [isReady, setIsReady] = useState(false);

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

      // 2. Leta efter data.json
      let data = {
        nodes: [],
        synapses: [],
        conversations: [],
        sessions: [],
        trails: [],
        activeSessionId: null as string | null,
        trailUi: { selectedTrailIds: [] as string[], showActiveTrailLine: true },
      };
      try {
        const fileHandle = await dirHandle.getFileHandle('data.json');
        const file = await fileHandle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);

        // Säkerställ att nodes är en array
        let nodes = parsed.nodes || [];
        if (!Array.isArray(nodes)) {
          // Om nodes är ett objekt (från en Map), konvertera till array
          nodes = Object.values(nodes).filter(n => n && typeof n === 'object');
        }

        const rawSelectedTrailIds = Array.isArray(parsed.trailUi?.selectedTrailIds)
          ? parsed.trailUi.selectedTrailIds
          : Array.isArray(parsed.selectedTrailIds)
            ? parsed.selectedTrailIds
            : [];
        const rawShowActiveTrailLine = typeof parsed.trailUi?.showActiveTrailLine === 'boolean'
          ? parsed.trailUi.showActiveTrailLine
          : typeof parsed.showActiveTrailLine === 'boolean'
            ? parsed.showActiveTrailLine
            : true;

        data = {
          nodes,
          synapses: parsed.synapses || [],
          conversations: parsed.conversations || [],
          sessions: parsed.sessions || [],
          trails: parsed.trails || [],
          activeSessionId: parsed.activeSessionId || null,
          trailUi: {
            selectedTrailIds: rawSelectedTrailIds,
            showActiveTrailLine: rawShowActiveTrailLine,
          },
        };
      } catch {
        // No data.json found, start with empty brain
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

      loadNodes(data.nodes || [], data.synapses || []);
      loadAssets(assetsMap);
      loadConversations(data.conversations || []);
      loadSessions(data.sessions || []);
      loadTrails(data.trails || []);
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
    } catch (err) {
      console.error('Kunde inte läsa mapp:', err);
      setFileHandle(null!);
    }
  }, [
    setFileHandle,
    loadNodes,
    loadAssets,
    loadConversations,
    loadSessions,
    loadTrails,
    setSelectedTrailIds,
    setShowActiveTrailLine,
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
  const saveFile = useCallback(async () => {
    if (!fileHandle) return;
    try {
      // Skapa/Öppna data.json i roten av mappen
      const fileRef = await fileHandle.getFileHandle('data.json', { create: true });
      const writable = await fileRef.createWritable();
      
      const state = useBrainStore.getState();
      const dataToSave = {
        version: "3.0-folder",
        lastSaved: new Date().toISOString(),
        nodes: Array.from(state.nodes.values()),
        synapses: state.synapses,
        conversations: state.conversations,
        sessions: state.sessions,
        trails: state.trails,
        activeSessionId: state.activeSessionId,
        trailUi: {
          selectedTrailIds: state.selectedTrailIds,
          showActiveTrailLine: state.showActiveTrailLine,
        },
      };
      
      await writable.write(JSON.stringify(dataToSave, null, 2));
      await writable.close();
    } catch {
      // Save failed silently - data persists in memory
    }
  }, [fileHandle]);

  // --- SPARA BILD (Ny funktion!) ---
  const saveAsset = useCallback(async (file: File, filename: string) => {
    if (!fileHandle) return null;
    try {
      // 1. Hämta/Skapa 'assets'-mappen
      const assetsDir = await fileHandle.getDirectoryHandle('assets', { create: true });
      
      // 2. Skapa filen där inne
      const fileRef = await assetsDir.getFileHandle(filename, { create: true });
      const writable = await fileRef.createWritable();
      
      // 3. Skriv bild-datan
      await writable.write(file);
      await writable.close();

      // 4. Skapa en visnings-URL för sessionen
      const objectUrl = URL.createObjectURL(file);
      const assetKey = `assets/${filename}`;

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
  }, [fileHandle]);

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

  return { openFile, saveFile, saveAsset, hasFile: !!fileHandle, isReady };
}
