// store/slices/trailSlice.ts
// Hanterar trails (stigar) och wandering (vandring) genom semantiskt utrymme

import type { Trail, TrailWaypoint, WanderingState, GravitatingNode, GravitatingColorMode } from '../../types/types';

export interface TrailState {
  trails: Trail[];
  activeTrailId: string | null;
  selectedTrailIds: string[];  // Multi-select av stigar för jämförelse
  showActiveTrailLine: boolean;
  wandering: WanderingState;
  connectionCountFilter: number;  // Visa kort med >= X% kopplingar (0-100)
}

export interface TrailActions {
  // Wandering actions
  startWandering: (nodeId: string) => void;
  stopWandering: () => void;
  setGravitatingNodes: (nodes: GravitatingNode[]) => void;
  setWanderingThreshold: (threshold: number) => void;
  toggleSurfaceDifferenceMode: () => void;
  toggleGravitatingColorMode: () => void;
  setGravitatingColorMode: (mode: GravitatingColorMode) => void;

  // Trail actions
  createTrail: (name: string, startNodeId: string) => string;
  addWaypointToTrail: (trailId: string, nodeId: string, similarity?: number, theme?: string) => void;
  branchTrail: (trailId: string, branchPointIndex: number, newName: string) => string;
  switchToTrail: (trailId: string) => void;
  deleteTrail: (trailId: string) => void;
  renameTrail: (trailId: string, newName: string) => void;
  backtrackTrail: (steps?: number) => void;
  forwardTrail: (steps?: number) => void;
  removeWaypointFromTrail: (trailId: string, waypointIndex: number) => void;
  moveWaypointInTrail: (trailId: string, fromIndex: number, toIndex: number) => void;

  // Trail selection (för multi-stig visning)
  toggleTrailSelection: (trailId: string) => void;
  clearTrailSelection: () => void;
  setSelectedTrailIds: (trailIds: string[]) => void;
  setShowActiveTrailLine: (show: boolean) => void;
  getTrailNodeIds: (trailId: string) => string[];

  // Filter actions
  setConnectionCountFilter: (percentage: number) => void;

  // Load/save
  loadTrails: (trails: Trail[]) => void;
}

type SetState = (fn: (state: TrailState) => Partial<TrailState>) => void;
type GetState = () => TrailState & { wandering: WanderingState };

export const initialTrailState: TrailState = {
  trails: [],
  activeTrailId: null,
  selectedTrailIds: [],
  showActiveTrailLine: true,
  wandering: {
    isActive: false,
    currentNodeId: null,
    gravitatingNodes: [],
    minSimilarityThreshold: 0.3,
    showOnlyDifferentWords: false,
    colorMode: 'similarity',
  },
  connectionCountFilter: 0,
};

