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
