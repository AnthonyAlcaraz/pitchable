import type { SimulationNodeDatum } from 'd3-force';
import type { GraphNode } from '@/stores/pitch-brief.store';

export interface PositionedNode extends GraphNode, SimulationNodeDatum {
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

export interface SimEdge {
  source: string | PositionedNode;
  target: string | PositionedNode;
  type: string;
  description: string;
  weight: number;
}

export const NODE_COLORS: Record<string, string> = {
  PERSON: '#3b82f6',
  ORGANIZATION: '#f59e0b',
  CONCEPT: '#10b981',
  TECHNOLOGY: '#a855f7',
  PRODUCT: '#f43f5e',
  EVENT: '#06b6d4',
  LOCATION: '#f97316',
  METRIC: '#14b8a6',
  Document: '#64748b',
};

export const NODE_TYPE_LABELS: Record<string, string> = {
  PERSON: 'Person',
  ORGANIZATION: 'Organization',
  CONCEPT: 'Concept',
  TECHNOLOGY: 'Technology',
  PRODUCT: 'Product',
  EVENT: 'Event',
  LOCATION: 'Location',
  METRIC: 'Metric',
  Document: 'Document',
};

export function getNodeRadius(connectionCount: number | undefined): number {
  const count = connectionCount ?? 1;
  return Math.max(6, Math.min(20, count * 1.5));
}

export function getEdgeOpacity(weight: number): number {
  return Math.max(0.2, Math.min(0.8, weight * 0.3));
}

export function getInitialNodes(nodes: GraphNode[], maxCount = 30): GraphNode[] {
  // Guarantee at least 1 node per type, then fill by connectionCount
  const byType = new Map<string, GraphNode[]>();
  for (const n of nodes) {
    const list = byType.get(n.type) ?? [];
    list.push(n);
    byType.set(n.type, list);
  }

  const picked = new Set<string>();
  // Phase 1: pick the top node from each type
  for (const [, list] of byType) {
    const best = list.reduce((a, b) =>
      (b.connectionCount ?? 0) > (a.connectionCount ?? 0) ? b : a,
    );
    picked.add(best.id);
    if (picked.size >= maxCount) break;
  }

  // Phase 2: fill remaining slots by connectionCount
  const remaining = [...nodes]
    .filter((n) => !picked.has(n.id))
    .sort((a, b) => (b.connectionCount ?? 0) - (a.connectionCount ?? 0));
  for (const n of remaining) {
    if (picked.size >= maxCount) break;
    picked.add(n.id);
  }

  return nodes.filter((n) => picked.has(n.id));
}
