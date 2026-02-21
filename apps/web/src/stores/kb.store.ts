import { create } from 'zustand';
import { api } from '@/lib/api';

interface Document {
  id: string;
  title: string;
  sourceType: 'FILE' | 'TEXT' | 'URL';
  mimeType: string | null;
  fileSize: number | null;
  status: 'UPLOADED' | 'PARSING' | 'EMBEDDING' | 'READY' | 'ERROR';
  chunkCount: number;
  errorMessage: string | null;
  sourceUrl: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SearchResult {
  id: string;
  content: string;
  heading: string | null;
  documentId: string;
  documentTitle: string;
  similarity: number;
}

interface KbState {
  documents: Document[];
  searchResults: SearchResult[];
  isLoading: boolean;
  isUploading: boolean;
  isSearching: boolean;
  error: string | null;

  fetchDocuments: () => Promise<void>;
  uploadFile: (file: File) => Promise<void>;
  createTextSource: (content: string, title?: string) => Promise<void>;
  createUrlSource: (url: string, title?: string) => Promise<void>;
  deleteDocument: (id: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  clearError: () => void;

  documentProgress: Record<string, { progress: number; step: string; message: string }>;
  setDocumentProgress: (documentId: string, progress: number, step: string, message: string) => void;
  clearDocumentProgress: (documentId: string) => void;
}

const API_BASE = '/knowledge-base';

export const useKbStore = create<KbState>()((set, get) => ({
  documents: [],
  searchResults: [],
  isLoading: false,
  isUploading: false,
  isSearching: false,
  error: null,
  documentProgress: {},

  fetchDocuments: async () => {
    set({ isLoading: true, error: null });
    try {
      const docs = await api.get<Document[]>(`${API_BASE}/documents`);
      set({ documents: docs, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load documents',
      });
    }
  },

  uploadFile: async (file: File) => {
    set({ isUploading: true, error: null });
    try {
      await api.uploadFile<Document>(`${API_BASE}/upload`, file);
      await get().fetchDocuments();
      set({ isUploading: false });
    } catch (err) {
      set({
        isUploading: false,
        error: err instanceof Error ? err.message : 'Upload failed',
      });
    }
  },

  createTextSource: async (content: string, title?: string) => {
    set({ isUploading: true, error: null });
    try {
      await api.post<Document>(`${API_BASE}/text`, { content, title });
      await get().fetchDocuments();
      set({ isUploading: false });
    } catch (err) {
      set({
        isUploading: false,
        error: err instanceof Error ? err.message : 'Failed to create text source',
      });
    }
  },

  createUrlSource: async (url: string, title?: string) => {
    set({ isUploading: true, error: null });
    try {
      await api.post<Document>(`${API_BASE}/url`, { url, title });
      await get().fetchDocuments();
      set({ isUploading: false });
    } catch (err) {
      set({
        isUploading: false,
        error: err instanceof Error ? err.message : 'Failed to add URL source',
      });
    }
  },

  deleteDocument: async (id: string) => {
    try {
      await api.delete(`${API_BASE}/documents/${id}`);
      set((state) => ({
        documents: state.documents.filter((d) => d.id !== id),
      }));
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete document',
      });
    }
  },

  search: async (query: string) => {
    set({ isSearching: true, error: null });
    try {
      const results = await api.post<SearchResult[]>(`${API_BASE}/search`, {
        query,
        limit: 10,
        threshold: 0.3,
      });
      set({ searchResults: results, isSearching: false });
    } catch (err) {
      set({
        isSearching: false,
        error: err instanceof Error ? err.message : 'Search failed',
      });
    }
  },

  clearSearch: () => set({ searchResults: [] }),
  clearError: () => set({ error: null }),

  setDocumentProgress: (documentId, progress, step, message) =>
    set((state) => ({
      documentProgress: {
        ...state.documentProgress,
        [documentId]: { progress, step, message },
      },
    })),

  clearDocumentProgress: (documentId) =>
    set((state) => {
      const { [documentId]: _, ...rest } = state.documentProgress;
      return { documentProgress: rest };
    }),
}));
