import { create } from 'zustand';
import { api } from '../lib/api.js';

export interface FrameworkSummary {
  id: string;
  name: string;
  shortDescription: string;
  slideStructure: string[];
  idealSlideRange: { min: number; max: number };
}

export interface PitchLensListItem {
  id: string;
  name: string;
  description: string | null;
  audienceType: string;
  pitchGoal: string;
  industry: string;
  companyStage: string;
  toneStyle: string;
  technicalLevel: string;
  selectedFramework: string;
  isDefault: boolean;
  presentationCount: number;
  backgroundImageFrequency: number;
  sidePanelImageFrequency: number;
  accentColorDiversity: boolean;
  framework?: FrameworkSummary;
  createdAt: string;
  updatedAt: string;
}

export interface PitchLensDetail extends PitchLensListItem {
  customGuidance: string | null;
  frameworkOverridden: boolean;
  presentations: Array<{
    id: string;
    title: string;
    status: string;
    presentationType: string;
    updatedAt: string;
  }>;
}

export interface FrameworkRecommendation {
  framework: FrameworkSummary & {
    detailedGuidance: string;
    bestFor: string[];
    bestForGoals: string[];
  };
  score: number;
  reasons: string[];
}

export interface CreatePitchLensInput {
  name: string;
  description?: string;
  audienceType: string;
  pitchGoal: string;
  industry: string;
  companyStage: string;
  toneStyle: string;
  technicalLevel: string;
  selectedFramework: string;
  customGuidance?: string;
  showSectionLabels?: boolean;
  accentColorDiversity?: boolean;
  showOutlineSlide?: boolean;
  isDefault?: boolean;
  figmaFileKey?: string;
  figmaAccessToken?: string;
  figmaTemplateId?: string;
  backgroundImageFrequency?: number;
  sidePanelImageFrequency?: number;
}

interface PitchLensState {
  lenses: PitchLensListItem[];
  currentLens: PitchLensDetail | null;
  recommendations: FrameworkRecommendation[];
  allFrameworks: FrameworkSummary[];
  isLoading: boolean;
  error: string | null;

  loadLenses: () => Promise<void>;
  loadLens: (id: string) => Promise<void>;
  createLens: (input: CreatePitchLensInput) => Promise<string>;
  updateLens: (id: string, input: Partial<CreatePitchLensInput>) => Promise<void>;
  deleteLens: (id: string) => Promise<void>;
  setDefault: (id: string) => Promise<void>;
  getRecommendations: (input: {
    audienceType: string;
    pitchGoal: string;
    companyStage: string;
    technicalLevel: string;
  }) => Promise<void>;
  loadFrameworks: () => Promise<void>;
  clearError: () => void;
}

export const usePitchLensStore = create<PitchLensState>((set) => ({
  lenses: [],
  currentLens: null,
  recommendations: [],
  allFrameworks: [],
  isLoading: false,
  error: null,

  async loadLenses() {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<PitchLensListItem[]>('/pitch-lens');
      set({ lenses: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load', isLoading: false });
    }
  },

  async loadLens(id: string) {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<PitchLensDetail>(`/pitch-lens/${id}`);
      set({ currentLens: data, isLoading: false });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'Failed to load', isLoading: false });
    }
  },

  async createLens(input: CreatePitchLensInput) {
    const data = await api.post<PitchLensListItem>('/pitch-lens', input);
    set((state) => ({ lenses: [data, ...state.lenses] }));
    return data.id;
  },

  async updateLens(id: string, input: Partial<CreatePitchLensInput>) {
    const data = await api.patch<PitchLensListItem>(`/pitch-lens/${id}`, input);
    set((state) => ({
      lenses: state.lenses.map((l) => (l.id === id ? { ...l, ...data } : l)),
      currentLens: state.currentLens?.id === id ? { ...state.currentLens, ...data } : state.currentLens,
    }));
  },

  async deleteLens(id: string) {
    await api.delete(`/pitch-lens/${id}`);
    set((state) => ({
      lenses: state.lenses.filter((l) => l.id !== id),
      currentLens: state.currentLens?.id === id ? null : state.currentLens,
    }));
  },

  async setDefault(id: string) {
    await api.post(`/pitch-lens/${id}/set-default`);
    set((state) => ({
      lenses: state.lenses.map((l) => ({
        ...l,
        isDefault: l.id === id,
      })),
    }));
  },

  async getRecommendations(input) {
    const data = await api.post<FrameworkRecommendation[]>('/pitch-lens/recommend', input);
    set({ recommendations: data });
  },

  async loadFrameworks() {
    const data = await api.get<FrameworkSummary[]>('/pitch-lens/frameworks');
    set({ allFrameworks: data });
  },

  clearError() {
    set({ error: null });
  },
}));

export default usePitchLensStore;
