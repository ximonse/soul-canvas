// hooks/useNodeActions.ts
// Hanterar alla åtgärder på noder: radera, OCR, center camera, bulk tagging

import { useCallback } from 'react';
import type Konva from 'konva';
import { useBrainStore } from '../store/useBrainStore';
import { performOCR } from '../utils/gemini';
import { getImageRef, resolveImageUrl } from '../utils/imageRefs';
import type { CanvasAPI } from './useCanvas';
import type { ContextMenuState } from '../components/overlays/ContextMenu';
import { ZOOM } from '../utils/constants';
import type { MindNode } from '../types/types';

interface NodeActionsProps {
  stageRef: React.RefObject<Konva.Stage | null>;
  canvas: CanvasAPI;
  setShowSettings: (show: boolean) => void;
  setContextMenu: (menu: ContextMenuState | null) => void;
  visibleNodes?: import('../types/types').MindNode[];
}

export function useNodeActions({ stageRef, canvas, setShowSettings, setContextMenu, visibleNodes }: NodeActionsProps) {
  const nodes = useBrainStore((state) => state.nodes);
  const selectedNodeIds = useBrainStore((state) => state.selectedNodeIds);
  const geminiKey = useBrainStore((state) => state.geminiKey);
  const geminiOcrModel = useBrainStore((state) => state.geminiOcrModel);
  const assets = useBrainStore((state) => state.assets);
  const updateNode = useBrainStore((state) => state.updateNode);
  const setNodeAIProcessing = useBrainStore((state) => state.setNodeAIProcessing);
  const saveStateForUndo = useBrainStore((state) => state.saveStateForUndo);
  const removeNode = useBrainStore((state) => state.removeNode);
  const addTagToSelected = useBrainStore((state) => state.addTagToSelected);

  // Center camera on selected nodes (or all if none selected)
  const centerCamera = useCallback(() => {
    const allNodes = Array.from(nodes.values()) as MindNode[];
    const selectedNodes = Array.from(selectedNodeIds)
      .map(id => nodes.get(id))
      .filter(Boolean) as MindNode[];
    const targetNodes = selectedNodes.length > 0 ? selectedNodes : allNodes;

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

    const nextView = {
      x: (window.innerWidth / 2) - (centerX * currentScale),
      y: (window.innerHeight / 2) - (centerY * currentScale),
      k: currentScale,
    };
    stageRef.current.position({ x: nextView.x, y: nextView.y });
    stageRef.current.batchDraw();
    canvas.setView(nextView);
  }, [nodes, selectedNodeIds, stageRef, canvas]);

  // Fit all visible nodes in view (zoom to show everything, as large as possible)
  const fitAllNodes = useCallback(() => {
    // Använd synliga noder om tillgängliga, annars alla
    const nodes: MindNode[] = visibleNodes && visibleNodes.length > 0
      ? visibleNodes
      : Array.from(useBrainStore.getState().nodes.values()) as MindNode[];
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

    const nextView = {
      x: (window.innerWidth / 2) - (centerX * newScale),
      y: (window.innerHeight / 2) - (centerY * newScale),
      k: newScale,
    };
    stageRef.current.scale({ x: newScale, y: newScale });
    stageRef.current.position({ x: nextView.x, y: nextView.y });
    stageRef.current.batchDraw();
    canvas.setView(nextView);
  }, [stageRef, visibleNodes, canvas]);

  // Reset zoom to 100% and center
  const resetZoom = useCallback(() => {
    const allNodes = Array.from(nodes.values()) as MindNode[];
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

    const nextView = {
      x: (window.innerWidth / 2) - centerX,
      y: (window.innerHeight / 2) - centerY,
      k: 1,
    };
    stageRef.current.scale({ x: 1, y: 1 });
    stageRef.current.position({ x: nextView.x, y: nextView.y });
    stageRef.current.batchDraw();
    canvas.setView(nextView);
  }, [nodes, stageRef, canvas]);

  // Run OCR on an image node
  const runOCR = useCallback(async (id: string) => {
    const node = nodes.get(id);
    if (!node || node.type !== 'image') return;
    if (!geminiKey) {
      setShowSettings(true);
      return;
    }

    const assetUrl = resolveImageUrl(node, assets);
    if (!assetUrl) {
      console.error('Hittar inte bilden för OCR');
      return;
    }

    updateNode(id, { ocrText: 'Läser...' });
    setNodeAIProcessing(id, 'gemini');
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

      const result = await performOCR(base64, geminiKey || '', geminiOcrModel);

      // Re-fetch node to avoid stale closure - node might have changed
      const currentNode = useBrainStore.getState().nodes.get(id);
      if (!currentNode) return; // Node was deleted

      const transcription = result.text?.trim() || '';
      const description = result.description?.trim() || '';
      const finalContent = transcription && description
        ? `${transcription}\n\n${description}`
        : (transcription || description);
      const imageRef = currentNode.imageRef || getImageRef(currentNode);

      const updates: Partial<MindNode> = {
        tags: [...new Set([...currentNode.tags, ...result.tags])],
        isFlipped: true,
      };

      if (imageRef) updates.imageRef = imageRef;
      if (finalContent) {
        updates.content = finalContent;
        updates.ocrText = finalContent;
      }

      updateNode(id, updates);
    } catch {
      updateNode(id, { ocrText: 'OCR misslyckades' });
    } finally {
      setNodeAIProcessing(id, null);
    }
  }, [nodes, geminiKey, geminiOcrModel, assets, updateNode, setNodeAIProcessing, setShowSettings, setContextMenu]);

  // Run OCR on all selected image nodes
  const runOCROnSelected = useCallback(async () => {
    const selectedImages = Array.from(selectedNodeIds)
      .map(id => nodes.get(id))
      .filter((node): node is MindNode => Boolean(node))
      .filter((n: MindNode) => n.type === 'image');

    if (selectedImages.length === 0) return;

    if (!geminiKey) {
      setShowSettings(true);
      return;
    }

    setContextMenu(null);

    // Process all selected images

    if (selectedImages.length === 0) return;

    if (!geminiKey) {
      setShowSettings(true);
      return;
    }

    setContextMenu(null);

    // Process all selected images
    for (const node of selectedImages) {
      await runOCR(node.id);
    }
  }, [selectedNodeIds, nodes, geminiKey, runOCR, setShowSettings, setContextMenu]);

  // Delete selected nodes (session-aware)
  const deleteSelected = useCallback((permanent: boolean = false) => {
    const selectedNodes = Array.from(selectedNodeIds)
      .map(id => nodes.get(id))
      .filter(Boolean) as MindNode[];
    if (selectedNodes.length === 0) return;

    const activeSessionId = useBrainStore.getState().activeSessionId;

    if (permanent) {
      // Ctrl+Delete: Permanent deletion
      if (!activeSessionId) {
        // In "Alla kort": Always confirm
        if (!confirm(`Radera ${selectedNodes.length} kort PERMANENT från alla sessioner?`)) return;
      }
      // In session: No confirmation
      saveStateForUndo();
      const deleteNodesPermanently = useBrainStore.getState().deleteNodesPermanently;
      deleteNodesPermanently(Array.from(selectedNodeIds));
    } else if (activeSessionId) {
      // Delete in session: Remove from session only, no confirmation
      saveStateForUndo();
      const removeCardsFromSession = useBrainStore.getState().removeCardsFromSession;
      removeCardsFromSession(activeSessionId, Array.from(selectedNodeIds));
    } else {
      // Delete in "Alla kort": Permanent deletion, ALWAYS confirm
      if (!confirm(`Radera ${selectedNodes.length} kort PERMANENT från alla sessioner?`)) return;
      saveStateForUndo();
      const deleteNodesPermanently = useBrainStore.getState().deleteNodesPermanently;
      deleteNodesPermanently(Array.from(selectedNodeIds));
    }
  }, [selectedNodeIds, nodes, saveStateForUndo]);

  // Add tag to all selected nodes
  const addBulkTag = useCallback((tag: string) => {
    if (tag.trim()) {
      addTagToSelected(tag.trim());
    }
  }, [addTagToSelected]);

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
