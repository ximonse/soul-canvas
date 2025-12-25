// src/components/KonvaCanvas.tsx
import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { Stage, Layer, Rect, Line, FastLayer } from 'react-konva';
import type Konva from 'konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { useBrainStore } from '../store/useBrainStore';
import type { CanvasAPI } from '../hooks/useCanvas';
import { useViewportCulling } from '../hooks/useViewportCulling';
import KonvaNode from './KonvaNode';
import { SynapseLines, SequenceArrows } from './canvas';
import { THEMES } from '../themes';
import { GRAVITY, VIEWPORT, ZOOM } from '../utils/constants';
import type { MindNode, GravitatingNode, GravitatingColorMode, Trail } from '../types/types';
import { getGravitatingColor, getSemanticThemeColor } from '../utils/nodeStyles';

interface KonvaCanvasProps {
  currentThemeKey: string;
  onEditCard: (cardId: string) => void;
  canvas: CanvasAPI;
  stageRef?: React.RefObject<Konva.Stage | null>;
  nodes: MindNode[];
  isWandering?: boolean;
  onWanderStep?: (nodeId: string) => void;
  gravitatingNodes?: GravitatingNode[];
  gravitatingColorMode?: GravitatingColorMode;
  wanderingCurrentNodeId?: string | null;
  activeTrail?: Trail | null;
  selectedTrails?: Trail[];
  showActiveTrailLine?: boolean;
  onContextMenu?: (nodeId: string, screenPos: { x: number; y: number }) => void;
  onZoomChange?: (zoom: number) => void;
}

const toWorldPosition = (stage: Konva.Stage, pointer: { x: number; y: number }) => {
  const scale = stage.scaleX();
  return {
    x: (pointer.x - stage.x()) / scale,
    y: (pointer.y - stage.y()) / scale,
  };
};
const GRAVITY_SCROLL_SCALE = 0.003;
const GRAVITY_SCROLL_MAX_STEP = 0.6;
const VIEW_COMMIT_DELAY_MS = 80;
const WHEEL_DELTA_CLAMP = 120;
const WHEEL_ZOOM_SENSITIVITY = 0.0015;
const WHEEL_ZOOM_DAMPING = 0.28;
const WHEEL_PAN_DAMPING = 0.35;

