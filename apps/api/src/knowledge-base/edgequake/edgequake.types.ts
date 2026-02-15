export interface EdgeQuakeTenant {
  id: string;
  name: string;
  created_at: string;
}

export interface EdgeQuakeWorkspace {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
}

export interface EdgeQuakeDocument {
  id: string;
  title: string;
  status: string;
  chunk_count: number;
  created_at: string;
}

export interface EdgeQuakeQueryResult {
  answer: string;
  sources: EdgeQuakeSource[];
  entities?: EdgeQuakeEntity[];
  confidence?: number;
}

export interface EdgeQuakeSource {
  document_id: string;
  chunk_id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export interface EdgeQuakeEntity {
  id: string;
  name: string;
  entity_type: string;
  properties?: Record<string, unknown>;
}

export interface EdgeQuakeHealthResponse {
  status: string;
  version?: string;
}

export interface EdgeQuakeGraphData {
  nodes: EdgeQuakeGraphNode[];
  edges: EdgeQuakeGraphEdge[];
  total_nodes: number;
  total_edges: number;
  is_truncated: boolean;
}

export interface EdgeQuakeGraphNode {
  id: string;
  label: string;
  node_type: string;
  description: string;
  degree: number;
  properties: Record<string, unknown>;
}

export interface EdgeQuakeGraphEdge {
  source: string;
  target: string;
  edge_type: string;
  weight: number;
  properties: Record<string, unknown>;
}

export interface EdgeQuakeGraphStats {
  total_nodes: number;
  total_edges: number;
  node_types: Record<string, number>;
  edge_types: Record<string, number>;
  avg_degree: number;
  density: number;
}
