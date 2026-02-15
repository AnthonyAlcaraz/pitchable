import { create } from 'zustand';
import { api } from '../lib/api.js';

export interface PresentationListItem {
  id: string;
  title: string;
  description: string | null;
  presentationType: string;
  status: string;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  slideCount: number;
  briefId: string | null;
  briefName: string | null;
  pitchLensId: string | null;
  pitchLensName: string | null;
  isPublic: boolean;
}

interface PresentationsState {
  presentations: PresentationListItem[];
  isLoading: boolean;
  error: string | null;

  loadPresentations: () => Promise<void>;
  deletePresentation: (id: string) => Promise<void>;
  duplicatePresentation: (id: string) => Promise<void>;
  renamePresentation: (id: string, title: string) => Promise<void>;
  forkPresentation: (id: string, overrides?: { briefId?: string; pitchLensId?: string; title?: string }) => Promise<string | null>;
  toggleVisibility: (id: string, isPublic: boolean) => Promise<void>;
  clearError: () => void;
}

export const usePresentationsStore = create<PresentationsState>((set, get) => ({
  presentations: [],
  isLoading: false,
  error: null,

  async loadPresentations() {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<PresentationListItem[]>('/presentations');
      set({ presentations: data, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load presentations';
      set({ error: msg, isLoading: false });
    }
  },

  async deletePresentation(id: string) {
    try {
      await api.delete(`/presentations/${id}`);
      set((state) => ({
        presentations: state.presentations.filter((p) => p.id !== id),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to delete';
      set({ error: msg });
    }
  },

  async duplicatePresentation(id: string) {
    try {
      const dup = await api.post<PresentationListItem>(`/presentations/${id}/duplicate`);
      set((state) => ({
        presentations: [dup, ...state.presentations],
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to duplicate';
      set({ error: msg });
    }
  },

  async renamePresentation(id: string, title: string) {
    try {
      await api.patch(`/presentations/${id}`, { title });
      set((state) => ({
        presentations: state.presentations.map((p) =>
          p.id === id ? { ...p, title } : p,
        ),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to rename';
      set({ error: msg });
    }
  },

  async forkPresentation(id: string, overrides?: { briefId?: string; pitchLensId?: string; title?: string }) {
    try {
      const forked = await api.post<{ id: string }>(`/presentations/${id}/fork`, overrides ?? {});
      // Reload to pick up the new presentation
      get().loadPresentations();
      return forked.id;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fork';
      set({ error: msg });
      return null;
    }
  },

  async toggleVisibility(id: string, isPublic: boolean) {
    try {
      await api.patch(`/presentations/${id}/visibility`, { isPublic });
      set((state) => ({
        presentations: state.presentations.map((p) =>
          p.id === id ? { ...p, isPublic } : p,
        ),
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to update visibility';
      set({ error: msg });
    }
  },

  clearError() {
    set({ error: null });
  },
}));
