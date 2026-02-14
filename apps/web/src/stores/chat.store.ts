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

interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  streamingContent: string;
  isLoading: boolean;
  error: string | null;
  pendingValidations: PendingValidation[];

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
  isLoading: false,
  error: null,
  pendingValidations: [],

  loadHistory: async (presentationId: string) => {
    set({ isLoading: true, error: null });
    try {
      const msgs = await api.get<ChatMessage[]>(
        `/chat/${presentationId}/history`,
      );
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
          }
        } else if (event.type === 'error') {
          set({ error: event.content, isStreaming: false });
          return;
        } else if (event.type === 'done') {
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
        }));
      } else {
        set({ isStreaming: false, streamingContent: '' });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Stream failed',
        isStreaming: false,
        streamingContent: '',
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

  clearMessages: () => set({ messages: [], streamingContent: '', pendingValidations: [] }),
  clearError: () => set({ error: null }),
}));
