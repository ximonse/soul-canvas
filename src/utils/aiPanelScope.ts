import type { MindNode, Session, Synapse } from '../types/types';

interface AIPanelScopeParams {
  nodes: Map<string, MindNode>;
  sessions: Session[];
  activeSessionId: string | null;
  selectedNodeIds: Set<string>;
  synapses: Synapse[];
}

export interface AIPanelScope {
  activeSession: Session | null;
  nodeIds: string[];
  nodeIdSet: Set<string>;
  nodes: MindNode[];
  selectedNodes: MindNode[];
  synapses: Synapse[];
  totalCount: number;
  embeddedCount: number;
  selectedCount: number;
}

export const getAIPanelScope = ({
  nodes,
  sessions,
  activeSessionId,
  selectedNodeIds,
  synapses,
}: AIPanelScopeParams): AIPanelScope => {
  const activeSession = activeSessionId
    ? sessions.find((session) => session.id === activeSessionId) ?? null
    : null;

  const nodeIds = activeSession
    ? activeSession.cardIds.filter((id) => nodes.has(id))
    : Array.from(nodes.keys());
  const nodeIdSet = new Set(nodeIds);
  const scopedNodes = nodeIds
    .map((id) => nodes.get(id))
    .filter(Boolean) as MindNode[];
  const selectedNodes = Array.from(selectedNodeIds)
    .filter((id) => nodeIdSet.has(id))
    .map((id) => nodes.get(id))
    .filter(Boolean) as MindNode[];
  const scopedSynapses = synapses.filter(
    (synapse) => nodeIdSet.has(synapse.sourceId) && nodeIdSet.has(synapse.targetId),
  );

  return {
    activeSession,
    nodeIds,
    nodeIdSet,
    nodes: scopedNodes,
    selectedNodes,
    synapses: scopedSynapses,
    totalCount: scopedNodes.length,
    embeddedCount: scopedNodes.filter((node) => Boolean(node.embedding)).length,
    selectedCount: selectedNodes.length,
  };
};
