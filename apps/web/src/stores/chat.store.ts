import { create } from 'zustand';
import { api } from '../lib/api.js';
import { streamSse } from '../lib/sse.js';
import { usePresentationStore } from './presentation.store.js';
import { useWorkflowStore } from './workflow.store.js';
import { useAuthStore } from './auth.store.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PendingValidation {
  slideId: string;
  slideNumber: number;
  title: string;
  body: string;
  speakerNotes: string;
  slideType: string;
  reviewPassed: boolean;
}

export interface InlineSlideCard {
  id: string;
  slideNumber: number;
  title: string;
  body: string;
  slideType: string;
  imageUrl: string | null;
}

export interface PendingThemeSelection {
  contextId: string;
  options: Array<{
    id: string;
    name: string;
    displayName: string;
    colorPalette: Record<string, string>;
    headingFont: string;
    bodyFont: string;
    score: number;
    category: string;
  }>;
  defaultThemeId: string;
  timeoutMs: number;
  receivedAt: number;
}

export interface PendingLayoutSelection {
  contextId: string;
  slideNumber: number;
  slideTitle: string;
  options: Array<{
    id: string;
    name: string;
    description: string;
    slideType: string;
  }>;
  defaultLayout: string;
  timeoutMs: number;
  receivedAt: number;
}

export interface PendingImageSelection {
  contextId: string;
  slideId: string;
  candidates: Array<{
    id: string;
    imageUrl: string;
    score: number;
    prompt: string;
  }>;
  defaultImageId: string;
  timeoutMs: number;
  receivedAt: number;
}

export interface GenerationCompleteData {
  presentationId: string;
  deckTitle: string;
  slideCount: number;
  themeName: string;
  imageCount: number;
  isSamplePreview?: boolean;
}

export interface AgentStep {
  id: string;
  content: string;
  status: 'running' | 'complete' | 'error';
  current?: number;
  total?: number;
  label?: string;
  startedAt: number;
  completedAt?: number;
}

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  thinkingText: string | null;
  agentSteps: AgentStep[];
  isLoading: boolean;
  error: string | null;
  pendingValidations: PendingValidation[];
  pendingCreditConfirmation: null;
  inlineSlideCards: InlineSlideCard[];
  pendingThemeSelection: PendingThemeSelection | null;
  pendingLayoutSelections: PendingLayoutSelection[];
  pendingImageSelections: PendingImageSelection[];
  generationComplete: GenerationCompleteData | null;

  loadHistory: (presentationId: string) => Promise<void>;
  sendMessage: (presentationId: string, content: string, opts?: { briefId?: string; lensId?: string }) => Promise<void>;
  acceptSlide: (presentationId: string, slideId: string) => Promise<void>;
  editSlide: (presentationId: string, slideId: string, edits: { title?: string; body?: string; speakerNotes?: string }) => Promise<void>;
  rejectSlide: (presentationId: string, slideId: string) => Promise<void>;
  respondToInteraction: (presentationId: string, interactionType: string, contextId: string, selection: unknown) => Promise<void>;
  addImageSelection: (selection: PendingImageSelection) => void;
  removeImageSelection: (contextId: string) => void;
  addOrUpdateAgentStep: (id: string, content: string, status: AgentStep['status'], extra?: Partial<AgentStep>) => void;
  clearMessages: () => void;
  clearError: () => void;
}

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

