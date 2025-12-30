// src/utils/aiExport.ts
// Exporterar sessioner som AI-optimerade .txt-filer för externa AI-verktyg

import type { MindNode, Session, Synapse } from '../types/types';

/**
 * Formaterar ett värde (1-6) som stjärnor
 * Värde 1 = högst prioritet = flest stjärnor
 */
function valueToStars(value?: number): string {
    if (!value) return '';
    const stars = 7 - value; // value 1 → 6 stars, value 6 → 1 star
    return '★'.repeat(stars);
}

/**
 * Formaterar datum till YYYY-MM-DD
 */
function formatDate(isoDate?: string): string {
    if (!isoDate) return '';
    return isoDate.split('T')[0];
}

/**
 * Hittar relaterade kort baserat på synapser
 */
function findRelatedCards(
    nodeId: string,
    synapses: Synapse[],
    nodes: Map<string, MindNode>
): string[] {
    const related: string[] = [];

    for (const synapse of synapses) {
        if (synapse.sourceId === nodeId) {
            const target = nodes.get(synapse.targetId);
            if (target?.title) related.push(target.title);
        } else if (synapse.targetId === nodeId) {
            const source = nodes.get(synapse.sourceId);
            if (source?.title) related.push(source.title);
        }
    }

    return related.slice(0, 5); // Max 5 relationer
}

/**
 * Exporterar en session till AI-optimerat textformat
 */
export function exportSessionForAI(
    session: Session,
    nodes: Map<string, MindNode>,
    synapses: Synapse[]
): string {
    const cards = session.cardIds
        .map(id => nodes.get(id))
        .filter((card): card is MindNode => card !== undefined)
        .sort((a, b) => (a.value || 6) - (b.value || 6)); // Viktigt först

    const exportDate = new Date().toISOString().split('T')[0];

    let output = `Kunskapssamling: "${session.name}" | ${cards.length} kort | ${exportDate}\n\n`;
    output += `---\n\n`;

    for (const card of cards) {
        const stars = valueToStars(card.value);
        const title = card.title || 'Utan titel';
        const created = formatDate(card.createdAt);

        // Rubrik med värde och datum
        output += `${title}`;
        if (stars) output += ` (${stars})`;
        if (created) output += ` [${created}]`;
        output += `\n\n`;

        // Huvudinnehåll (strippa eventuell HTML)
        const content = card.content
            .replace(/<[^>]*>/g, '') // Ta bort HTML-taggar
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();

        if (content) {
            output += `${content}\n`;
        }

        // Caption (visuell kontext)
        if (card.caption?.trim()) {
            output += `\n[${card.caption.trim()}]\n`;
        }

        // Anteckning/kommentar
        if (card.comment?.trim()) {
            output += `\nAnteckning: ${card.comment.trim()}\n`;
        }

        // Taggar
        const allTags = [...(card.tags || []), ...(card.semanticTags || [])];
        const uniqueTags = [...new Set(allTags)].filter(t => t.trim());
        if (uniqueTags.length > 0) {
            output += `#${uniqueTags.join(' #')}\n`;
        }

        // Relaterade kort
        const related = findRelatedCards(card.id, synapses, nodes);
        if (related.length > 0) {
            output += `Relaterar till: ${related.join(', ')}\n`;
        }

        output += `\n---\n\n`;
    }

    return output;
}

/**
 * Sanitizar filnamn för säker filskapning
 */
export function sanitizeFilename(name: string): string {
    return name
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 50);
}
