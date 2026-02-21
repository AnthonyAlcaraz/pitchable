import { create } from 'zustand';

export type WorkflowPhase = 'subject_selection' | 'outline_review' | 'generating' | 'editing';

export interface SubjectSuggestion {
  title: string;
  description: string;
  source: 'pitchlens' | 'brief' | 'custom';
}

interface ChatMessage {
  messageType?: string;
  role?: string;
}

interface WorkflowState {
  phase: WorkflowPhase;
  subjectSuggestions: SubjectSuggestion[];
  setPhase: (phase: WorkflowPhase) => void;
  setSubjectSuggestions: (s: SubjectSuggestion[]) => void;
  restoreFromState: (messages: ChatMessage[], slideCount: number, hasPendingOutline: boolean) => void;
  reset: () => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  phase: 'subject_selection',
  subjectSuggestions: [],

  setPhase: (phase) => set({ phase }),

  setSubjectSuggestions: (subjectSuggestions) => set({ subjectSuggestions }),

  restoreFromState: (messages, slideCount, hasPendingOutline) => {
    if (slideCount > 0) {
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
    const hasAnyMessage = messages.length > 0;
    if (hasAnyMessage) {
      set({ phase: 'subject_selection' });
      return;
    }
    set({ phase: 'subject_selection' });
  },

  reset: () => set({ phase: 'subject_selection', subjectSuggestions: [] }),
}));
