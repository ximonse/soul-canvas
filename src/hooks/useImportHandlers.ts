// hooks/useImportHandlers.ts
// Hanterar alla import-operationer: drag-drop, paste, JSON, Zotero, bilder

import { useCallback, useEffect } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { type CanvasAPI } from './useCanvas';
import type { MindNode } from '../types/types';
import { processImageFile } from '../utils/imageProcessor';
import { parseZoteroHTML, isZoteroHTML } from '../utils/zoteroParser';
import { processPdfFile } from '../utils/pdfProcessor';

interface ImportHandlersProps {
  canvas: CanvasAPI;
  hasFile: boolean;
  saveAsset: (file: File, name: string) => Promise<string | null>;
}

// Helper: Convert data URL to Blob
const dataURLtoBlob = (dataurl: string) => {
  const arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) { u8arr[n] = bstr.charCodeAt(n); }
  return new Blob([u8arr], { type: mime });
};

export function useImportHandlers({ canvas, hasFile, saveAsset }: ImportHandlersProps) {
  const saveStateForUndo = useBrainStore((state) => state.saveStateForUndo);
  const addNode = useBrainStore((state) => state.addNode);
  const addNodeWithId = useBrainStore((state) => state.addNodeWithId);
  const updateNode = useBrainStore((state) => state.updateNode);
  const updateNodesBulk = useBrainStore((state) => state.updateNodesBulk);

  // Import JSON files
  const handleJSONImport = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      const nodeList = Array.isArray(data) ? data : data.nodes;
      if (!nodeList || !Array.isArray(nodeList)) {
        console.error('Ogiltig JSON-fil: ingen "nodes" array hittades');
        return;
      }

      saveStateForUndo();

      // Get center position for imported nodes
      const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);

      // Calculate bounds of imported nodes
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodeList.forEach((node: Partial<MindNode>) => {
        minX = Math.min(minX, node.x || 0);
        minY = Math.min(minY, node.y || 0);
        maxX = Math.max(maxX, node.x || 0);
        maxY = Math.max(maxY, node.y || 0);
      });
      const importCenterX = (minX + maxX) / 2;
      const importCenterY = (minY + maxY) / 2;

      const importTag = 'imported_' + new Date().toISOString().slice(2, 10).replace(/-/g, '');
      let importedCount = 0;
      const bulkUpdates: Array<{ id: string; updates: Partial<MindNode> }> = [];

      nodeList.forEach((node: Partial<MindNode>) => {
        const offsetX = (node.x || 0) - importCenterX;
        const offsetY = (node.y || 0) - importCenterY;

        const newNodeId = crypto.randomUUID();
        const newNode = {
          ...node,
          id: newNodeId,
          x: centerPos.x + offsetX,
          y: centerPos.y + offsetY,
          tags: [...(node.tags || []), importTag],
        };

        addNodeWithId(
          newNodeId,
          newNode.content || '',
          newNode.x,
          newNode.y,
          newNode.type || 'text'
        );

        const { id: _ignoredId, x: _x, y: _y, content: _content, type: _type, tags: _tags, ...rest } =
          (node as Record<string, unknown>);

        const updates: Partial<MindNode> = {
          ...(rest as Partial<MindNode>),
          tags: newNode.tags,
          updatedAt: (node.updatedAt || node.createdAt) as string | undefined,
        };

        bulkUpdates.push({ id: newNodeId, updates });

        importedCount++;
      });

      if (bulkUpdates.length > 0) {
        updateNodesBulk(bulkUpdates);
      }

      console.info(`Importerade ${importedCount} kort från ${file.name}`);
    } catch (error) {
      console.error('JSON import error:', error);
    }
  }, [saveStateForUndo, addNodeWithId, updateNodesBulk, canvas]);

  // Handle drag-and-drop of files
  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasFile) return;

    const worldPos = canvas.screenToWorld(e.clientX, e.clientY);
    const files = Array.from(e.dataTransfer.files);

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const resizedBase64 = await processImageFile(file, 900);
        const blob = dataURLtoBlob(resizedBase64);
        const processedFile = new File([blob], file.name, { type: 'image/jpeg' });
        const uniqueName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const relativePath = await saveAsset(processedFile, uniqueName);
        if (relativePath) addNode(relativePath, worldPos.x, worldPos.y, 'image');
      } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        await handleJSONImport(file);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          const images = await processPdfFile(file);
          const spacing = 320; // Slightly larger than standard card width
          const cols = Math.ceil(Math.sqrt(images.length));

          for (let i = 0; i < images.length; i++) {
            const blob = images[i];
            const pageNum = i + 1;
            const processedFile = new File([blob], `${file.name}_page_${pageNum}.jpg`, { type: 'image/jpeg' });
            const uniqueName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}_p${pageNum}`;
            const relativePath = await saveAsset(processedFile, uniqueName);

            if (relativePath) {
              const row = Math.floor(i / cols);
              const col = i % cols;
              // Add simple offset to avoid perfect overlap if dropped at same spot, but mainly grid
              addNode(
                relativePath,
                worldPos.x + col * spacing,
                worldPos.y + row * spacing,
                'image'
              );
            }
          }
        } catch (error) {
          console.error('PDF import error:', error);
        }
      } else if (file.type === 'text/html' || file.name.endsWith('.html')) {
        const text = await file.text();
        if (isZoteroHTML(text)) {
          const notes = parseZoteroHTML(text);
          if (notes.length > 0) {
            const spacing = 350;
            const cols = Math.ceil(Math.sqrt(notes.length));
            notes.forEach((note, index) => {
              const row = Math.floor(index / cols);
              const col = index % cols;
              const nodeId = crypto.randomUUID();
              addNodeWithId(nodeId, note.content, worldPos.x + col * spacing, worldPos.y + row * spacing, 'text');

              // Build tags: author/year + PDF name (if available)
              const allTags = [...note.tags];
              if (note.pdfName) {
                allTags.push(note.pdfName);
              }

              // Build link name from tags (author + year)
              const linkName = note.tags.length >= 2
                ? `${note.tags[0]} (${note.tags[1]})`
                : note.pdfName || 'PDF';

              updateNode(nodeId, {
                caption: note.caption,
                tags: allTags,
                link: note.pdfLink ? `[${linkName}](${note.pdfLink})` : undefined,
                accentColor: note.color,
              });
            });
          } else {
            addNode(text, worldPos.x, worldPos.y, 'text');
          }
        } else {
          addNode(text, worldPos.x, worldPos.y, 'text');
        }
      }
    }
  }, [hasFile, canvas, saveAsset, handleJSONImport, addNode, addNodeWithId, updateNode]);

  // Handle paste events (images)
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!hasFile) return;
      if (document.activeElement instanceof HTMLElement && ['TEXTAREA', 'INPUT'].includes(document.activeElement.tagName)) return;

      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const resizedBase64 = await processImageFile(file, 900);
            const blob = dataURLtoBlob(resizedBase64);
            const processedFile = new File([blob], 'pasted_image.jpg', { type: 'image/jpeg' });
            const uniqueName = `pasted_${Date.now()}.jpg`;
            const relativePath = await saveAsset(processedFile, uniqueName);
            const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            if (relativePath) addNode(relativePath, centerPos.x, centerPos.y, 'image');
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [hasFile, canvas, saveAsset, addNode]);

  return {
    handleDrop,
    handleJSONImport,
  };
}

