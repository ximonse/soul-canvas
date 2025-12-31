// src/utils/aiExport.ts
// Exporterar sessioner som AI-optimerade .txt-filer for externa AI-verktyg

import type { MindNode, Session, Synapse } from '../types/types';

function formatDate(isoDate?: string): string {
    if (!isoDate) return '';
    return isoDate.split('T')[0];
}

/**
 * Exporterar en session till AI-optimerat textformat
 */
export function exportSessionForAI(
    session: Session,
    nodes: Map<string, MindNode>,
    synapses: Synapse[]
): string {
    void synapses;
    const cards = session.cardIds
        .map(id => nodes.get(id))
        .filter((card): card is MindNode => card !== undefined)
        .sort((a, b) => (a.value || 6) - (b.value || 6));

    const exportDate = new Date().toISOString().split('T')[0];

    let output = `Samling: "${session.name}" | ${cards.length} kort | ${exportDate}\n\n`;

    for (const card of cards) {
        const title = card.title || 'Utan titel';
        const created = formatDate(card.createdAt);

        output += `T: ${title}`;
        if (card.value) output += ` | V: ${card.value}`;
        if (created) output += ` | D: ${created}`;
        output += `\n`;

        const content = card.content
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();

        if (content) output += `C: ${content}\n`;
        if (card.caption?.trim()) output += `Cap: ${card.caption.trim()}\n`;
        if (card.comment?.trim()) output += `Note: ${card.comment.trim()}\n`;
        if (card.link?.trim()) output += `Link: ${card.link.trim()}\n`;

        const userTags = (card.tags || []).map(t => t.trim()).filter(Boolean);
        if (userTags.length > 0) output += `Tags: ${userTags.join(', ')}\n`;

        const semTags = (card.semanticTags || []).map(t => t.trim()).filter(Boolean);
        if (semTags.length > 0) output += `Sem: ${semTags.join(', ')}\n`;

        output += `\n`;
    }

    return output;
}

/**
 * Sanitizar filnamn for saker filskapning
 */
export function sanitizeFilename(name: string): string {
    return name
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 50);
}
