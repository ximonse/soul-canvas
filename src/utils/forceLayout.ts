// src/utils/forceLayout.ts
// Force-directed graph layout med d3-force

import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  type SimulationNodeDatum,
  type SimulationLinkDatum,
} from 'd3-force';
import type { MindNode, Synapse } from '../types/types';

interface ForceNode extends SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned?: boolean;
}

interface ForceLink extends SimulationLinkDatum<ForceNode> {
  source: string | ForceNode;
  target: string | ForceNode;
  strength?: number;
}

/**
 * Beräkna nya positioner för noder baserat på deras kopplingar
 * Returnerar en Map med nodeId -> { x, y }
 */
export function calculateForceLayout(
  nodes: MindNode[],
  synapses: Synapse[],
  options: {
    centerX?: number;
    centerY?: number;
    iterations?: number;
    gravity?: number; // 0.1 - 3.0, default 1.0
  } = {}
): Map<string, { x: number; y: number }> {
  const {
    centerX = 0,
    centerY = 0,
    iterations = 300,
    gravity = 1.0,
  } = options;

  // Skapa noder för simulering
  const forceNodes: ForceNode[] = nodes.map(node => ({
    id: node.id,
    x: node.x,
    y: node.y,
    width: node.width || 200,
    height: node.height || 100,
    pinned: node.pinned,
  }));

  // Skapa länkar
  const forceLinks: ForceLink[] = synapses
    .filter(s => {
      // Filtrera bort länkar där noder saknas
      const hasSource = nodes.some(n => n.id === s.sourceId);
      const hasTarget = nodes.some(n => n.id === s.targetId);
      return hasSource && hasTarget;
    })
    .map(s => ({
      source: s.sourceId,
      target: s.targetId,
      strength: s.similarity || 0.5,
    }));

  // Om inga länkar, returnera tomma positioner
  if (forceLinks.length === 0) {
    return new Map();
  }

  // Gravity påverkar både länk-avstånd och avstötning
  // Högre gravity = kortare avstånd, starkare länk-drag = tätare kluster
  // Gravity 0.1 = väldigt utspritt, Gravity 3.0 = väldigt tätt
  const linkDistance = 200 / gravity; // Lägre gravity = längre avstånd
  const linkStrengthMultiplier = gravity; // Högre gravity = starkare länkar
  const chargeStrength = -300 * (1 / gravity); // Lägre gravity = starkare avstötning

  // Skapa simulering
  const simulation = forceSimulation<ForceNode>(forceNodes)
    // Länk-kraft: drar ihop kopplade noder
    .force('link', forceLink<ForceNode, ForceLink>(forceLinks)
      .id(d => d.id)
      .distance(linkDistance)
      .strength(link => ((link as ForceLink).strength || 0.5) * linkStrengthMultiplier)
    )
    // Avstötning: stöter bort noder från varandra
    .force('charge', forceManyBody<ForceNode>()
      .strength(chargeStrength)
      .distanceMax(800)
    )
    // Centrera grafen
    .force('center', forceCenter(centerX, centerY))
    // Kollision: förhindra överlapp baserat på kortstorlek
    .force('collide', forceCollide<ForceNode>()
      .radius(d => Math.max(d.width, d.height) / 2 + 10)
      .strength(0.8)
    )
    .stop(); // Stoppa automatisk körning

  // Kör simulering manuellt för bättre kontroll
  for (let i = 0; i < iterations; i++) {
    simulation.tick();

    // Lås pinnade noder
    forceNodes.forEach(node => {
      if (node.pinned) {
        const original = nodes.find(n => n.id === node.id);
        if (original) {
          node.x = original.x;
          node.y = original.y;
        }
      }
    });
  }

  // Skapa resultat
  const positions = new Map<string, { x: number; y: number }>();
  forceNodes.forEach(node => {
    if (!node.pinned && node.x !== undefined && node.y !== undefined) {
      positions.set(node.id, { x: node.x, y: node.y });
    }
  });

  return positions;
}

/**
 * Beräkna layout endast för noder som har kopplingar
 */
export function calculateConnectedNodesLayout(
  allNodes: MindNode[],
  synapses: Synapse[],
  options: {
    centerX?: number;
    centerY?: number;
    iterations?: number;
    gravity?: number;
  } = {}
): Map<string, { x: number; y: number }> {
  // Hitta noder som har minst en koppling
  const connectedNodeIds = new Set<string>();
  synapses.forEach(s => {
    connectedNodeIds.add(s.sourceId);
    connectedNodeIds.add(s.targetId);
  });

  const connectedNodes = allNodes.filter(n => connectedNodeIds.has(n.id));

  if (connectedNodes.length === 0) {
    return new Map();
  }

  return calculateForceLayout(connectedNodes, synapses, options);
}