const KonvaCanvas: React.FC<KonvaCanvasProps> = ({
  currentThemeKey,
  onEditCard,
  canvas,
  stageRef: externalStageRef,
  nodes,
  isWandering = false,
  onWanderStep,
  gravitatingNodes = [],
  gravitatingColorMode = 'similarity',
  wanderingCurrentNodeId,
  activeTrail,
  selectedTrails = [],
  showActiveTrailLine = true,
  onContextMenu,
  onZoomChange,
}) => {
  const nodesMap = useBrainStore((state) => state.nodes);
  const addNode = useBrainStore((state) => state.addNode);
  const clearSelection = useBrainStore((state) => state.clearSelection);
  const selectNodes = useBrainStore((state) => state.selectNodes);
  const showSynapseLines = useBrainStore((state) => state.showSynapseLines);
  const synapses = useBrainStore((state) => state.synapses);
  const synapseVisibilityThreshold = useBrainStore((state) => state.synapseVisibilityThreshold);
  const sequences = useBrainStore((state) => state.sequences);
  const activeSequence = useBrainStore((state) => state.activeSequence);
  const internalStageRef = useRef<Konva.Stage>(null);
  const stageRef = externalStageRef || internalStageRef;
  const [stageDimensions, setStageDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });
  const [isDraggingNode, setIsDraggingNode] = useState(false);
  const handleNodeDragStart = useCallback(() => setIsDraggingNode(true), [setIsDraggingNode]);
  const handleNodeDragEnd = useCallback(() => setIsDraggingNode(false), [setIsDraggingNode]);

  // Selection rectangle state
  const [selectionRect, setSelectionRect] = useState<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    visible: boolean;
  } | null>(null);
  const viewCommitTimeoutRef = useRef<number | null>(null);
  const pendingViewRef = useRef<{ x: number; y: number; k: number } | null>(null);
  const cursorRafRef = useRef<number | null>(null);
  const pendingCursorRef = useRef<{ x: number; y: number } | null>(null);
  const lastZoomRef = useRef(canvas.view.k);
  const wheelRafRef = useRef<number | null>(null);
  const wheelZoomDeltaRef = useRef(0);
  const wheelPanDeltaRef = useRef(0);
  const wheelPointerRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    lastZoomRef.current = canvas.view.k;
  }, [canvas.view.k]);

  useEffect(() => {
    return () => {
      if (viewCommitTimeoutRef.current) {
        window.clearTimeout(viewCommitTimeoutRef.current);
        viewCommitTimeoutRef.current = null;
      }
      if (cursorRafRef.current) {
        window.cancelAnimationFrame(cursorRafRef.current);
        cursorRafRef.current = null;
      }
      if (wheelRafRef.current) {
        window.cancelAnimationFrame(wheelRafRef.current);
        wheelRafRef.current = null;
      }
    };
  }, []);

  const scheduleViewCommit = useCallback((nextView: { x: number; y: number; k: number }) => {
    pendingViewRef.current = nextView;
    if (viewCommitTimeoutRef.current) {
      window.clearTimeout(viewCommitTimeoutRef.current);
    }
    viewCommitTimeoutRef.current = window.setTimeout(() => {
      viewCommitTimeoutRef.current = null;
      const view = pendingViewRef.current;
      if (!view) return;
      pendingViewRef.current = null;
      canvas.setView(view);
      if (view.k !== lastZoomRef.current) {
        lastZoomRef.current = view.k;
        onZoomChange?.(view.k);
      }
    }, VIEW_COMMIT_DELAY_MS);
  }, [canvas, onZoomChange]);

  const startWheelLoop = useCallback(() => {
    if (wheelRafRef.current !== null) return;
    const tick = () => {
      const stage = stageRef.current;
      if (!stage) {
        wheelRafRef.current = null;
        return;
      }

      let didUpdate = false;

      if (Math.abs(wheelPanDeltaRef.current) > 0.1) {
        const delta = Math.max(-WHEEL_DELTA_CLAMP, Math.min(WHEEL_DELTA_CLAMP, wheelPanDeltaRef.current));
        const apply = delta * WHEEL_PAN_DAMPING;
        wheelPanDeltaRef.current -= apply;
        stage.position({ x: stage.x(), y: stage.y() - apply });
        didUpdate = true;
      }

      if (Math.abs(wheelZoomDeltaRef.current) > 0.1 && wheelPointerRef.current) {
        const delta = Math.max(-WHEEL_DELTA_CLAMP, Math.min(WHEEL_DELTA_CLAMP, wheelZoomDeltaRef.current));
        const apply = delta * WHEEL_ZOOM_DAMPING;
        wheelZoomDeltaRef.current -= apply;

        const pointer = wheelPointerRef.current;
        const mousePointTo = toWorldPosition(stage, pointer);
        const scaleBy = Math.exp(-apply * WHEEL_ZOOM_SENSITIVITY);
        const newScale = stage.scaleX() * scaleBy;
        const clampedScale = Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, newScale));

        const newPos = {
          x: pointer.x - mousePointTo.x * clampedScale,
          y: pointer.y - mousePointTo.y * clampedScale,
        };

        stage.scale({ x: clampedScale, y: clampedScale });
        stage.position(newPos);
        didUpdate = true;
      }

      if (didUpdate) {
        stage.batchDraw();
        scheduleViewCommit({ x: stage.x(), y: stage.y(), k: stage.scaleX() });
        wheelRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      wheelRafRef.current = null;
    };

    wheelRafRef.current = window.requestAnimationFrame(tick);
  }, [scheduleViewCommit]);

  const scheduleCursorPos = useCallback((nextPos: { x: number; y: number }) => {
    pendingCursorRef.current = nextPos;
    if (cursorRafRef.current !== null) return;
    cursorRafRef.current = window.requestAnimationFrame(() => {
      cursorRafRef.current = null;
      const pos = pendingCursorRef.current;
      if (!pos) return;
      pendingCursorRef.current = null;
      canvas.setCursorPos(pos);
    });
  }, [canvas]);

  const adjustGraphGravity = useCallback((delta: number) => {
    const state = useBrainStore.getState();
    const newGravity = Math.max(GRAVITY.MIN, Math.min(GRAVITY.MAX, state.graphGravity + delta));
    state.setGraphGravity(newGravity);

    const allNodes = Array.from(state.nodes.values()) as MindNode[];
    const selectedNodes = Array.from(state.selectedNodeIds)
      .map(id => state.nodes.get(id))
      .filter(Boolean) as MindNode[];

    const visibleSynapses = state.synapses.filter((s) =>
      (s.similarity || 1) >= state.synapseVisibilityThreshold
    );

    const hasSelection = selectedNodes.length > 0;
    const selectedIds = new Set(selectedNodes.map((n) => n.id));
    const relevantSynapses = hasSelection
      ? visibleSynapses.filter((s) => selectedIds.has(s.sourceId) || selectedIds.has(s.targetId))
      : visibleSynapses;

    const nodesToLayout: MindNode[] = hasSelection
      ? allNodes.filter((n) => {
          if (selectedIds.has(n.id)) return true;
          return relevantSynapses.some((s) =>
            (s.sourceId === n.id && selectedIds.has(s.targetId)) ||
            (s.targetId === n.id && selectedIds.has(s.sourceId))
          );
        })
      : allNodes;

    if (relevantSynapses.length === 0 || nodesToLayout.length === 0) return;

    import('../utils/forceLayout').then(({ calculateConnectedNodesLayout }) => {
      const connectedIds = new Set<string>();
      relevantSynapses.forEach((s) => {
        connectedIds.add(s.sourceId);
        connectedIds.add(s.targetId);
      });
      const connectedNodes = nodesToLayout.filter((n) => connectedIds.has(n.id));
      if (connectedNodes.length === 0) return;

      const cx = connectedNodes.reduce((sum, n) => sum + n.x, 0) / connectedNodes.length;
      const cy = connectedNodes.reduce((sum, n) => sum + n.y, 0) / connectedNodes.length;

      const positions = calculateConnectedNodesLayout(
        nodesToLayout,
        relevantSynapses,
        { centerX: cx, centerY: cy, iterations: 120, gravity: newGravity }
      );
      if (positions.size > 0) {
        state.updateNodePositions(positions);
      }
    });
  }, []);

  // Keep stage transform in sync with canvas view
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (
      stage.x() === canvas.view.x &&
      stage.y() === canvas.view.y &&
      stage.scaleX() === canvas.view.k &&
      stage.scaleY() === canvas.view.k
    ) {
      return;
    }
    stage.position({ x: canvas.view.x, y: canvas.view.y });
    stage.scale({ x: canvas.view.k, y: canvas.view.k });
  }, [canvas.view.x, canvas.view.y, canvas.view.k, stageRef]);

  const theme = THEMES[currentThemeKey];
  const filteredNodesMap = useMemo(() => {
    const map = new Map<string, MindNode>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  // Map för snabb uppslag av gravitating info per nodeId
  const gravitatingMap = useMemo(() => {
    const map = new Map<string, { similarity: number; semanticTheme?: string }>();
    gravitatingNodes.forEach((g) => map.set(g.nodeId, {
      similarity: g.similarity,
      semanticTheme: g.semanticTheme
    }));
    return map;
  }, [gravitatingNodes]);

  // Viewport culling for performance with many cards
  const { visibleNodes } = useViewportCulling({
    nodes,
    view: canvas.view,
    enabled: nodes.length > VIEWPORT.CULLING_THRESHOLD,
  });
  const visibleNodeIds = useMemo(() => (
    [...visibleNodes]
      .sort((a, b) => a.y - b.y)
      .map((node) => node.id)
  ), [visibleNodes]);
  const visibleNodeIdSet = useMemo(
    () => new Set(visibleNodeIds),
    [visibleNodeIds]
  );

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

  const handleStageWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    if (e.evt.ctrlKey) {
      const rawDelta = -e.evt.deltaY * GRAVITY_SCROLL_SCALE;
      const delta = Math.max(-GRAVITY_SCROLL_MAX_STEP, Math.min(GRAVITY_SCROLL_MAX_STEP, rawDelta));
      adjustGraphGravity(delta);
      return;
    }
    if (e.evt.altKey || e.evt.metaKey) {
      wheelPanDeltaRef.current += e.evt.deltaY;
      startWheelLoop();
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    wheelPointerRef.current = pointer;
    wheelZoomDeltaRef.current += e.evt.deltaY;
    startWheelLoop();
  };

  const handleStageDblClick = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const worldPos = toWorldPosition(stage, pointer);

      addNode('', worldPos.x, worldPos.y, 'text');
    }
  };

  // Drag-select handlers
  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage()) return;

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldPos = toWorldPosition(stage, pointer);

    if (!e.evt.ctrlKey && !e.evt.metaKey) {
      clearSelection();
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

    const worldPos = toWorldPosition(stage, pointer);
    scheduleCursorPos(worldPos);

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

    const allNodes = Array.from(nodesMap.values()) as MindNode[];
    const idsToSelect = allNodes
      .filter((node: MindNode) => node.x >= x1 && node.x <= x2 && node.y >= y1 && node.y <= y2)
      .map((node: MindNode) => node.id);

    if (idsToSelect.length > 0) {
      selectNodes(idsToSelect);
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
      {/* Synapse lines */}
      {showSynapseLines && (
        <FastLayer listening={false}>
          <SynapseLines
            synapses={synapses}
            nodes={filteredNodesMap}
            visibleNodeIds={visibleNodeIdSet}
            visibilityThreshold={synapseVisibilityThreshold}
            scale={canvas.view.k}
          />
        </FastLayer>
      )}

      <Layer>
        {/* Gravitating lines - från current wandering node till gravitating nodes */}
        {wanderingCurrentNodeId && gravitatingNodes.length > 0 && (() => {
          const currentNode = filteredNodesMap.get(wanderingCurrentNodeId);
          if (!currentNode) return null;

          const currentX = currentNode.x + (currentNode.width || 200) / 2;
          const currentY = currentNode.y + (currentNode.height || 100) / 2;

          return gravitatingNodes.map((gn) => {
            const targetNode = filteredNodesMap.get(gn.nodeId);
            if (!targetNode) return null;

            const targetX = targetNode.x + (targetNode.width || 200) / 2;
            const targetY = targetNode.y + (targetNode.height || 100) / 2;

            const lineColor = gravitatingColorMode === 'semantic'
              ? getSemanticThemeColor(gn.semanticTheme)
              : getGravitatingColor(gn.similarity);

            return (
              <Line
                key={`grav-${gn.nodeId}`}
                points={[currentX, currentY, targetX, targetY]}
                stroke={lineColor}
                strokeWidth={4 / canvas.view.k}
                opacity={0.7 + gn.similarity * 0.3}
                lineCap="round"
                shadowColor={lineColor}
                shadowBlur={8}
                shadowOpacity={0.5}
              />
            );
          });
        })()}

        {/* Trail lines - stig genom besökta kort */}
        {(() => {
          // Samla alla trails att rita (aktiv + valda)
          const trailsToDraw: { trail: Trail; color: string; isActive: boolean }[] = [];

          if (showActiveTrailLine && activeTrail && activeTrail.waypoints.length > 1) {
            trailsToDraw.push({ trail: activeTrail, color: '#f59e0b', isActive: true }); // Orange för aktiv
          }

          // Valda trails (olika färger)
          const trailColors = ['#8b5cf6', '#ec4899', '#06b6d4', '#10b981', '#f97316'];
          selectedTrails.forEach((trail, idx) => {
            if (trail.waypoints.length > 1 && trail.id !== activeTrail?.id) {
              trailsToDraw.push({ trail, color: trailColors[idx % trailColors.length], isActive: false });
            }
          });

          return trailsToDraw.flatMap(({ trail, color, isActive }) => {
            const lines: React.ReactNode[] = [];

            for (let i = 0; i < trail.waypoints.length - 1; i++) {
              const fromNode = filteredNodesMap.get(trail.waypoints[i].nodeId);
              const toNode = filteredNodesMap.get(trail.waypoints[i + 1].nodeId);
              if (!fromNode || !toNode) continue;

              const fromX = fromNode.x + (fromNode.width || 200) / 2;
              const fromY = fromNode.y + (fromNode.height || 100) / 2;
              const toX = toNode.x + (toNode.width || 200) / 2;
              const toY = toNode.y + (toNode.height || 100) / 2;

              lines.push(
                <Line
                  key={`trail-${trail.id}-${i}`}
                  points={[fromX, fromY, toX, toY]}
                  stroke={color}
                  strokeWidth={(isActive ? 8 : 6) / canvas.view.k}
                  opacity={isActive ? 0.95 : 0.85}
                  lineCap="round"
                  lineJoin="round"
                  shadowColor={color}
                  shadowBlur={isActive ? 14 : 10}
                  shadowOpacity={0.6}
                />
              );
            }
            return lines;
          });
        })()}

        {/* Visible nodes sorted by Y position */}
        {visibleNodeIds.map((nodeId: string) => {
          const gravitatingInfo = gravitatingMap.get(nodeId);
          return (
            <KonvaNode
              key={nodeId}
              nodeId={nodeId}
              theme={theme}
              isWandering={isWandering}
              onWanderStep={onWanderStep}
              gravitatingSimilarity={gravitatingInfo?.similarity}
              gravitatingSemanticTheme={gravitatingInfo?.semanticTheme}
              gravitatingColorMode={gravitatingColorMode}
              onEditCard={onEditCard}
              onDragStart={handleNodeDragStart}
              onDragEnd={handleNodeDragEnd}
              onContextMenu={onContextMenu}
            />
          );
        })}

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
          sequences={sequences}
          activeSequence={activeSequence}
          nodes={filteredNodesMap}
          scale={canvas.view.k}
        />
      </Layer>
    </Stage>
  );
};

export default KonvaCanvas;
