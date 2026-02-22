import { create } from 'zustand';

export type WorkflowPhase = 'subject_selection' | 'outline_review' | 'generating' | 'reviewing' | 'editing';

export interface SubjectSuggestion {
  title: string;
  description: string;
  source: 'pitchlens' | 'brief' | 'custom';
}

interface ChatMessage {
  messageType?: string;
  role?: string;
}

/** Valid forward transitions — prevents impossible state jumps */
const VALID_TRANSITIONS: Record<WorkflowPhase, WorkflowPhase[]> = {
  subject_selection: ['outline_review', 'generating', 'editing'],
  outline_review: ['subject_selection', 'generating'],
  generating: ['reviewing', 'editing', 'subject_selection'],
  reviewing: ['editing', 'subject_selection'],
  editing: ['subject_selection', 'reviewing', 'generating'],
};

interface WorkflowState {
  phase: WorkflowPhase;
  subjectSuggestions: SubjectSuggestion[];
  suggestionCache: Map<string, SubjectSuggestion[]>;
  setPhase: (phase: WorkflowPhase) => void;
  setSubjectSuggestions: (s: SubjectSuggestion[]) => void;
  cacheSuggestions: (key: string, s: SubjectSuggestion[]) => void;
  getCachedSuggestions: (key: string) => SubjectSuggestion[] | undefined;
  restoreFromState: (messages: ChatMessage[], slideCount: number, hasPendingOutline: boolean) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  phase: 'subject_selection',
  subjectSuggestions: [],
  suggestionCache: new Map(),

  setPhase: (phase) => {
    const current = get().phase;
    if (current === phase) return;
    const allowed = VALID_TRANSITIONS[current];
    if (!allowed.includes(phase)) {
      console.warn(`[Workflow] Invalid phase transition: ${current} → ${phase} (allowed: ${allowed.join(', ')})`);
      // Allow it anyway but log — don't block UX
    }
    set({ phase });
  },

  setSubjectSuggestions: (subjectSuggestions) => set({ subjectSuggestions }),

  cacheSuggestions: (key, suggestions) => {
    const cache = get().suggestionCache;
    cache.set(key, suggestions);
    set({ suggestionCache: cache });
  },

  getCachedSuggestions: (key) => {
    return get().suggestionCache.get(key);
  },

  restoreFromState: (messages, slideCount, hasPendingOutline) => {
    // When slides exist AND there's a saved review state, resume review instead of editing
    if (slideCount > 0) {
      try {
        const savedReview = sessionStorage.getItem('pitchable-review-state');
        if (savedReview) {
          const parsed = JSON.parse(savedReview);
          if (parsed && Array.isArray(parsed.approvedSlides) && parsed.approvedSlides.length < slideCount) {
            // Not all slides approved — resume review
            set({ phase: 'reviewing' });
            return;
          }
        }
      } catch { /* fall through to editing */ }
      set({ phase: 'editing' });
      return;
    }
    if (hasPendingOutline) {
      set({ phase: 'outline_review' });
      return;
    }
    const hasOutline = messages.some((m) => m.messageType === 'outline');
    if (hasOutline) {
      set({ phase: 'outline_review' });
      return;
    }
    set({ phase: 'subject_selection' });
  },

  // reset clears display state but preserves suggestionCache
  reset: () => set({ phase: 'subject_selection', subjectSuggestions: [] }),
}));
