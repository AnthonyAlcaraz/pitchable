import { create } from 'zustand';
import { api } from '../lib/api.js';

export interface SlideData {
  id: string;
  slideNumber: number;
  title: string;
  body: string;
  speakerNotes: string | null;
  slideType: string;
  imageUrl: string | null;
  imagePrompt: string | null;
  imageSource: 'AI_GENERATED' | 'FIGMA' | 'UPLOADED';
  figmaFileKey: string | null;
  figmaNodeId: string | null;
  figmaNodeName: string | null;
  previewUrl: string | null;
  createdAt: string;
  updatedAt?: string;
  figmaLastSyncAt?: string | null;
  figmaSyncVersion?: number;
}

export interface ThemeData {
  id: string;
  name: string;
  displayName: string;
  colorPalette: Record<string, string>;
  headingFont: string;
  bodyFont: string;
}

export interface PresentationData {
  id: string;
  title: string;
  description: string | null;
  presentationType: string;
  status: string;
  themeId: string;
  theme?: ThemeData | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
  slides: SlideData[];
}

interface PresentationState {
  presentation: PresentationData | null;
  currentSlideIndex: number;
  isLoading: boolean;
  error: string | null;

  loadPresentation: (id: string) => Promise<void>;
  setCurrentSlide: (index: number) => void;
  nextSlide: () => void;
  previousSlide: () => void;

  // Real-time updates from WebSocket
  addSlide: (slide: SlideData) => void;
  updateSlide: (slideId: string, data: Partial<SlideData>) => void;
  removeSlide: (slideId: string) => void;
  reorderSlides: (slideIds: string[]) => void;
  setTheme: (themeId: string) => void;
  setTitle: (title: string) => void;

  clearPresentation: () => void;
  clearError: () => void;
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  presentation: null,
  currentSlideIndex: 0,
  isLoading: false,
  error: null,

  async loadPresentation(id: string) {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<PresentationData>(`/presentations/${id}`);
      set({ presentation: data, currentSlideIndex: 0, isLoading: false });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load presentation';
      set({ error: msg, isLoading: false });
    }
  },

  setCurrentSlide(index: number) {
    const { presentation } = get();
    if (!presentation) return;
    const clamped = Math.max(0, Math.min(index, presentation.slides.length - 1));
    set({ currentSlideIndex: clamped });
  },

  nextSlide() {
    const { currentSlideIndex, presentation } = get();
    if (!presentation) return;
    if (currentSlideIndex < presentation.slides.length - 1) {
      set({ currentSlideIndex: currentSlideIndex + 1 });
    }
  },

  previousSlide() {
    const { currentSlideIndex } = get();
    if (currentSlideIndex > 0) {
      set({ currentSlideIndex: currentSlideIndex - 1 });
    }
  },

  addSlide(slide: SlideData) {
    set((state) => {
      if (!state.presentation) return state;
      const slides = [...state.presentation.slides, slide].sort(
        (a, b) => a.slideNumber - b.slideNumber,
      );
      return {
        presentation: { ...state.presentation, slides },
      };
    });
  },

  updateSlide(slideId: string, data: Partial<SlideData>) {
    set((state) => {
      if (!state.presentation) return state;
      const slides = state.presentation.slides.map((s) =>
        s.id === slideId ? { ...s, ...data } : s,
      );
      return {
        presentation: { ...state.presentation, slides },
      };
    });
  },

  removeSlide(slideId: string) {
    set((state) => {
      if (!state.presentation) return state;
      const slides = state.presentation.slides
        .filter((s) => s.id !== slideId)
        .map((s, i) => ({ ...s, slideNumber: i + 1 }));
      const currentSlideIndex = Math.min(
        state.currentSlideIndex,
        Math.max(0, slides.length - 1),
      );
      return {
        presentation: { ...state.presentation, slides },
        currentSlideIndex,
      };
    });
  },

  reorderSlides(slideIds: string[]) {
    set((state) => {
      if (!state.presentation) return state;
      const slideMap = new Map(state.presentation.slides.map((s) => [s.id, s]));
      const slides = slideIds
        .map((id, i) => {
          const slide = slideMap.get(id);
          return slide ? { ...slide, slideNumber: i + 1 } : null;
        })
        .filter((s): s is SlideData => s !== null);
      return {
        presentation: { ...state.presentation, slides },
      };
    });
  },

  setTheme(themeId: string) {
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: { ...state.presentation, themeId },
      };
    });
  },

  setTitle(title: string) {
    set((state) => {
      if (!state.presentation) return state;
      return {
        presentation: { ...state.presentation, title },
      };
    });
  },

  clearPresentation() {
    set({ presentation: null, currentSlideIndex: 0, isLoading: false, error: null });
  },

  clearError() {
    set({ error: null });
  },
}));
