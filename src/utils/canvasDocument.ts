import type { Conversation, MindNode, OmnicalDocumentState, PendingOmnicalFile, Sequence, Session, Synapse, Trail } from '../types/types';

export const CANVAS_DOCUMENT_VERSION = 2;

export interface CanvasDocumentV2 {
  schemaVersion: typeof CANVAS_DOCUMENT_VERSION;
  exportedAt: string;
  nodes: MindNode[];
  synapses: Synapse[];
  conversations: Conversation[];
  sessions: Session[];
  trails: Trail[];
  sequences: Sequence[];
  activeSessionId: string | null;
  trailUi: {
    selectedTrailIds: string[];
    showActiveTrailLine: boolean;
  };
  omnical: OmnicalDocumentState;
}

type LegacyDocument = Partial<Omit<CanvasDocumentV2, 'schemaVersion' | 'exportedAt' | 'omnical'>> & {
  version?: unknown;
  selectedTrailIds?: unknown;
  showActiveTrailLine?: unknown;
  omnical?: unknown;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

const asArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

const asNodes = (value: unknown): MindNode[] => {
  if (Array.isArray(value)) return value as MindNode[];
  if (isRecord(value)) return Object.values(value).filter(isRecord) as unknown as MindNode[];
  return [];
};

const asOmnical = (value: unknown): OmnicalDocumentState => {
  if (value === undefined) return { pendingFiles: [], ignoredNoteIds: [] };
  if (!isRecord(value) || !Array.isArray(value.pendingFiles) || !Array.isArray(value.ignoredNoteIds)) {
    throw new Error('Dokumentet har ett ogiltigt omnical-fält.');
  }
  const pendingFiles = value.pendingFiles;
  if (!pendingFiles.every((item) => (
    isRecord(item)
    && typeof item.nodeId === 'string'
    && typeof item.path === 'string'
    && typeof item.fingerprint === 'string'
    && typeof item.bodyHash === 'string'
    && typeof item.tagsHash === 'string'
    && typeof item.createdAt === 'string'
  )) || !value.ignoredNoteIds.every((id) => typeof id === 'string')) {
    throw new Error('Dokumentet har ett ogiltigt omnical-fält.');
  }
  return {
    pendingFiles: pendingFiles as PendingOmnicalFile[],
    ignoredNoteIds: value.ignoredNoteIds as string[],
  };
};

export function createEmptyCanvasDocument(): CanvasDocumentV2 {
  return {
    schemaVersion: CANVAS_DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    nodes: [],
    synapses: [],
    conversations: [],
    sessions: [],
    trails: [],
    sequences: [],
    activeSessionId: null,
    trailUi: { selectedTrailIds: [], showActiveTrailLine: true },
    omnical: { pendingFiles: [], ignoredNoteIds: [] },
  };
}

export function parseCanvasDocument(raw: unknown): CanvasDocumentV2 {
  if (!isRecord(raw)) throw new Error('Dokumentet måste vara ett JSON-objekt.');
  if (typeof raw.schemaVersion === 'number' && raw.schemaVersion !== 1 && raw.schemaVersion !== CANVAS_DOCUMENT_VERSION) {
    throw new Error('Dokumentversionen stöds inte.');
  }
  if (raw.nodes !== undefined && !Array.isArray(raw.nodes) && !isRecord(raw.nodes)) {
    throw new Error('Dokumentet har ett ogiltigt nodes-fält.');
  }

  const legacy = raw as LegacyDocument;
  const trailUi: Record<string, unknown> = isRecord(legacy.trailUi) ? legacy.trailUi : {};
  const selectedTrailIds = asArray<string>(trailUi.selectedTrailIds ?? legacy.selectedTrailIds);
  const showActiveTrailLine = typeof trailUi.showActiveTrailLine === 'boolean'
    ? trailUi.showActiveTrailLine
    : typeof legacy.showActiveTrailLine === 'boolean'
      ? legacy.showActiveTrailLine
      : true;

  return {
    schemaVersion: CANVAS_DOCUMENT_VERSION,
    exportedAt: typeof raw.exportedAt === 'string'
      ? raw.exportedAt
      : typeof raw.lastSaved === 'string'
        ? raw.lastSaved
        : new Date().toISOString(),
    nodes: asNodes(legacy.nodes),
    synapses: asArray<Synapse>(legacy.synapses),
    conversations: asArray<Conversation>(legacy.conversations),
    sessions: asArray<Session>(legacy.sessions),
    trails: asArray<Trail>(legacy.trails),
    sequences: asArray<Sequence>(legacy.sequences),
    activeSessionId: typeof legacy.activeSessionId === 'string' ? legacy.activeSessionId : null,
    trailUi: { selectedTrailIds, showActiveTrailLine },
    omnical: asOmnical(legacy.omnical),
  };
}

export function serializeCanvasDocument(document: Omit<CanvasDocumentV2, 'schemaVersion' | 'exportedAt'>): CanvasDocumentV2 {
  return {
    schemaVersion: CANVAS_DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    ...document,
    nodes: [...document.nodes],
    synapses: [...document.synapses],
    conversations: [...document.conversations],
    sessions: [...document.sessions],
    trails: [...document.trails],
    sequences: [...document.sequences],
    trailUi: {
      selectedTrailIds: [...document.trailUi.selectedTrailIds],
      showActiveTrailLine: document.trailUi.showActiveTrailLine,
    },
    omnical: {
      pendingFiles: document.omnical.pendingFiles.map((file) => ({ ...file })),
      ignoredNoteIds: [...document.omnical.ignoredNoteIds],
    },
  };
}
