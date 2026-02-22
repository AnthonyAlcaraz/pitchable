import { create } from 'zustand';
import { api } from '../lib/api.js';

// ─── Types ──────────────────────────────────────────────────

export interface PitchBriefListItem {
  id: string;
  name: string;
  description: string | null;
  aiSummary: string | null;
  edgequakeWorkspaceId: string | null;
  documentCount: number;
  entityCount: number;
  lensCount: number;
  status: 'EMPTY' | 'PROCESSING' | 'READY' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export interface BriefDocument {
  id: string;
  title: string;
  sourceType: string;
  mimeType: string | null;
  fileSize: number | null;
  status: string;
  chunkCount: number;
  createdAt: string;
}

export interface BriefLensLink {
  id: string;
  lens: {
    id: string;
    name: string;
    audienceType: string;
    pitchGoal: string;
    isDefault: boolean;
  };
}

export interface PitchBriefDetail extends PitchBriefListItem {
  documents: BriefDocument[];
  briefLenses: BriefLensLink[];
  presentationCount: number;
}

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

export interface NeighborData {
  centerNode: GraphNode | null;
  neighbors: GraphNode[];
  edges: GraphEdge[];
}

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

export interface SearchResult {
  answer: string;
  sources: Array<{
    document_id: string;
    chunk_id: string;
    content: string;
    score: number;
  }>;
}

// ─── Store ──────────────────────────────────────────────────

interface PitchBriefState {
  briefs: PitchBriefListItem[];
  currentBrief: PitchBriefDetail | null;
  graphData: GraphData | null;
  graphStats: GraphStats | null;
  isLoading: boolean;
  isGraphLoading: boolean;
  error: string | null;

  loadBriefs: () => Promise<void>;
  loadBrief: (id: string) => Promise<void>;
  createBrief: (input: { name: string; description?: string }) => Promise<string>;
  updateBrief: (id: string, input: { name?: string; description?: string }) => Promise<void>;
  deleteBrief: (id: string) => Promise<void>;

  uploadDocument: (briefId: string, file: File, title?: string) => Promise<void>;
  addTextDocument: (briefId: string, content: string, title?: string) => Promise<void>;
  addUrlDocument: (briefId: string, url: string, title?: string) => Promise<void>;
  removeDocument: (briefId: string, docId: string) => Promise<void>;
  crawlWebsite: (briefId: string, url: string, maxPages?: number, maxDepth?: number) => Promise<{ jobId: string; estimatedCredits: number }>;

  loadGraph: (briefId: string, opts?: { startNode?: string; depth?: number; maxNodes?: number }) => Promise<void>;
  loadGraphStats: (briefId: string) => Promise<void>;
  loadNeighbors: (briefId: string, nodeId: string, limit?: number) => Promise<NeighborData>;
  search: (briefId: string, query: string) => Promise<SearchResult>;

  loadNodeDetails: (briefId: string, nodeId: string) => Promise<NodeDetails | null>;
  linkLens: (briefId: string, lensId: string) => Promise<void>;
  unlinkLens: (briefId: string, lensId: string) => Promise<void>;

