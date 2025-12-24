// src/hooks/useNodeDrag.ts
// Hook för drag-logik för canvas-noder

import { useState, useCallback } from 'react';
import type Konva from 'konva';
import { useBrainStore } from '../store/useBrainStore';

interface UseNodeDragOptions {
  nodeId: string;
  nodeX: number;
  nodeY: number;
  isSelected: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

export function useNodeDrag({
  nodeId,
  nodeX,
  nodeY,
  isSelected,
  onDragStart: onDragStartCallback,
  onDragEnd: onDragEndCallback,
}: UseNodeDragOptions) {
  const updateNodePosition = useBrainStore((state) => state.updateNodePosition);
  const toggleSelection = useBrainStore((state) => state.toggleSelection);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const dragSelectedNodes = useBrainStore((state) => state.dragSelectedNodes);

  const [initialX, setInitialX] = useState(0);
  const [initialY, setInitialY] = useState(0);

  const getSelectedCount = useCallback(() => {
    return useBrainStore.getState().selectedNodeIds.size;
  }, []);

  const handleDragStart = useCallback((e: Konva.KonvaEventObject<DragEvent>, groupRef: React.RefObject<Konva.Group>) => {
    if (!isSelected) {
      clearSelection();
      toggleSelection(nodeId, false);
    }
    setInitialX(e.target.x());
    setInitialY(e.target.y());
    groupRef.current?.moveToTop();
    onDragStartCallback?.();
  }, [isSelected, clearSelection, toggleSelection, nodeId, onDragStartCallback]);

  const handleDragMove = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (getSelectedCount() > 1) {
      const currentX = e.target.x();
      const currentY = e.target.y();
      const dx = currentX - initialX;
      const dy = currentY - initialY;

      const state = useBrainStore.getState();
      state.selectedNodeIds.forEach((selectedId) => {
        if (selectedId === nodeId) return;
        const selectedNode = state.nodes.get(selectedId);
        if (!selectedNode) return;
        const stage = e.target.getStage();
        if (!stage) return;
        const otherGroup = stage.findOne(`#konva-node-${selectedNode.id}`) as Konva.Group;
        if (otherGroup) {
          otherGroup.position({ x: selectedNode.x + dx, y: selectedNode.y + dy });
        }
      });
      e.target.getLayer()?.batchDraw();
    }
  }, [getSelectedCount, initialX, initialY, nodeId]);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    const newX = e.target.x();
    const newY = e.target.y();
    const dx = newX - initialX;
    const dy = newY - initialY;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
      e.target.position({ x: nodeX, y: nodeY });
      onDragEndCallback?.();
      return;
    }

    if (getSelectedCount() > 1) {
      dragSelectedNodes(dx, dy);
      e.target.position({ x: nodeX + dx, y: nodeY + dy });
    } else {
      updateNodePosition(nodeId, newX, newY);
    }
    onDragEndCallback?.();
  }, [initialX, initialY, nodeX, nodeY, nodeId, getSelectedCount, dragSelectedNodes, updateNodePosition, onDragEndCallback]);

  return {
    handleDragStart,
    handleDragMove,
    handleDragEnd,
  };
}
