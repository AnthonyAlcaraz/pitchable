import { create } from 'zustand';
import { api } from '../lib/api.js';
import { streamSse } from '../lib/sse.js';

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

export interface PendingCreditConfirmation {
  imageCount: number;
  creditCost: number;
  currentBalance: number;
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
  pendingCreditConfirmation: PendingCreditConfirmation | null;

  loadHistory: (presentationId: string) => Promise<void>;
  sendMessage: (presentationId: string, content: string) => Promise<void>;
  acceptSlide: (presentationId: string, slideId: string) => Promise<void>;
  editSlide: (presentationId: string, slideId: string, edits: { title?: string; body?: string; speakerNotes?: string }) => Promise<void>;
  rejectSlide: (presentationId: string, slideId: string) => Promise<void>;
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

  loadHistory: async (presentationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get<{ messages: ChatMessage[]; hasMore: boolean }>(
        `/chat/${presentationId}/history`,
      );
      // Backend returns { messages, hasMore } — unwrap to array
      const msgs = Array.isArray(res) ? res : (res.messages ?? []);
      set({ messages: msgs, isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load history',
        isLoading: false,
      });
    }
  },

  sendMessage: async (presentationId: string, content: string) => {
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
    }));

    try {
      let fullContent = '';

      for await (const event of streamSse(
        `/chat/${presentationId}/message`,
        { content },
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
          } else if (metadata?.action === 'credit_confirmation') {
            set({
              pendingCreditConfirmation: {
                imageCount: metadata.imageCount as number,
                creditCost: metadata.creditCost as number,
                currentBalance: metadata.currentBalance as number,
              },
            });
          } else if (metadata?.action === 'export_ready') {
            const downloadUrl = metadata.downloadUrl as string;
            if (downloadUrl) {
              const a = document.createElement('a');
              a.href = downloadUrl;
              a.download = '';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
            }
          } else if (metadata?.action === 'presentation_created') {
            // Backend created the presentation — update the URL to use the real ID
            const newId = metadata.presentationId as string;
            if (newId) {
              window.history.replaceState(null, '', "/workspace/" + newId);
            }
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

      // Add assistant message
      if (fullContent) {
        const assistantMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: fullContent,
          messageType: 'text',
          metadata: {},
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

  clearMessages: () => set({ messages: [], streamingContent: '', pendingValidations: [], pendingCreditConfirmation: null }),
  clearError: () => set({ error: null }),
}));
