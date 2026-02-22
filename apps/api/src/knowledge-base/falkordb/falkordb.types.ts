export interface GraphNode {
  id: string;
  name: string;
  type: string;
  description: string;
  documentId?: string;
  connectionCount?: number;
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  description: string;
  weight: number;
  documentId?: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  totalNodes: number;
  totalEdges: number;
}

export interface GraphStats {
  totalNodes: number;
  totalEdges: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
}

export interface GraphEntity {
  id: string;
  name: string;
  type: string;
  description: string;
  documentId?: string;
}

export interface GraphQueryResult {
  entities: GraphEntity[];
  relationships: Array<{ source: string; target: string; description: string }>;
}

export interface ExtractedEntity {
  name: string;
  type: string;
  description: string;
}

export interface ExtractedRelationship {
  source: string;
  target: string;
  description: string;
}

export interface ExtractionResult {
  entities: ExtractedEntity[];
  relationships: ExtractedRelationship[];
}

export const ENTITY_TYPES = [
  'PERSON',
  'ORGANIZATION',
  'CONCEPT',
  'TECHNOLOGY',
  'METRIC',
  'LOCATION',
  'EVENT',
  'PRODUCT',
] as const;

export interface NeighborResult {  centerNode: GraphNode | null;  neighbors: GraphNode[];  edges: GraphEdge[];}

export interface NodeRelationship {
  targetId: string;
  targetName: string;
  targetType: string;
  edgeType: string;
  edgeDescription: string;
  direction: 'outgoing' | 'incoming';
  weight: number;
}

export interface NodeSourceDocument {
  documentId: string;
  documentTitle: string;
}

export interface NodeDetails {
  id: string;
  name: string;
  type: string;
  description: string;
  connectionCount: number;
  relationships: NodeRelationship[];
  sourceDocuments: NodeSourceDocument[];
}

export type EntityType = (typeof ENTITY_TYPES)[number];
