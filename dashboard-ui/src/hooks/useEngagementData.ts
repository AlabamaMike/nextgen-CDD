import { useEngagement } from './useEngagements';
import { useHypothesisTree } from './useHypotheses';
import { useEvidence, useEvidenceStats } from './useEvidence';
import { useEngagementWebSocket } from './useEngagementWebSocket';
import type { Engagement, HypothesisNode, HypothesisTree, Evidence, EvidenceStats } from '../types/api';

// UI-compatible Hypothesis type with recursion
export interface UIHypothesis {
    id: string;
    title: string;
    status: 'untested' | 'supported' | 'challenged' | 'refuted';
    confidence: number;
    children?: UIHypothesis[];
}

export interface EngagementData {
    engagement: Engagement | undefined;
    hypotheses: UIHypothesis[];     // Transformed tree
    rawHypotheses: HypothesisNode[]; // Original flat list
    hypothesisTree: HypothesisTree | undefined;
    evidence: Evidence[];
    stats: EvidenceStats | undefined;
    isLoading: boolean;
    error: unknown;
    isConnected: boolean; // WS status
}

/**
 * Transforms backend DAG (Nodes + Edges) into a UI Tree
 * Note: This assumes a roughly hierarchical structure. 
 * Complex graphs (multi-parent) might need duplication or a different UI visualization.
 */
function buildTreeFromDag(nodes: HypothesisNode[]): UIHypothesis[] {
    if (!nodes || nodes.length === 0) return [];


    const nodeMap = new Map<string, UIHypothesis>();

    // 1. Create UI nodes
    nodes.forEach(node => {
        nodeMap.set(node.id, {
            id: node.id,
            title: node.content,
            status: node.status,
            confidence: node.confidence,
            children: []
        });
    });

    const rootNodes: UIHypothesis[] = [];

    // 2. Build hierarchy based on parentId
    // Note: We currently rely on 'parentId' property, but we could use 'edges' if strict DAG is needed.
    // For the Sidebar Tree view, parentId is the most stable source of truth for hierarchy.
    nodes.forEach(node => {
        const uiNode = nodeMap.get(node.id)!;
        if (node.parentId && nodeMap.has(node.parentId)) {
            const parent = nodeMap.get(node.parentId)!;
            parent.children?.push(uiNode);
        } else {
            // Is a root
            rootNodes.push(uiNode);
        }
    });

    return rootNodes;
}

/**
 * Aggregated hook to fetch all context data for the engagement sidebar
 */
export function useEngagementData(engagementId: string | null, token?: string): EngagementData {
    // 1. WebSocket Integration (Side Effect: Invalidates Queries)
    const { isConnected } = useEngagementWebSocket({
        engagementId: engagementId ?? undefined,
        token,
        enabled: !!engagementId
    });

    // 2. Fetch Data
    const {
        data: engagementData,
        isLoading: loadingEngagement,
        error: engagementError
    } = useEngagement(engagementId);

    const {
        data: tree,
        isLoading: loadingTree,
        error: treeError
    } = useHypothesisTree(engagementId);

    const {
        data: evidenceStats,
        isLoading: loadingStats,
        error: statsError
    } = useEvidenceStats(engagementId);

    const {
        data: evidenceData,
        isLoading: loadingEvidence,
        error: evidenceError
    } = useEvidence(engagementId, { limit: 50 });

    // 3. Transform Data
    const uiHypotheses = buildTreeFromDag(tree?.hypotheses ?? []);

    return {
        engagement: engagementData?.engagement,
        hypotheses: uiHypotheses,
        rawHypotheses: tree?.hypotheses ?? [],
        hypothesisTree: tree,
        evidence: evidenceData?.evidence ?? [],
        stats: evidenceStats?.stats,
        isLoading: loadingEngagement || loadingTree || loadingStats || loadingEvidence,
        error: engagementError || treeError || statsError || evidenceError,
        isConnected
    };
}
