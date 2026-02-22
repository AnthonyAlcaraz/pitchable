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

export function getInitialNodes(nodes: GraphNode[], maxCount = 15): GraphNode[] {
  // Prioritize CONCEPT and ORGANIZATION, then sort by connectionCount
  const priorityTypes = new Set(['CONCEPT', 'ORGANIZATION']);
  const sorted = [...nodes].sort((a, b) => {
    const aPriority = priorityTypes.has(a.type) ? 1 : 0;
    const bPriority = priorityTypes.has(b.type) ? 1 : 0;
    if (bPriority !== aPriority) return bPriority - aPriority;
    return (b.connectionCount ?? 0) - (a.connectionCount ?? 0);
  });
  return sorted.slice(0, maxCount);
}