export const useChatStore = create<ChatState>((set, get) => ({
  messages: [],
  isStreaming: false,
  streamingContent: '',
  thinkingText: null,
  agentSteps: [],
  isLoading: false,
  error: null,
  pendingValidations: [],
  pendingCreditConfirmation: null,
  inlineSlideCards: [],
  pendingThemeSelection: null,
  pendingLayoutSelections: [],
  pendingImageSelections: [],
  generationComplete: null,

  loadHistory: async (presentationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ messages: ChatMessage[]; hasMore: boolean; hasPendingOutline?: boolean }>(
        `/chat/${presentationId}/history`,
      );
      // Backend returns { messages, hasMore, hasPendingOutline } — unwrap to array
      const msgs = Array.isArray(res) ? res : (res.messages ?? []);
      const hasPendingOutline = !Array.isArray(res) && !!res.hasPendingOutline;
      set({ messages: msgs, isLoading: false });

      // Restore workflow phase from message history + slide count
      const slideCount = usePresentationStore.getState().presentation?.slides?.length ?? 0;
      useWorkflowStore.getState().restoreFromState(msgs, slideCount, hasPendingOutline);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load history',
        isLoading: false,
      });
    }
  },

  sendMessage: async (presentationId: string, content: string, opts?: { briefId?: string; lensId?: string }) => {
    const token = getToken();
    if (!token) {
      set({ error: 'Not authenticated' });
      return;
    }

    // Add user message optimistically
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      messageType: 'text',
      metadata: {},
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      messages: [...state.messages, userMsg],
      isStreaming: true,
      streamingContent: '',
      thinkingText: null,
      agentSteps: [],
      error: null,
      inlineSlideCards: [],
      generationComplete: null,
      pendingThemeSelection: null,
      pendingLayoutSelections: [],
    }));

    try {
      let fullContent = '';

      for await (const event of streamSse(
        `/chat/${presentationId}/message`,
        { content, ...(opts?.briefId && { briefId: opts.briefId }), ...(opts?.lensId && { lensId: opts.lensId }) },
        token,
      )) {
        if (event.type === 'token') {
          fullContent += event.content;
          set({ streamingContent: fullContent });
        } else if (event.type === 'action') {
          // Handle validation requests
          const metadata = event.metadata as Record<string, unknown> | undefined;
          if (metadata?.action === 'validation_request') {
            const validation: PendingValidation = {
              slideId: metadata.slideId as string,
              slideNumber: metadata.slideNumber as number,
              title: metadata.title as string,
              body: metadata.body as string,
              speakerNotes: metadata.speakerNotes as string,
              slideType: metadata.slideType as string,
              reviewPassed: metadata.reviewPassed as boolean,
            };
            set((state) => ({
              pendingValidations: [...state.pendingValidations, validation],
            }));
          } else if (metadata?.action === 'export_ready') {
            const downloadUrl = metadata.downloadUrl as string;
            if (downloadUrl) {
              window.open(downloadUrl, '_blank');
            }
          } else if (metadata?.action === 'presentation_created') {
            // Backend created the presentation — update the URL to use the real ID
            const newId = metadata.presentationId as string;
            if (newId) {
              window.dispatchEvent(new CustomEvent('presentation-created', { detail: { id: newId } }));
            }
          } else if (metadata?.action === 'change_theme') {
            // Reload presentation to pick up the new theme
            const pid = presentationId !== 'new' ? presentationId : undefined;
            if (pid) {
              usePresentationStore.getState().loadPresentation(pid);
            }
          } else if (metadata?.action === 'outline_ready') {
            useWorkflowStore.getState().setPhase('outline_review');
          } else if (metadata?.action === 'slide_preview') {
            const slide = metadata.slide as InlineSlideCard;
            if (slide) {
              set((state) => ({
                inlineSlideCards: [...state.inlineSlideCards, slide],
              }));
              // First slide preview means generation has started
              if (get().inlineSlideCards.length === 0) {
                useWorkflowStore.getState().setPhase('generating');
              }
            }
          } else if (metadata?.action === 'theme_selection') {
            set({
              pendingThemeSelection: {
                contextId: metadata.contextId as string,
                options: metadata.options as PendingThemeSelection['options'],
                defaultThemeId: metadata.defaultThemeId as string,
                timeoutMs: metadata.timeoutMs as number,
                receivedAt: Date.now(),
              },
            });
          } else if (metadata?.action === 'layout_selection') {
            const ls: PendingLayoutSelection = {
              contextId: metadata.contextId as string,
              slideNumber: metadata.slideNumber as number,
              slideTitle: metadata.slideTitle as string,
              options: metadata.options as PendingLayoutSelection['options'],
              defaultLayout: metadata.defaultLayout as string,
              timeoutMs: metadata.timeoutMs as number,
              receivedAt: Date.now(),
            };
            set((state) => ({
              pendingLayoutSelections: [...state.pendingLayoutSelections, ls],
            }));
          } else if (metadata?.action === 'generation_complete') {
            set({
              generationComplete: {
                presentationId: metadata.presentationId as string,
                deckTitle: metadata.deckTitle as string,
                slideCount: metadata.slideCount as number,
                themeName: metadata.themeName as string,
                imageCount: metadata.imageCount as number,
                isSamplePreview: metadata.isSamplePreview as boolean | undefined,
              },
            });
            useWorkflowStore.getState().setPhase('editing');
            // Refresh credit balance after deck generation consumed credits
            useAuthStore.getState().refreshCreditBalance();
          }
        } else if (event.type === 'thinking') {
          set({ thinkingText: event.content });
        } else if (event.type === 'progress') {
          const meta = event.metadata as Record<string, unknown> | undefined;
          const stepId = (meta?.step as string) ?? crypto.randomUUID();
          const status = (meta?.status as 'running' | 'complete' | 'error') ?? 'running';
          set((state) => {
            const existing = state.agentSteps.find((s) => s.id === stepId);
            if (existing) {
              return {
                thinkingText: null,
                agentSteps: state.agentSteps.map((s) =>
                  s.id === stepId
                    ? {
                        ...s,
                        content: event.content,
                        status,
                        current: (meta?.current as number) ?? s.current,
                        total: (meta?.total as number) ?? s.total,
                        label: (meta?.label as string) ?? s.label,
                        completedAt: status === 'complete' && !s.completedAt ? Date.now() : s.completedAt,
                      }
                    : s,
                ),
              };
            }
            return {
              thinkingText: null,
              agentSteps: [
                ...state.agentSteps,
                {
                  id: stepId,
                  content: event.content,
                  status,
                  current: meta?.current as number | undefined,
                  total: meta?.total as number | undefined,
                  label: meta?.label as string | undefined,
                  startedAt: Date.now(),
                  completedAt: status === 'complete' ? Date.now() : undefined,
                },
              ],
            };
          });
        } else if (event.type === 'error') {
          set({ error: event.content, isStreaming: false, thinkingText: null, agentSteps: [] });
          return;
        } else if (event.type === 'done') {
          // Mark any remaining running steps as complete
          set((state) => ({
            agentSteps: state.agentSteps.map((s) =>
              s.status === 'running' ? { ...s, status: 'complete' as const, completedAt: Date.now() } : s,
            ),
          }));
          break;
        }
      }

      // Add assistant message (persist inline slide cards in metadata)
      const currentSlideCards = get().inlineSlideCards;
      const currentCompletion = get().generationComplete;
      if (fullContent) {
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullContent,
          messageType: 'text',
          metadata: {
            ...(currentSlideCards.length > 0 ? { slideCards: currentSlideCards } : {}),
            ...(currentCompletion ? { generationComplete: currentCompletion } : {}),
          },
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, assistantMsg],
          isStreaming: false,
          streamingContent: '',
          thinkingText: null,
          agentSteps: [],
        }));
      } else {
        set({ isStreaming: false, streamingContent: '', thinkingText: null, agentSteps: [] });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Stream failed',
        isStreaming: false,
        streamingContent: '',
        thinkingText: null,
        agentSteps: [],
      });
    }
  },

  acceptSlide: async (presentationId: string, slideId: string) => {
    // Remove from pending validations
    set((state) => ({
      pendingValidations: state.pendingValidations.filter((v) => v.slideId !== slideId),
    }));

    // Send acceptance to backend
    await get().sendMessage(presentationId, 'accept');
  },

  editSlide: async (presentationId: string, slideId: string, edits: { title?: string; body?: string; speakerNotes?: string }) => {
    // Remove from pending validations
    set((state) => ({
      pendingValidations: state.pendingValidations.filter((v) => v.slideId !== slideId),
    }));

    // Send structured edit to backend
    const payload = JSON.stringify({
      action: 'edit',
      slideId,
      editedContent: edits,
    });
    await get().sendMessage(presentationId, payload);
  },

  rejectSlide: async (presentationId: string, slideId: string) => {
    // Remove from pending validations
    set((state) => ({
      pendingValidations: state.pendingValidations.filter((v) => v.slideId !== slideId),
    }));

    // Send rejection to backend
    await get().sendMessage(presentationId, 'reject');
  },

  respondToInteraction: async (presentationId: string, interactionType: string, contextId: string, selection: unknown) => {
    // Optimistically clear the UI for this interaction
    if (interactionType === 'theme_selection') {
      set({ pendingThemeSelection: null });
    } else if (interactionType === 'layout_selection') {
      set((state) => ({
        pendingLayoutSelections: state.pendingLayoutSelections.filter((s) => s.contextId !== contextId),
      }));
    } else if (interactionType === 'image_selection') {
      set((state) => ({
        pendingImageSelections: state.pendingImageSelections.filter((s) => s.contextId !== contextId),
      }));
    }

    try {
      await api.post(`/chat/${presentationId}/interact`, {
        interactionType,
        contextId,
        selection,
      });
      // Refresh credit balance after image selection (costs 1 credit)
      if (interactionType === 'image_selection') {
        void useAuthStore.getState().refreshCreditBalance();
      }
    } catch (err) {
      console.error('Failed to respond to interaction:', err);
    }
  },

  addImageSelection: (selection: PendingImageSelection) => {
    set((state) => ({
      pendingImageSelections: [...state.pendingImageSelections, selection],
    }));
  },

  removeImageSelection: (contextId: string) => {
    set((state) => ({
      pendingImageSelections: state.pendingImageSelections.filter((s) => s.contextId !== contextId),
    }));
  },

  addOrUpdateAgentStep: (id: string, content: string, status: AgentStep['status'], extra?: Partial<AgentStep>) => {
    set((state) => {
      const existing = state.agentSteps.find((s) => s.id === id);
      if (existing) {
        return {
          agentSteps: state.agentSteps.map((s) =>
            s.id === id
              ? { ...s, content, status, ...extra, completedAt: status === 'complete' ? Date.now() : s.completedAt }
              : s,
          ),
        };
      }
      return {
        agentSteps: [
          ...state.agentSteps,
          { id, content, status, startedAt: Date.now(), ...extra },
        ],
      };
    });
  },

  clearMessages: () => set({
    messages: [],
    streamingContent: '',
    pendingValidations: [],
    inlineSlideCards: [],
    generationComplete: null,
    pendingThemeSelection: null,
    pendingLayoutSelections: [],
    pendingImageSelections: [],
  }),
  clearError: () => set({ error: null }),
}));