export const createTrailSlice = (set: SetState, get: GetState): TrailActions => ({
  // ============================================
  // WANDERING ACTIONS
  // ============================================

  startWandering: (nodeId: string) => set((state) => ({
    wandering: {
      ...state.wandering,
      isActive: true,
      currentNodeId: nodeId,
      gravitatingNodes: [], // Will be populated by useWandering hook
    },
    pendingSave: true,
  })),

  stopWandering: () => set((state) => ({
    wandering: {
      ...state.wandering,
      isActive: false,
      currentNodeId: null,
      gravitatingNodes: [],
    },
  })),

  setGravitatingNodes: (nodes: GravitatingNode[]) => set((state) => ({
    wandering: {
      ...state.wandering,
      gravitatingNodes: nodes,
    },
  })),

  setWanderingThreshold: (threshold: number) => set((state) => ({
    wandering: {
      ...state.wandering,
      minSimilarityThreshold: Math.max(0, Math.min(1, threshold)),
    },
  })),

  toggleSurfaceDifferenceMode: () => set((state) => ({
    wandering: {
      ...state.wandering,
      showOnlyDifferentWords: !state.wandering.showOnlyDifferentWords,
    },
  })),

  toggleGravitatingColorMode: () => set((state) => ({
    wandering: {
      ...state.wandering,
      colorMode: state.wandering.colorMode === 'similarity' ? 'semantic' : 'similarity',
    },
  })),

  setGravitatingColorMode: (mode: GravitatingColorMode) => set((state) => ({
    wandering: {
      ...state.wandering,
      colorMode: mode,
    },
  })),

  // ============================================
  // TRAIL ACTIONS
  // ============================================

  createTrail: (name: string, startNodeId: string) => {
    const trailId = crypto.randomUUID();
    const now = new Date().toISOString();

    const newTrail: Trail = {
      id: trailId,
      name,
      waypoints: [{
        nodeId: startNodeId,
        arrivedAt: now,
      }],
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    set((state) => ({
      trails: [...state.trails.map(t => ({ ...t, isActive: false })), newTrail],
      activeTrailId: trailId,
      pendingSave: true,
    }));

    return trailId;
  },

  addWaypointToTrail: (trailId: string, nodeId: string, similarity?: number, theme?: string) => set((state) => {
    const trailIndex = state.trails.findIndex(t => t.id === trailId);
    if (trailIndex === -1) return {};

    const trail = state.trails[trailIndex];

    // Undvik duplicat av senaste waypoint
    if (trail.waypoints.length > 0 && trail.waypoints[trail.waypoints.length - 1].nodeId === nodeId) {
      return {};
    }

    const newWaypoint: TrailWaypoint = {
      nodeId,
      arrivedAt: new Date().toISOString(),
      similarity,
      semanticTheme: theme,
    };

    const updatedTrails = [...state.trails];
    updatedTrails[trailIndex] = {
      ...trail,
      waypoints: [...trail.waypoints, newWaypoint],
      updatedAt: new Date().toISOString(),
    };

    return { trails: updatedTrails, pendingSave: true };
  }),

  branchTrail: (trailId: string, branchPointIndex: number, newName: string) => {
    const state = get();
    const parentTrail = state.trails.find(t => t.id === trailId);
    if (!parentTrail) return '';

    const newTrailId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Kopiera waypoints fram till branch point
    const branchedWaypoints = parentTrail.waypoints.slice(0, branchPointIndex + 1);

    const newTrail: Trail = {
      id: newTrailId,
      name: newName,
      waypoints: branchedWaypoints,
      parentTrailId: trailId,
      branchPointIndex,
      createdAt: now,
      updatedAt: now,
      isActive: true,
    };

    set((state) => ({
      trails: [...state.trails.map(t => ({ ...t, isActive: false })), newTrail],
      activeTrailId: newTrailId,
      pendingSave: true,
    }));

    return newTrailId;
  },

  switchToTrail: (trailId: string) => set((state) => ({
    trails: state.trails.map(t => ({ ...t, isActive: t.id === trailId })),
    activeTrailId: trailId,
    pendingSave: true,
  })),

  deleteTrail: (trailId: string) => set((state) => {
    const newTrails = state.trails.filter(t => t.id !== trailId);
    return {
      trails: newTrails,
      activeTrailId: state.activeTrailId === trailId ? null : state.activeTrailId,
      selectedTrailIds: state.selectedTrailIds.filter(id => id !== trailId),
      pendingSave: true,
    };
  }),

  renameTrail: (trailId: string, newName: string) => set((state) => ({
    trails: state.trails.map(t =>
      t.id === trailId ? { ...t, name: newName, updatedAt: new Date().toISOString() } : t
    ),
    pendingSave: true,
  })),

  backtrackTrail: (steps = 1) => set((state) => {
    if (!state.activeTrailId) return {};

    const trailIndex = state.trails.findIndex(t => t.id === state.activeTrailId);
    if (trailIndex === -1) return {};

    const trail = state.trails[trailIndex];
    if (trail.waypoints.length <= 1) return {}; // Kan inte backa förbi start

    const newWaypoints = trail.waypoints.slice(0, -steps);
    if (newWaypoints.length === 0) return {}; // Behåll minst startpunkten

    const updatedTrails = [...state.trails];
    updatedTrails[trailIndex] = {
      ...trail,
      waypoints: newWaypoints,
      updatedAt: new Date().toISOString(),
    };

    // Uppdatera wandering position
    const lastWaypoint = newWaypoints[newWaypoints.length - 1];

    return {
      trails: updatedTrails,
      wandering: {
        ...state.wandering,
        currentNodeId: lastWaypoint.nodeId,
      },
      pendingSave: true,
    };
  }),

  forwardTrail: () => {
    // Forward kräver att vi sparar "framtida" waypoints vid backtrack
    // Implementeras senare vid behov
    return {};
  },

  removeWaypointFromTrail: (trailId: string, waypointIndex: number) => set((state) => {
    const trailIndex = state.trails.findIndex(t => t.id === trailId);
    if (trailIndex === -1) return {};

    const trail = state.trails[trailIndex];
    if (trail.waypoints.length <= 1) return {};
    if (waypointIndex < 0 || waypointIndex >= trail.waypoints.length) return {};

    const newWaypoints = trail.waypoints.filter((_, idx) => idx !== waypointIndex);
    if (newWaypoints.length === 0) return {};

    const updatedTrails = [...state.trails];
    updatedTrails[trailIndex] = {
      ...trail,
      waypoints: newWaypoints,
      updatedAt: new Date().toISOString(),
    };

    const removedNodeId = trail.waypoints[waypointIndex]?.nodeId;
    const shouldUpdateCurrent = state.activeTrailId === trailId && state.wandering.currentNodeId === removedNodeId;

    return {
      trails: updatedTrails,
      wandering: shouldUpdateCurrent
        ? { ...state.wandering, currentNodeId: newWaypoints[newWaypoints.length - 1].nodeId }
        : state.wandering,
      pendingSave: true,
    };
  }),

  moveWaypointInTrail: (trailId: string, fromIndex: number, toIndex: number) => set((state) => {
    const trailIndex = state.trails.findIndex(t => t.id === trailId);
    if (trailIndex === -1) return {};

    const trail = state.trails[trailIndex];
    const count = trail.waypoints.length;
    if (count <= 1) return {};
    if (fromIndex < 0 || fromIndex >= count) return {};
    if (toIndex < 0 || toIndex >= count) return {};
    if (fromIndex === toIndex) return {};

    const newWaypoints = [...trail.waypoints];
    const [moved] = newWaypoints.splice(fromIndex, 1);
    newWaypoints.splice(toIndex, 0, moved);

    const updatedTrails = [...state.trails];
    updatedTrails[trailIndex] = {
      ...trail,
      waypoints: newWaypoints,
      updatedAt: new Date().toISOString(),
    };

    return { trails: updatedTrails, pendingSave: true };
  }),

  // ============================================
  // TRAIL SELECTION (för multi-stig visning)
  // ============================================

  toggleTrailSelection: (trailId: string) => set((state) => {
    const isSelected = state.selectedTrailIds.includes(trailId);
    return {
      selectedTrailIds: isSelected
        ? state.selectedTrailIds.filter(id => id !== trailId)
        : [...state.selectedTrailIds, trailId],
      pendingSave: true,
    };
  }),

  clearTrailSelection: () => set(() => ({
    selectedTrailIds: [],
    pendingSave: true,
  })),

  setSelectedTrailIds: (trailIds: string[]) => set(() => ({
    selectedTrailIds: Array.from(new Set(trailIds)),
    pendingSave: true,
  })),

  setShowActiveTrailLine: (show: boolean) => set(() => ({
    showActiveTrailLine: show,
    pendingSave: true,
  })),

  getTrailNodeIds: (trailId: string) => {
    const state = get();
    const trail = state.trails.find(t => t.id === trailId);
    if (!trail) return [];
    return trail.waypoints.map(w => w.nodeId);
  },

  // ============================================
  // FILTER ACTIONS
  // ============================================

  setConnectionCountFilter: (percentage: number) => set(() => ({
    connectionCountFilter: Math.max(0, Math.min(100, percentage)),
  })),

  // ============================================
  // LOAD/SAVE
  // ============================================

  loadTrails: (trails: Trail[]) => set(() => ({
    trails,
    activeTrailId: trails.find(t => t.isActive)?.id || null,
  })),
});
