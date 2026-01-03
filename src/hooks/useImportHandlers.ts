// hooks/useImportHandlers.ts
// Hanterar alla import-operationer: drag-drop, paste, JSON, Zotero, bilder

import { useCallback, useEffect } from 'react';
import { useBrainStore } from '../store/useBrainStore';
import { type CanvasAPI } from './useCanvas';
import type { MindNode } from '../types/types';
import { processImageFile } from '../utils/imageProcessor';
import { parseZoteroHTML, parseZoteroPlainText, isZoteroHTML, type ZoteroNote } from '../utils/zoteroParser';
import { processPdfFile } from '../utils/pdfProcessor';
import { parseRis, type RisMetadata } from '../utils/risParser';
import { parseCoinsHtml } from '../utils/coinsParser';

interface ImportHandlersProps {
  canvas: CanvasAPI;
  hasFile: boolean;
  saveAsset: (
    file: File,
    name: string,
    options?: { subdir?: string; register?: boolean }
  ) => Promise<string | null>;
  requestPdfGroupName?: (suggestedName: string) => Promise<string | null>;
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

export function useImportHandlers({
  canvas,
  hasFile,
  saveAsset,
  requestPdfGroupName,
}: ImportHandlersProps) {
  const saveStateForUndo = useBrainStore((state) => state.saveStateForUndo);
  const addNode = useBrainStore((state) => state.addNode);
  const addNodeWithId = useBrainStore((state) => state.addNodeWithId);
  const updateNode = useBrainStore((state) => state.updateNode);
  const updateNodesBulk = useBrainStore((state) => state.updateNodesBulk);
  const MAX_IMAGE_WIDTH = 800;
  const PDF_MAX_WIDTH = 1000;
  const PDF_QUALITY = 0.9;

  const toSafeName = (name: string) => name.replace(/\s+/g, '_');
  const normalizeKey = (name: string) => name.trim().toLowerCase();

  const askPdfGroupName = useCallback(async (suggestedName: string) => {
    if (requestPdfGroupName) {
      return requestPdfGroupName(suggestedName);
    }
    const input = window.prompt('Gruppnamn för PDF:', suggestedName);
    if (input === null) return null;
    const trimmed = input.trim();
    return trimmed || suggestedName;
  }, [requestPdfGroupName]);

  const extractRisFromText = useCallback((text: string | null | undefined): RisMetadata | null => {
    if (!text) return null;
    const trimmed = text.trim();
    if (!trimmed) return null;
    if (!trimmed.includes('TY  -')) return null;
    return parseRis(trimmed);
  }, []);

  const buildSourceMetadataUpdates = (
    metadata?: RisMetadata,
    options?: {
      pdfId?: string;
      useCaption?: boolean;
      zoteroItemKey?: string;
      zoteroPdfPath?: string;
    }
  ): Partial<MindNode> => {
    const updates: Partial<MindNode> = {};
    if (options?.pdfId) updates.pdfId = options.pdfId;
    if (options?.zoteroItemKey) updates.zoteroItemKey = options.zoteroItemKey;
    if (options?.zoteroPdfPath) updates.zoteroPdfPath = options.zoteroPdfPath;
    if (!metadata) return updates;

    const tags = new Set<string>();
    metadata.keywords.forEach((tag) => {
      const clean = tag.trim();
      if (clean) tags.add(clean);
    });
    metadata.authors.forEach((author) => {
      const clean = author.trim();
      if (clean) tags.add(clean);
    });
    if (metadata.year) tags.add(metadata.year);

    if (tags.size > 0) {
      updates.tags = Array.from(tags);
    }

    if (metadata.title) {
      const decorated = metadata.year
        ? `${metadata.title} (${metadata.year})`
        : metadata.title;
      if (options?.useCaption) {
        updates.caption = decorated;
      } else {
        updates.title = decorated;
      }
    }

    const commentParts: string[] = [];
    if (metadata.authors.length > 0) {
      commentParts.push(`Authors: ${metadata.authors.join(', ')}`);
    }
    if (metadata.year) commentParts.push(`Year: ${metadata.year}`);
    if (metadata.doi) commentParts.push(`DOI: ${metadata.doi}`);
    if (metadata.url) commentParts.push(`URL: ${metadata.url}`);
    if (commentParts.length > 0) {
      updates.comment = commentParts.join('\n');
    }

    const linkUrl = metadata.url || (metadata.doi ? `https://doi.org/${metadata.doi}` : '');
    if (linkUrl) {
      updates.link = `[Source](${linkUrl})`;
    }

    if (metadata.doi) {
      updates.sourceId = `doi:${metadata.doi}`;
    } else if (metadata.url) {
      updates.sourceId = `url:${metadata.url}`;
    } else if (options?.zoteroItemKey) {
      updates.sourceId = `zotero:${options.zoteroItemKey}`;
    }

    return updates;
  };

  const buildZoteroPdfLink = (zoteroItemKey?: string, page?: number) => {
    if (!zoteroItemKey) return null;
    const pageSuffix = page && page > 0 ? `?page=${page}` : '';
    return `zotero://open-pdf/library/items/${zoteroItemKey}${pageSuffix}`;
  };

  const addZoteroNotes = useCallback((notes: ZoteroNote[], originX: number, originY: number) => {
    if (notes.length === 0) return;
    const parsePdfId = (pdfId: string) => {
      const match = pdfId.match(/^(.*)_(\d+)_(\d+)$/);
      if (!match) return null;
      return {
        group: match[1],
        page: Number(match[2]),
        total: Number(match[3]),
      };
    };

    const findPdfGroupForZoteroKey = (key?: string) => {
      if (!key) return null;
      const matches = Array.from(useBrainStore.getState().nodes.values())
        .filter((node) => node.zoteroItemKey === key && node.pdfId)
        .map((node) => parsePdfId(node.pdfId || ''))
        .filter((parsed): parsed is NonNullable<typeof parsed> => Boolean(parsed));
      if (matches.length === 0) return null;
      const group = matches[0].group;
      const total = matches.reduce((max, item) => Math.max(max, item.total), 0);
      return { group, total };
    };

    const extractPageFromPdfLink = (link?: string) => {
      if (!link) return null;
      const match = link.match(/[?&]page=(\d+)/);
      return match ? Number(match[1]) : null;
    };

    const resolvePdfIdForNote = (note: ZoteroNote) => {
      const group = findPdfGroupForZoteroKey(note.zoteroItemKey);
      if (!group) return undefined;
      const page = extractPageFromPdfLink(note.pdfLink);
      if (page) {
        return `${group.group}_${page}_${group.total}`;
      }
      return `${group.group}_0_${group.total}`;
    };
    const spacing = 350;
    const cols = Math.ceil(Math.sqrt(notes.length));
    notes.forEach((note, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      const nodeId = crypto.randomUUID();
      addNodeWithId(nodeId, note.content, originX + col * spacing, originY + row * spacing, 'text');

      const allTags = [...note.tags];
      if (note.pdfName) {
        allTags.push(note.pdfName);
      }
      if (note.zoteroItemKey) {
        allTags.push(`zotero:${note.zoteroItemKey}`);
      }

      const linkName = note.tags.length >= 2
        ? `${note.tags[0]} (${note.tags[1]})`
        : note.pdfName || 'PDF';

      updateNode(nodeId, {
        caption: note.caption,
        tags: allTags,
        link: note.pdfLink ? `[${linkName}](${note.pdfLink})` : undefined,
        zoteroItemKey: note.zoteroItemKey,
        zoteroPdfPath: note.pdfLink,
        pdfId: resolvePdfIdForNote(note),
        accentColor: note.color,
      });
    });
  }, [addNodeWithId, updateNode]);

  const saveOriginal = useCallback(async (file: File, filename: string) => {
    await saveAsset(file, filename, { subdir: 'originals', register: false });
  }, [saveAsset]);

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

        const rest = { ...(node as Record<string, unknown>) };
        delete rest.id;
        delete rest.x;
        delete rest.y;
        delete rest.content;
        delete rest.type;
        delete rest.tags;

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
    const parseUriList = (raw: string) => (
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#'))
    );
    const extractZoteroInfo = (raw: string) => {
      const entries = parseUriList(raw);
      for (const entry of entries) {
        if (!entry.startsWith('file://')) continue;
        const decoded = decodeURIComponent(entry);
        const match = decoded.match(/[/\\]Zotero[/\\]storage[/\\]([A-Z0-9]{8})[/\\]/i);
        if (!match) continue;
        return {
          zoteroItemKey: match[1],
          zoteroPdfPath: entry,
        };
      }
      return null;
    };
    const risMetadataByBaseName = new Map<string, RisMetadata>();
    const risFromText = extractRisFromText(
      e.dataTransfer.getData('application/x-research-info-systems')
        || e.dataTransfer.getData('text/plain')
    );
    const htmlPayload = e.dataTransfer.getData('text/html');
    const plainTextPayload = e.dataTransfer.getData('text/plain');
    const coinsMetadata = parseCoinsHtml(htmlPayload);
    const uriListRaw = e.dataTransfer.getData('text/uri-list');
    const zoteroInfo = uriListRaw ? extractZoteroInfo(uriListRaw) : null;

    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.ris')) {
        try {
          const text = await file.text();
          const metadata = parseRis(text);
          const baseName = file.name.replace(/\.ris$/i, '');
          risMetadataByBaseName.set(normalizeKey(baseName), metadata);
        } catch (error) {
          console.warn('RIS import error:', error);
        }
      }
    }

    if (risFromText) {
      const pdfFiles = files.filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
      if (pdfFiles.length === 1) {
        const baseName = pdfFiles[0].name.replace(/\.pdf$/i, '');
        risMetadataByBaseName.set(normalizeKey(baseName), risFromText);
      }
    }

    const zoteroNotes = htmlPayload && isZoteroHTML(htmlPayload)
      ? parseZoteroHTML(htmlPayload)
      : [];
    const plainTextNotes = zoteroNotes.length === 0
      ? parseZoteroPlainText(plainTextPayload)
      : [];
    const notesToAdd = zoteroNotes.length > 0 ? zoteroNotes : plainTextNotes;

    if (notesToAdd.length > 0) {
      saveStateForUndo();
      addZoteroNotes(notesToAdd, worldPos.x, worldPos.y);
      if (files.length === 0) {
        return;
      }
    }

    if (files.length === 0 && (coinsMetadata || risFromText)) {
      const metadata = coinsMetadata || risFromText || undefined;
      const sourceId = metadata?.doi
        ? `doi:${metadata.doi}`
        : metadata?.url
          ? `url:${metadata.url}`
          : null;
      if (sourceId) {
        const alreadyExists = Array.from(useBrainStore.getState().nodes.values())
          .some((node) => node.sourceId === sourceId);
        if (alreadyExists) {
          console.warn('Zotero item already imported:', sourceId);
        }
      }

      const baseText = e.dataTransfer.getData('text/plain') || metadata?.title || '';
      if (baseText.trim()) {
        saveStateForUndo();
        const nodeId = crypto.randomUUID();
        addNodeWithId(nodeId, baseText.trim(), worldPos.x, worldPos.y, 'text');
        updateNode(nodeId, buildSourceMetadataUpdates(metadata, {
          zoteroItemKey: zoteroInfo?.zoteroItemKey,
          zoteroPdfPath: zoteroInfo?.zoteroPdfPath,
        }));
      }
      return;
    }

    for (const file of files) {
      if (file.name.toLowerCase().endsWith('.ris')) {
        continue;
      }
      if (file.type.startsWith('image/')) {
        const stamp = Date.now();
        const safeName = toSafeName(file.name);
        await saveOriginal(file, `${stamp}_${safeName}`);
        const resizedBase64 = await processImageFile(file, MAX_IMAGE_WIDTH);
        const blob = dataURLtoBlob(resizedBase64);
        const processedFile = new File([blob], file.name, { type: 'image/jpeg' });
        const uniqueName = `${stamp}_${safeName}`;
        const relativePath = await saveAsset(processedFile, uniqueName);
        if (relativePath) addNode(relativePath, worldPos.x, worldPos.y, 'image');
      } else if (file.type === 'application/json' || file.name.endsWith('.json')) {
        await handleJSONImport(file);
      } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
          const baseName = file.name.replace(/\.pdf$/i, '') || 'pdf';
          const groupName = await askPdfGroupName(baseName);
          if (!groupName) {
            continue;
          }
          const safeBase = toSafeName(groupName.replace(/\.pdf$/i, '') || baseName);
          const existingGroup = Array.from(useBrainStore.getState().nodes.values())
            .some((node) => node.pdfId && node.pdfId.startsWith(`${safeBase}_`));
          const existingZotero = zoteroInfo?.zoteroItemKey
            ? Array.from(useBrainStore.getState().nodes.values())
              .some((node) => node.zoteroItemKey === zoteroInfo.zoteroItemKey)
            : false;
          if (existingGroup || existingZotero) {
            const warning = existingZotero
              ? `Zotero-item ${zoteroInfo?.zoteroItemKey} finns redan. Importera igen?`
              : `PDF-gruppen "${safeBase}" finns redan. Importera igen?`;
            const proceed = window.confirm(warning);
            if (!proceed) {
              continue;
            }
          }
          const images = await processPdfFile(file, PDF_MAX_WIDTH, PDF_QUALITY);
          const risMetadata = risMetadataByBaseName.get(normalizeKey(baseName));
          await saveOriginal(file, `${safeBase}.pdf`);
          const spacing = 320; // Slightly larger than standard card width
          const cols = Math.ceil(Math.sqrt(images.length));
          const totalPages = images.length;

          for (let i = 0; i < images.length; i++) {
            const blob = images[i];
            const pageNum = i + 1;
              const pdfId = `${safeBase}_${pageNum}_${totalPages}`;
              const fileName = `${pdfId}.jpg`;
              const processedFile = new File([blob], fileName, { type: 'image/jpeg' });
              const relativePath = await saveAsset(processedFile, fileName);

            if (relativePath) {
              const row = Math.floor(i / cols);
              const col = i % cols;
              const nodeId = crypto.randomUUID();
              // Add simple offset to avoid perfect overlap if dropped at same spot, but mainly grid
              addNodeWithId(
                nodeId,
                relativePath,
                worldPos.x + col * spacing,
                worldPos.y + row * spacing,
                'image'
              );
              const updates = buildSourceMetadataUpdates(risMetadata, {
                pdfId,
                useCaption: true,
                zoteroItemKey: zoteroInfo?.zoteroItemKey,
                zoteroPdfPath: zoteroInfo?.zoteroPdfPath,
              });
              updates.imageRef = relativePath;
              updates.content = '';
              const pdfLink = buildZoteroPdfLink(zoteroInfo?.zoteroItemKey, pageNum);
              if (pdfLink) {
                updates.link = `[PDF](${pdfLink})`;
              }
              updateNode(nodeId, updates);
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
            addZoteroNotes(notes, worldPos.x, worldPos.y);
          } else {
            addNode(text, worldPos.x, worldPos.y, 'text');
          }
        } else {
          addNode(text, worldPos.x, worldPos.y, 'text');
        }
      }
    }
  }, [
    hasFile,
    canvas,
    saveAsset,
    saveOriginal,
    handleJSONImport,
    addNode,
    addNodeWithId,
    updateNode,
    askPdfGroupName,
    extractRisFromText,
    addZoteroNotes,
    saveStateForUndo,
  ]);

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
            const stamp = Date.now();
            const safeName = toSafeName(file.name || `pasted_${stamp}.png`);
            await saveOriginal(file, `${stamp}_${safeName}`);
            const resizedBase64 = await processImageFile(file, MAX_IMAGE_WIDTH);
            const blob = dataURLtoBlob(resizedBase64);
            const processedFile = new File([blob], 'pasted_image.jpg', { type: 'image/jpeg' });
            const uniqueName = `pasted_${stamp}.jpg`;
            const relativePath = await saveAsset(processedFile, uniqueName);
            const centerPos = canvas.screenToWorld(window.innerWidth / 2, window.innerHeight / 2);
            if (relativePath) addNode(relativePath, centerPos.x, centerPos.y, 'image');
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [hasFile, canvas, saveAsset, saveOriginal, addNode]);

  return {
    handleDrop,
    handleJSONImport,
  };
}

