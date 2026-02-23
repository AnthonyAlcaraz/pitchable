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
  healthScore?: number;
  healthIssues?: Array<{ rule: string; severity: string; message: string }>;
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

export interface ReviewState {
  currentStep: number;
  approvedSlides: number[];
}

interface PresentationState {
  presentation: PresentationData | null;
  currentSlideIndex: number;
  isLoading: boolean;
  error: string | null;
  reviewState: ReviewState | null;
  previewCacheBuster: number;

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
  bustPreviewCache: () => void;

  clearPresentation: () => void;
  clearError: () => void;

  // Review flow
  startReview: () => void;
  approveReviewSlide: (index: number) => void;
  approveAllReviewSlides: () => void;
  unapproveSlides: (indices: number[]) => void;
  resetReview: () => void;
}

// Scope review state to the current presentation ID to prevent cross-contamination
function reviewKey(id: string) { return `pitchable-review-${id}`; }

function saveReview(state: { presentation: PresentationData | null }, review: ReviewState) {
  if (!state.presentation) return;
  try { sessionStorage.setItem(reviewKey(state.presentation.id), JSON.stringify(review)); } catch { /* */ }
}

function loadReview(id: string): ReviewState | null {
  try {
    const saved = sessionStorage.getItem(reviewKey(id));
    if (!saved) return null;
    const parsed = JSON.parse(saved) as ReviewState;
    if (parsed && Array.isArray(parsed.approvedSlides) && typeof parsed.currentStep === 'number') {
      return parsed;
    }
  } catch { /* */ }
  return null;
}

function clearReviewStorage(id: string) {
  try { sessionStorage.removeItem(reviewKey(id)); } catch { /* */ }
}

export const usePresentationStore = create<PresentationState>((set, get) => ({
  presentation: null,
  currentSlideIndex: 0,
  isLoading: false,
  error: null,
  reviewState: null,
  previewCacheBuster: Date.now(),

  async loadPresentation(id: string) {
    set({ isLoading: true, error: null });
    try {
      const data = await api.get<PresentationData>(`/presentations/${id}`);
      set({ presentation: data, currentSlideIndex: 0, isLoading: false, previewCacheBuster: Date.now() });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load presentation';
      set({ error: msg, isLoading: false });
    }
  },

  setCurrentSlide(index: number) {
    const { presentation, reviewState } = get();
    if (!presentation) return;
    const clamped = Math.max(0, Math.min(index, presentation.slides.length - 1));
    if (reviewState) {
      const next = { ...reviewState, currentStep: clamped };
      saveReview({ presentation }, next);
      set({ currentSlideIndex: clamped, reviewState: next });
    } else {
      set({ currentSlideIndex: clamped });
    }
  },

  nextSlide() {
    const { currentSlideIndex, presentation, reviewState } = get();
    if (!presentation || currentSlideIndex >= presentation.slides.length - 1) return;
    const next = currentSlideIndex + 1;
    if (reviewState) {
      const nextReview = { ...reviewState, currentStep: next };
      saveReview({ presentation }, nextReview);
      set({ currentSlideIndex: next, reviewState: nextReview });
    } else {
      set({ currentSlideIndex: next });
    }
  },

  previousSlide() {
    const { currentSlideIndex, presentation, reviewState } = get();
    if (currentSlideIndex <= 0) return;
    const prev = currentSlideIndex - 1;
    if (reviewState) {
      const nextReview = { ...reviewState, currentStep: prev };
      saveReview({ presentation }, nextReview);
      set({ currentSlideIndex: prev, reviewState: nextReview });
    } else {
      set({ currentSlideIndex: prev });
    }
  },

  addSlide(slide: SlideData) {
    set((state) => {
      if (!state.presentation) return state;
      // Deduplicate: skip if slide with same ID already exists (WebSocket reconnection)
      if (state.presentation.slides.some((s) => s.id === slide.id)) return state;
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

  bustPreviewCache() {
    set({ previewCacheBuster: Date.now() });
  },

  clearPresentation() {
    set({ presentation: null, currentSlideIndex: 0, isLoading: false, error: null, reviewState: null });
  },

  clearError() {
    set({ error: null });
  },

  startReview() {
    const { presentation } = get();
    if (!presentation) {
      set({ reviewState: { currentStep: 0, approvedSlides: [] }, currentSlideIndex: 0 });
      return;
    }
    // Restore from sessionStorage scoped to this presentation
    const saved = loadReview(presentation.id);
    if (saved) {
      set({ reviewState: saved, currentSlideIndex: saved.currentStep });
      return;
    }
    // Fresh review
    set({ reviewState: { currentStep: 0, approvedSlides: [] }, currentSlideIndex: 0 });
  },

  approveReviewSlide(index: number) {
    set((state) => {
      if (!state.reviewState || !state.presentation) return state;
      const approved = [...state.reviewState.approvedSlides, index];
      const totalSlides = state.presentation.slides.length;
      const nextStep = index + 1 < totalSlides ? index + 1 : index;
      const next = { approvedSlides: approved, currentStep: nextStep };
      saveReview(state, next);
      return { reviewState: next, currentSlideIndex: nextStep };
    });
  },

  approveAllReviewSlides() {
    set((state) => {
      if (!state.presentation) return state;
      const total = state.presentation.slides.length;
      const allApproved = Array.from({ length: total }, (_, i) => i);
      const next = { approvedSlides: allApproved, currentStep: total - 1 };
      saveReview(state, next);
      return { reviewState: next, currentSlideIndex: total - 1 };
    });
  },

  unapproveSlides(indices: number[]) {
    set((state) => {
      if (!state.reviewState || !state.presentation) return state;
      const remaining = state.reviewState.approvedSlides.filter(
        (i) => !indices.includes(i),
      );
      const next = { ...state.reviewState, approvedSlides: remaining };
      saveReview(state, next);
      return { reviewState: next };
    });
  },

  resetReview() {
    const { presentation } = get();
    if (presentation) {
      clearReviewStorage(presentation.id);
    }
    set({ reviewState: null });
  },
}));
