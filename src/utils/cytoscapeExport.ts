// src/utils/cytoscapeExport.ts
import type { MindNode, Synapse } from '../types/types';

/**
 * Create a safe node label (no tabs/newlines, max 50 chars)
 */
function safeLabel(node: MindNode): string {
  const text = node.title || node.content;
  return text.replace(/[\t\n\r]/g, ' ').slice(0, 50).trim() || node.id;
}

/**
 * Build a map from node ID to unique readable label
 */
function buildLabelMap(nodes: MindNode[]): Map<string, string> {
  const labelMap = new Map<string, string>();
  const usedLabels = new Map<string, number>();

  for (const node of nodes) {
    let label = safeLabel(node);

    // Handle duplicates by adding a number suffix
    const count = usedLabels.get(label) || 0;
    if (count > 0) {
      label = `${label} (${count + 1})`;
    }
    usedLabels.set(safeLabel(node), count + 1);

    labelMap.set(node.id, label);
  }

  return labelMap;
}

/**
 * Export to SIF format (Simple Interaction Format)
 * Format: sourceLabel \t interactionType \t targetLabel
 * Isolated nodes: just the label on its own line
 */
export function toSIF(nodes: MindNode[], synapses: Synapse[]): string {
  const lines: string[] = [];
  const connectedNodes = new Set<string>();
  const labelMap = buildLabelMap(nodes);

  // Add all edges
  for (const syn of synapses) {
    connectedNodes.add(syn.sourceId);
    connectedNodes.add(syn.targetId);
    const sourceLabel = labelMap.get(syn.sourceId) || syn.sourceId;
    const targetLabel = labelMap.get(syn.targetId) || syn.targetId;
    lines.push(`${sourceLabel}\tlinked\t${targetLabel}`);
  }

  // Add isolated nodes (nodes without any connections)
  for (const node of nodes) {
    if (!connectedNodes.has(node.id)) {
      const label = labelMap.get(node.id) || node.id;
      lines.push(label);
    }
  }

  return lines.join('\n');
}

/**
 * Export node attributes as CSV (for importing as node table in Cytoscape)
 */
export function toNodeCSV(nodes: MindNode[]): string {
  const headers = ['name', 'type', 'tags', 'semanticTags', 'x', 'y'];
  const lines: string[] = [headers.join(',')];
  const labelMap = buildLabelMap(nodes);

  for (const node of nodes) {
    const label = (labelMap.get(node.id) || '').replace(/"/g, '""');
    const tags = (node.tags || []).join(';');
    const semanticTags = (node.semanticTags || []).join(';');

    lines.push([
      `"${label}"`,
      node.type,
      `"${tags}"`,
      `"${semanticTags}"`,
      Math.round(node.x),
      Math.round(node.y),
    ].join(','));
  }

  return lines.join('\n');
}

/**
 * Export edge attributes as CSV
 */
export function toEdgeCSV(nodes: MindNode[], synapses: Synapse[]): string {
  const headers = ['source', 'target', 'interaction', 'weight', 'similarity'];
  const lines: string[] = [headers.join(',')];
  const labelMap = buildLabelMap(nodes);

  for (const syn of synapses) {
    const sourceLabel = (labelMap.get(syn.sourceId) || syn.sourceId).replace(/"/g, '""');
    const targetLabel = (labelMap.get(syn.targetId) || syn.targetId).replace(/"/g, '""');
    lines.push([
      `"${sourceLabel}"`,
      `"${targetLabel}"`,
      'linked',
      syn.strength.toFixed(3),
      syn.similarity?.toFixed(3) || '',
    ].join(','));
  }

  return lines.join('\n');
}

/**
 * Download a text file
 */
function downloadFile(content: string, filename: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export network as SIF file
 */
export function exportToSIF(nodes: MindNode[], synapses: Synapse[], filename = 'soul-canvas') {
  const sif = toSIF(nodes, synapses);
  downloadFile(sif, `${filename}.sif`);
}

/**
 * Export as CSV files (network + node attributes)
 * Downloads two files: edges.csv and nodes.csv
 */
export function exportToCSV(nodes: MindNode[], synapses: Synapse[], filename = 'soul-canvas') {
  const edgeCSV = toEdgeCSV(nodes, synapses);
  const nodeCSV = toNodeCSV(nodes);

  downloadFile(edgeCSV, `${filename}-edges.csv`, 'text/csv');
  // Small delay to avoid browser blocking multiple downloads
  setTimeout(() => {
    downloadFile(nodeCSV, `${filename}-nodes.csv`, 'text/csv');
  }, 100);
}

/**
 * Main export function - exports both SIF and CSV
 */
export function exportToCytoscape(nodes: MindNode[], synapses: Synapse[], filename = 'soul-canvas') {
  exportToSIF(nodes, synapses, filename);
}