  clearError: () => void;
}

export const usePitchBriefStore = create<PitchBriefState>((set, get) => ({
  briefs: [],
  currentBrief: null,
  graphData: null,
  graphStats: null,
  isLoading: false,
  isGraphLoading: false,
  error: null,

  // ─── CRUD ─────────────────────────────────────────────────

  async loadBriefs() {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<PitchBriefListItem[]>('/pitch-briefs');
      set({ briefs: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load briefs', isLoading: false });
    }
  },

  async loadBrief(id: string) {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<PitchBriefDetail>(`/pitch-briefs/${id}`);
      set({ currentBrief: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load brief', isLoading: false });
    }
  },

  async createBrief(input) {
    const data = await api.post<PitchBriefListItem>('/pitch-briefs', input);
    set((state) => ({ briefs: [data, ...state.briefs] }));
    return data.id;
  },

  async updateBrief(id, input) {
    const data = await api.patch<PitchBriefListItem>(`/pitch-briefs/${id}`, input);
    set((state) => ({
      briefs: state.briefs.map((b) => (b.id === id ? { ...b, ...data } : b)),
      currentBrief: state.currentBrief?.id === id
        ? { ...state.currentBrief, ...data }
        : state.currentBrief,
    }));
  },

  async deleteBrief(id) {
    await api.delete(`/pitch-briefs/${id}`);
    set((state) => ({
      briefs: state.briefs.filter((b) => b.id !== id),
      currentBrief: state.currentBrief?.id === id ? null : state.currentBrief,
    }));
  },

  // ─── Document Management ──────────────────────────────────

  async uploadDocument(briefId, file, title) {
    await api.uploadFile(`/pitch-briefs/${briefId}/documents/upload`, file, title ? { title } : undefined);
    // Reload brief to get updated doc list
    get().loadBrief(briefId);
  },

  async addTextDocument(briefId, content, title) {
    await api.post(`/pitch-briefs/${briefId}/documents/text`, { content, title });
    get().loadBrief(briefId);
  },

  async addUrlDocument(briefId, url, title) {
    await api.post(`/pitch-briefs/${briefId}/documents/url`, { url, title });
    get().loadBrief(briefId);
  },

  async removeDocument(briefId, docId) {
    await api.delete(`/pitch-briefs/${briefId}/documents/${docId}`);
    set((state) => {
      if (!state.currentBrief || state.currentBrief.id !== briefId) return state;
      return {
        currentBrief: {
          ...state.currentBrief,
          documents: state.currentBrief.documents.filter((d) => d.id !== docId),
          documentCount: state.currentBrief.documentCount - 1,
        },
      };
    });
  },

  async crawlWebsite(briefId, url, maxPages = 20, maxDepth = 2) {
    const result = await api.post<{ jobId: string; estimatedCredits: number }>(
      `/pitch-briefs/${briefId}/documents/crawl`,
      { url, maxPages, maxDepth },
    );
    return result;
  },

  // ─── Graph ────────────────────────────────────────────────

  async loadGraph(briefId, opts) {
    set({ isGraphLoading: true });
    try {
      const params = new URLSearchParams();
      if (opts?.startNode) params.set('start_node', opts.startNode);
      if (opts?.depth) params.set('depth', String(opts.depth));
      if (opts?.maxNodes) params.set('max_nodes', String(opts.maxNodes));
      const qs = params.toString();
      const data = await api.get<GraphData>(`/pitch-briefs/${briefId}/graph${qs ? `?${qs}` : ''}`);
      set({ graphData: data, isGraphLoading: false });
    } catch (err) {
      set({ isGraphLoading: false, error: err instanceof Error ? err.message : 'Failed to load graph' });
    }
  },

  async loadGraphStats(briefId) {
    try {
      const data = await api.get<GraphStats>(`/pitch-briefs/${briefId}/graph/stats`);
      set({ graphStats: data });
    } catch {
      // Non-critical — don't set error
    }
  },

  async loadNeighbors(briefId, nodeId, limit) {
    const params = limit ? `?limit=${limit}` : '';
    return api.get<NeighborData>(`/pitch-briefs/${briefId}/graph/neighbors/${nodeId}${params}`);
  },

  async search(briefId, query) {
    return api.post<SearchResult>(`/pitch-briefs/${briefId}/search`, { query });
  },

  async loadNodeDetails(briefId, nodeId) {
    try {
      return await api.get<NodeDetails>(`/pitch-briefs/${briefId}/graph/node/${nodeId}/details`);
    } catch {
      return null;
    }
  },

  // ─── Lens Linking ─────────────────────────────────────────

  async linkLens(briefId, lensId) {
    await api.post(`/pitch-briefs/${briefId}/link-lens/${lensId}`);
    get().loadBrief(briefId);
  },

  async unlinkLens(briefId, lensId) {
    await api.delete(`/pitch-briefs/${briefId}/link-lens/${lensId}`);
    set((state) => {
      if (!state.currentBrief || state.currentBrief.id !== briefId) return state;
      return {
        currentBrief: {
          ...state.currentBrief,
          briefLenses: state.currentBrief.briefLenses.filter((bl) => bl.lens.id !== lensId),
          lensCount: state.currentBrief.lensCount - 1,
        },
      };
    });
  },

  clearError() {
    set({ error: null });
  },
}));

export default usePitchBriefStore;
