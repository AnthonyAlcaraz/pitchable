import { create } from 'zustand';
import { api } from '../lib/api.js';

export interface FigmaTemplateMapping {
  id: string;
  templateId: string;
  slideType: string;
  figmaNodeId: string;
  figmaNodeName: string | null;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface FigmaTemplateListItem {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  figmaFileKey: string;
  figmaFileName: string | null;
  thumbnailUrl: string | null;
  isPublic: boolean;
  mappingCount: number;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FigmaTemplateDetail extends FigmaTemplateListItem {
  mappings: FigmaTemplateMapping[];
}

export interface CreateFigmaTemplateInput {
  name: string;
  description?: string;
  figmaFileKey: string;
}

export interface MapFrameInput {
  slideType: string;
  figmaNodeId: string;
}

interface FigmaTemplateState {
  templates: FigmaTemplateListItem[];
  currentTemplate: FigmaTemplateDetail | null;
  isLoading: boolean;
  error: string | null;

  loadTemplates: () => Promise<void>;
  loadTemplate: (id: string) => Promise<void>;
  createTemplate: (input: CreateFigmaTemplateInput) => Promise<string>;
  deleteTemplate: (id: string) => Promise<void>;
  mapFrame: (templateId: string, input: MapFrameInput) => Promise<void>;
  unmapFrame: (templateId: string, slideType: string) => Promise<void>;
  autoMap: (templateId: string) => Promise<{ mapped: number }>;
  refreshThumbnails: (templateId: string) => Promise<void>;
  clearError: () => void;
}

export const useFigmaTemplateStore = create<FigmaTemplateState>((set, get) => ({
  templates: [],
  currentTemplate: null,
  isLoading: false,
  error: null,

  async loadTemplates() {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<FigmaTemplateListItem[]>('/figma/templates');
      set({ templates: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load', isLoading: false });
    }
  },

  async loadTemplate(id: string) {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<FigmaTemplateDetail>(`/figma/templates/${id}`);
      set({ currentTemplate: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load', isLoading: false });
    }
  },

  async createTemplate(input: CreateFigmaTemplateInput) {
    const data = await api.post<FigmaTemplateListItem>('/figma/templates', input);
    set((state) => ({ templates: [data, ...state.templates] }));
    return data.id;
  },

  async deleteTemplate(id: string) {
    await api.delete(`/figma/templates/${id}`);
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== id),
      currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate,
    }));
  },

  async mapFrame(templateId: string, input: MapFrameInput) {
    const mapping = await api.post<FigmaTemplateMapping>(
      `/figma/templates/${templateId}/map`,
      input,
    );
    // Refresh current template to get updated mappings
    const { currentTemplate } = get();
    if (currentTemplate?.id === templateId) {
      const updated = await api.get<FigmaTemplateDetail>(`/figma/templates/${templateId}`);
      set({ currentTemplate: updated });
    }
  },

  async unmapFrame(templateId: string, slideType: string) {
    await api.delete(`/figma/templates/${templateId}/map/${slideType}`);
    const { currentTemplate } = get();
    if (currentTemplate?.id === templateId) {
      set({
        currentTemplate: {
          ...currentTemplate,
          mappings: currentTemplate.mappings.filter((m) => m.slideType !== slideType),
          mappingCount: currentTemplate.mappingCount - 1,
        },
      });
    }
  },

  async autoMap(templateId: string) {
    const result = await api.post<{ mapped: number }>(`/figma/templates/${templateId}/auto-map`);
    // Refresh current template
    const { currentTemplate } = get();
    if (currentTemplate?.id === templateId) {
      const updated = await api.get<FigmaTemplateDetail>(`/figma/templates/${templateId}`);
      set({ currentTemplate: updated });
    }
    return result;
  },

  async refreshThumbnails(templateId: string) {
    await api.post(`/figma/templates/${templateId}/refresh`);
    // Refresh current template
    const { currentTemplate } = get();
    if (currentTemplate?.id === templateId) {
      const updated = await api.get<FigmaTemplateDetail>(`/figma/templates/${templateId}`);
      set({ currentTemplate: updated });
    }
  },

  clearError() {
    set({ error: null });
  },
}));

export default useFigmaTemplateStore;
