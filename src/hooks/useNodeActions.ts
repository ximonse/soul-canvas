// hooks/useNodeActions.ts
// Hanterar alla åtgärder på noder: radera, OCR, center camera, bulk tagging

import { useCallback } from 'react';
import type Konva from 'konva';
import { useBrainStore } from '../store/useBrainStore';
import { performOCR } from '../utils/gemini';
import type { ContextMenuState } from '../components/overlays/ContextMenu';
import { ZOOM } from '../utils/constants';
import type { MindNode } from '../types/types';

interface NodeActionsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  setShowSettings: (show: boolean) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  visibleNodes?: import('../types/types').MindNode[];
}

export function useNodeActions({ stageRef, setShowSettings, setContextMenu, visibleNodes }: NodeActionsProps) {
  const store = useBrainStore();

  // Center camera on selected nodes (or all if none selected)
  const centerCamera = useCallback(() => {
    const allNodes = Array.from(store.nodes.values()) as MindNode[];
    const targetNodes = allNodes.filter((n: MindNode) => n.selected).length > 0
      ? allNodes.filter((n: MindNode) => n.selected)
      : allNodes;

    // Update stage directly instead of via canvas.view
    if (!stageRef.current || targetNodes.length === 0) return;

    let sumX = 0, sumY = 0;
    targetNodes.forEach((n: MindNode) => {
      sumX += n.x;
      sumY += n.y;
    });

    const centerX = sumX / targetNodes.length;
    const centerY = sumY / targetNodes.length;
    const currentScale = stageRef.current.scaleX();

    stageRef.current.position({
      x: (window.innerWidth / 2) - (centerX * currentScale),
      y: (window.innerHeight / 2) - (centerY * currentScale),
    });
    stageRef.current.batchDraw();
  }, [store.nodes, stageRef]);

  // Fit all visible nodes in view (zoom to show everything, as large as possible)
  const fitAllNodes = useCallback(() => {
    // Använd synliga noder om tillgängliga, annars alla
    const nodes: MindNode[] = visibleNodes && visibleNodes.length > 0
      ? visibleNodes
      : Array.from(store.nodes.values()) as MindNode[];
    if (!stageRef.current || nodes.length === 0) return;

    // Beräkna bounding box för synliga kort
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach((n: MindNode) => {
      const w = n.width || 200;
      const h = n.height || 100;
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + w);
      maxY = Math.max(maxY, n.y + h);
    });

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 50; // Marginal runt innehållet

    // Beräkna zoom för att passa allt (min per constant, max 100%)
    const scaleX = (window.innerWidth - padding * 2) / contentWidth;
    const scaleY = (window.innerHeight - padding * 2) / contentHeight;
    const newScale = Math.max(ZOOM.MIN, Math.min(scaleX, scaleY, 1));

    // Centrera innehållet
    const centerX = minX + contentWidth / 2;
    const centerY = minY + contentHeight / 2;

    stageRef.current.scale({ x: newScale, y: newScale });
    stageRef.current.position({
      x: (window.innerWidth / 2) - (centerX * newScale),
      y: (window.innerHeight / 2) - (centerY * newScale),
    });
    stageRef.current.batchDraw();
  }, [store.nodes, stageRef, visibleNodes]);

  // Reset zoom to 100% and center
  const resetZoom = useCallback(() => {
    const allNodes = Array.from(store.nodes.values()) as MindNode[];
    if (!stageRef.current) return;

    // Beräkna center av alla kort
    let centerX = 0, centerY = 0;
    if (allNodes.length > 0) {
      allNodes.forEach((n: MindNode) => {
        centerX += n.x + (n.width || 200) / 2;
        centerY += n.y + (n.height || 100) / 2;
      });
      centerX /= allNodes.length;
      centerY /= allNodes.length;
    }

    stageRef.current.scale({ x: 1, y: 1 });
    stageRef.current.position({
      x: (window.innerWidth / 2) - centerX,
      y: (window.innerHeight / 2) - centerY,
    });
    stageRef.current.batchDraw();
  }, [store.nodes, stageRef]);

  // Run OCR on an image node
  const runOCR = useCallback(async (id: string) => {
    const node = store.nodes.get(id);
    if (!node || node.type !== 'image') return;
    if (!store.geminiKey) {
      setShowSettings(true);
      return;
    }

    const assetUrl = store.assets[node.content];
    if (!assetUrl) {
      console.error('Hittar inte bilden för OCR');
      return;
    }

    store.updateNode(id, { ocrText: 'Läser...' });
    setContextMenu(null);

    try {
      const response = await fetch(assetUrl);
      const blob = await response.blob();

      // Convert blob to base64 using Promise
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const result = await performOCR(base64, store.geminiKey || '');

      // Re-fetch node to avoid stale closure - node might have changed
      const currentNode = useBrainStore.getState().nodes.get(id);
      if (!currentNode) return; // Node was deleted

      let finalText = result.text;
      if (result.description) finalText += '\n\n--- BILDANALYS ---\n' + result.description;

      store.updateNode(id, {
        ocrText: finalText,
        tags: [...new Set([...currentNode.tags, ...result.tags])],
        isFlipped: true
      });
    } catch (error) {
      store.updateNode(id, { ocrText: 'OCR misslyckades' });
    }
  }, [store, setShowSettings, setContextMenu]);

  // Run OCR on all selected image nodes
  const runOCROnSelected = useCallback(async () => {
    const selectedImages = (Array.from(store.nodes.values()) as MindNode[])
      .filter((n: MindNode) => n.selected && n.type === 'image');

    if (selectedImages.length === 0) return;

    if (!store.geminiKey) {
      setShowSettings(true);
      return;
    }

    setContextMenu(null);

    // Process all selected images
    for (const node of selectedImages) {
      await runOCR(node.id);
    }
  }, [store, runOCR, setShowSettings, setContextMenu]);

  // Delete selected nodes
  const deleteSelected = useCallback(() => {
    const selectedNodes = (Array.from(store.nodes.values()) as MindNode[]).filter((n: MindNode) => n.selected);
    if (selectedNodes.length === 0) return;
    const requiresConfirm = selectedNodes.length >= 10;
    if (requiresConfirm && !confirm(`Radera ${selectedNodes.length} valda kort?`)) return;
    store.saveStateForUndo();
    selectedNodes.forEach((node: MindNode) => store.removeNode(node.id));
  }, [store]);

  // Add tag to all selected nodes
  const addBulkTag = useCallback((tag: string) => {
    if (tag.trim()) {
      store.addTagToSelected(tag.trim());
    }
  }, [store]);

  return {
    centerCamera,
    fitAllNodes,
    resetZoom,
    runOCR,
    runOCROnSelected,
    deleteSelected,
    addBulkTag,
  };
}
