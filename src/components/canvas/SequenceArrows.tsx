import React from 'react';
import { Arrow } from 'react-konva';
import type { MindNode, Sequence } from '../../types/types';

interface SequenceArrowsProps {
    sequences: Sequence[];
    activeSequence: Sequence | null;
    nodes: Map<string, MindNode>;
    scale: number;
    activeSessionId: string | null;
    onArrowClick?: (data: { x: number; y: number; seqId: string; segmentIndex: number }) => void;
}

// Beräkna pilpunkter från kant till kant mellan två kort
const getEdgeToEdgePoints = (
    fromNode: MindNode,
    toNode: MindNode
): { fromX: number; fromY: number; toX: number; toY: number } => {
    const fromW = fromNode.width || 200;
    const fromH = fromNode.height || 100;
    const toW = toNode.width || 200;
    const toH = toNode.height || 100;

    // Centrum för varje kort
    const fromCx = fromNode.x + fromW / 2;
    const fromCy = fromNode.y + fromH / 2;
    const toCx = toNode.x + toW / 2;
    const toCy = toNode.y + toH / 2;

    // Riktning från källa till mål
    const dx = toCx - fromCx;
    const dy = toCy - fromCy;

    // Beräkna utgångspunkt på källkortets kant
    let fromX: number, fromY: number;
    if (Math.abs(dx) * fromH > Math.abs(dy) * fromW) {
        fromX = dx > 0 ? fromNode.x + fromW : fromNode.x;
        fromY = fromCy + (dy / Math.abs(dx)) * (fromW / 2);
    } else {
        fromY = dy > 0 ? fromNode.y + fromH : fromNode.y;
        fromX = fromCx + (dx / Math.abs(dy)) * (fromH / 2);
    }

    // Beräkna slutpunkt på målkortets kant
    let toX: number, toY: number;
    if (Math.abs(dx) * toH > Math.abs(dy) * toW) {
        toX = dx > 0 ? toNode.x : toNode.x + toW;
        toY = toCy - (dy / Math.abs(dx)) * (toW / 2);
    } else {
        toY = dy > 0 ? toNode.y : toNode.y + toH;
        toX = toCx - (dx / Math.abs(dy)) * (toH / 2);
    }

    return { fromX, fromY, toX, toY };
};

export const SequenceArrows: React.FC<SequenceArrowsProps> = ({
    sequences,
    activeSequence,
    nodes,
    scale,
    activeSessionId,
    onArrowClick,
}) => {
    // Filtrera sekvenser baserat på session
    const visibleSequences = React.useMemo(() => {
        return sequences.filter(seq => {
            // Om ingen aktiv session (All Cards), visa alla
            if (!activeSessionId) return true;
            // Annars visa bara de som tillhör denna session
            return seq.sessionId === activeSessionId;
        });
    }, [sequences, activeSessionId]);

    return (
        <>
            {/* Active sequence (medan man drar) */}
            {activeSequence && activeSequence.nodeIds.map((nodeId, i) => {
                if (i === 0) return null;
                const fromNode = nodes.get(activeSequence.nodeIds[i - 1]);
                const toNode = nodes.get(nodeId);
                if (!fromNode || !toNode) return null;

                const { fromX, fromY, toX, toY } = getEdgeToEdgePoints(fromNode, toNode);

                return (
                    <Arrow
                        key={`active-seq-${i}`}
                        points={[fromX, fromY, toX, toY]}
                        stroke="#f59e0b"
                        strokeWidth={3.5 / scale}
                        pointerLength={10 / scale}
                        pointerWidth={10 / scale}
                        opacity={0.9}
                        listening={false}
                    />
                );
            })}

            {/* Sparade sekvenser */}
            {visibleSequences.map((sequence) =>
                sequence.nodeIds.map((nodeId, i) => {
                    if (i === 0) return null;
                    const fromNode = nodes.get(sequence.nodeIds[i - 1]);
                    const toNode = nodes.get(nodeId);
                    if (!fromNode || !toNode) return null;

                    const { fromX, fromY, toX, toY } = getEdgeToEdgePoints(fromNode, toNode);

                    const handleArrowClickInternal = (e: any) => {
                        e.cancelBubble = true;
                        const event = e.evt;

                        // Hindra webbläsarens kontextmeny om det är ett högerklick
                        if (event && event.type === 'contextmenu') {
                            event.preventDefault();
                        }

                        if (event && onArrowClick) {
                            onArrowClick({
                                x: event.clientX,
                                y: event.clientY,
                                seqId: sequence.id,
                                segmentIndex: i - 1
                            });
                        }
                    };

                    return (
                        <Arrow
                            key={`seq-${sequence.id}-${i}`}
                            points={[fromX, fromY, toX, toY]}
                            stroke="#f59e0b"
                            strokeWidth={3.5 / scale}
                            pointerLength={10 / scale}
                            pointerWidth={10 / scale}
                            opacity={0.9}
                            listening={true}
                            hitStrokeWidth={20}
                            onClick={handleArrowClickInternal}
                            onTap={handleArrowClickInternal}
                            onContextMenu={handleArrowClickInternal}
                            onMouseEnter={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'pointer';
                            }}
                            onMouseLeave={(e) => {
                                const container = e.target.getStage()?.container();
                                if (container) container.style.cursor = 'default';
                            }}
                        />
                    );
                })
            )}
        </>
    );
};
