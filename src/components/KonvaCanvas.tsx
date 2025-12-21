// src/components/KonvaCanvas.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import type Konva from 'konva';
import { useBrainStore } from '../store/useBrainStore';
import { gComboState } from '../hooks/useKeyboard';
import type { CanvasAPI } from '../hooks/useCanvas';
import { useViewportCulling } from '../hooks/useViewportCulling';
import KonvaNode from './KonvaNode';
import { SynapseLines, SequenceArrows } from './canvas';
import { THEMES } from '../themes';
import { ZOOM } from '../utils/constants';
import type { MindNode } from '../types/types';

interface KonvaCanvasProps {
  currentThemeKey: string;
  onEditCard: (cardId: string) => void;
  canvas: CanvasAPI;
  stageRef?: React.RefObject<Konva.Stage | null>;
  nodes: MindNode[];
  onContextMenu?: (nodeId: string, screenPos: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
}

const KonvaCanvas: React.FC<KonvaCanvasProps> = ({
  currentThemeKey,
  onEditCard,
  canvas,
  stageRef: externalStageRef,
  nodes,
  onContextMenu,
  onZoomChange,
}) => {
  const store = useBrainStore();
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;
  const [stageDimensions, setStageDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [isDraggingNode, setIsDraggingNode] = useState(false);

  // Selection rectangle state
  const [selectionRect, setSelectionRect] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    visible: boolean;
  } | null>(null);

  // Initialize stage position once on mount
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.position({ x: canvas.view.x, y: canvas.view.y });
      stageRef.current.scale({ x: canvas.view.k, y: canvas.view.k });
    }
  }, []); // Only run once on mount

  const theme = THEMES[currentThemeKey];
  const filteredNodesMap = useMemo(() => {
    const map = new Map<string, MindNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Viewport culling for performance with many cards
  const { visibleNodes } = useViewportCulling({
    nodes,
    view: canvas.view,
    enabled: nodes.length > 50,
  });

  useEffect(() => {
    const handleResize = () => {
      setStageDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update canvas.view when stage drag ends (for screenToWorld calculations)
  const handleStageDragEnd = () => {
    const stage = stageRef.current;
    if (!stage) return;

    canvas.setView({
      x: stage.x(),
      y: stage.y(),
      k: stage.scaleX(),
    });
  };

  const handleStageWheel = (e: any) => {
    // Om G är nedtryckt, låt useKeyboard hantera gravity-justering
    if (gComboState.pressed) {
      return;
    }

    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * 1.1 : oldScale / 1.1;
    const clampedScale = Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    stage.scale({ x: clampedScale, y: clampedScale });
    stage.position(newPos);
    stage.batchDraw();

    canvas.setView({ x: newPos.x, y: newPos.y, k: clampedScale });
    onZoomChange?.(clampedScale);
  };

  const handleStageDblClick = (e: any) => {
    if (e.target === e.target.getStage()) {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const scale = stage.scaleX();
      const worldPos = {
        x: (pointer.x - stage.x()) / scale,
        y: (pointer.y - stage.y()) / scale,
      };

      store.addNode('', worldPos.x, worldPos.y, 'text');
    }
  };

  // Drag-select handlers
  const handleStageMouseDown = (e: any) => {
    if (e.target !== e.target.getStage()) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scale = stage.scaleX();
    const worldPos = {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale,
    };

    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      store.clearSelection();
    }

    if (e.evt.ctrlKey || e.evt.metaKey) {
      setSelectionRect({
        x1: worldPos.x,
        y1: worldPos.y,
        x2: worldPos.x,
        y2: worldPos.y,
        visible: true,
      });
    }
  };

  const handleStageMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scale = stage.scaleX();
    const worldPos = {
      x: (pointer.x - stage.x()) / scale,
      y: (pointer.y - stage.y()) / scale,
    };
    canvas.setCursorPos(worldPos);

    if (!selectionRect || !selectionRect.visible) return;

    setSelectionRect({
      ...selectionRect,
      x2: worldPos.x,
      y2: worldPos.y,
    });
  };

  const handleStageMouseUp = () => {
    if (!selectionRect || !selectionRect.visible) return;

    const x1 = Math.min(selectionRect.x1, selectionRect.x2);
    const y1 = Math.min(selectionRect.y1, selectionRect.y2);
    const x2 = Math.max(selectionRect.x1, selectionRect.x2);
    const y2 = Math.max(selectionRect.y1, selectionRect.y2);

    const allNodes = Array.from(store.nodes.values());
    const idsToSelect = allNodes
      .filter((node) => node.x >= x1 && node.x <= x2 && node.y >= y1 && node.y <= y2)
      .map((node) => node.id);

    if (idsToSelect.length > 0) {
      store.selectNodes(idsToSelect);
    }

    setSelectionRect(null);
  };

  return (
    <Stage
      ref={stageRef}
      width={stageDimensions.width}
      height={stageDimensions.height}
      draggable={!isDraggingNode && !selectionRect?.visible}
      onDragEnd={handleStageDragEnd}
      onWheel={handleStageWheel}
      onDblClick={handleStageDblClick}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      style={{ backgroundColor: theme.canvasColor }}
    >
      <Layer>
        {/* Synapse lines */}
        {store.showSynapseLines && (
          <SynapseLines
            synapses={store.synapses}
            nodes={filteredNodesMap}
            visibilityThreshold={store.synapseVisibilityThreshold}
            scale={canvas.view.k}
          />
        )}

        {/* Visible nodes sorted by Y position */}
        {[...visibleNodes].sort((a, b) => a.y - b.y).map((node: MindNode) => (
          <KonvaNode
            key={node.id}
            node={node}
            theme={theme}
            onEditCard={onEditCard}
            onDragStart={() => setIsDraggingNode(true)}
            onDragEnd={() => setIsDraggingNode(false)}
            onContextMenu={onContextMenu}
          />
        ))}

        {/* Selection rectangle */}
        {selectionRect && selectionRect.visible && (
          <Rect
            x={Math.min(selectionRect.x1, selectionRect.x2)}
            y={Math.min(selectionRect.y1, selectionRect.y2)}
            width={Math.abs(selectionRect.x2 - selectionRect.x1)}
            height={Math.abs(selectionRect.y2 - selectionRect.y1)}
            fill="rgba(99, 102, 241, 0.1)"
            stroke="rgba(99, 102, 241, 0.5)"
            strokeWidth={2 / canvas.view.k}
            dash={[10 / canvas.view.k, 5 / canvas.view.k]}
          />
        )}

        {/* Sequence arrows */}
        <SequenceArrows
          sequences={store.sequences}
          activeSequence={store.activeSequence}
          nodes={filteredNodesMap}
          scale={canvas.view.k}
        />
      </Layer>
    </Stage>
  );
};

export default KonvaCanvas;
