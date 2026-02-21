import { io, Socket } from 'socket.io-client';

// Event type definitions
export interface SlideUpdateEvent {
  presentationId: string;
  slideId: string;
  data: Record<string, unknown>;
}

export interface SlideAddedEvent {
  presentationId: string;
  slide: Record<string, unknown>;
  position: number;
}

export interface SlideRemovedEvent {
  presentationId: string;
  slideId: string;
}

export interface SlideReorderedEvent {
  presentationId: string;
  slideIds: string[];
}

export interface ThemeChangedEvent {
  presentationId: string;
  themeId: string;
  theme: Record<string, unknown>;
}

export interface GenerationProgressEvent {
  presentationId: string;
  step: string;
  progress: number;
  message: string;
}

export interface DocumentProgressEvent {
  documentId: string;
  step: string;
  progress: number;
  message: string;
}

export interface ExportProgressEvent {
  presentationId: string;
  jobId: string;
  step: string;
  progress: number;
  message: string;
}

let socket: Socket | null = null;

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

export function getSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getToken();
  if (!token) {
    throw new Error('No auth token available for WebSocket connection');
  }

  socket = io(window.location.origin, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });

  socket.on('connect', () => {
    console.log('[socket] connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[socket] disconnected:', reason);
  });

  socket.on('connect_error', (err) => {
    console.warn('[socket] connect error:', err.message);
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinPresentation(presentationId: string): void {
  const s = getSocket();
  s.emit('join:presentation', presentationId);
}

export function leavePresentation(presentationId: string): void {
  if (socket?.connected) {
    socket.emit('leave:presentation', presentationId);
  }
}
