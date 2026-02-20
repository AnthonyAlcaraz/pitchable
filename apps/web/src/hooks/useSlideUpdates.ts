import { useEffect } from 'react';
import { getSocket, joinPresentation, leavePresentation } from '../lib/socket.js';
import { usePresentationStore } from '../stores/presentation.store.js';
import { useChatStore } from '../stores/chat.store.js';
import type { SlideData } from '../stores/presentation.store.js';

interface SlideAddedEvent {
  presentationId: string;
  slide: SlideData;
  position: number;
}

interface SlideUpdateEvent {
  presentationId: string;
  slideId: string;
  data: Partial<SlideData>;
}

interface SlideRemovedEvent {
  presentationId: string;
  slideId: string;
}

interface SlideReorderedEvent {
  presentationId: string;
  slideIds: string[];
}

interface ThemeChangedEvent {
  presentationId: string;
  themeId: string;
}

interface ImageSelectionRequestEvent {
  presentationId: string;
  slideId: string;
  contextId: string;
  candidates: Array<{ id: string; imageUrl: string; score: number; prompt: string }>;
  defaultImageId: string;
  timeoutMs: number;
}

export function useSlideUpdates(presentationId: string | undefined) {
  const addSlide = usePresentationStore((s) => s.addSlide);
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const removeSlide = usePresentationStore((s) => s.removeSlide);
  const reorderSlides = usePresentationStore((s) => s.reorderSlides);
  const setTheme = usePresentationStore((s) => s.setTheme);
  const addImageSelection = useChatStore((s) => s.addImageSelection);

  useEffect(() => {
    if (!presentationId) return;

    const socket = getSocket();
    joinPresentation(presentationId);

    const handleSlideAdded = (event: SlideAddedEvent) => {
      addSlide(event.slide);
    };

    const handleSlideUpdated = (event: SlideUpdateEvent) => {
      updateSlide(event.slideId, event.data);
    };

    const handleSlideRemoved = (event: SlideRemovedEvent) => {
      removeSlide(event.slideId);
    };

    const handleSlideReordered = (event: SlideReorderedEvent) => {
      reorderSlides(event.slideIds);
    };

    const handleThemeChanged = (event: ThemeChangedEvent) => {
      setTheme(event.themeId);
    };

    const handleImageSelectionRequest = (event: ImageSelectionRequestEvent) => {
      addImageSelection({
        contextId: event.contextId,
        slideId: event.slideId,
        candidates: event.candidates,
        defaultImageId: event.defaultImageId,
        timeoutMs: event.timeoutMs,
        receivedAt: Date.now(),
      });
    };

    socket.on('slide:added', handleSlideAdded);
    socket.on('slide:updated', handleSlideUpdated);
    socket.on('slide:removed', handleSlideRemoved);
    socket.on('slide:reordered', handleSlideReordered);
    socket.on('presentation:themeChanged', handleThemeChanged);
    socket.on('image:selectionRequest', handleImageSelectionRequest);

    return () => {
      socket.off('slide:added', handleSlideAdded);
      socket.off('slide:updated', handleSlideUpdated);
      socket.off('slide:removed', handleSlideRemoved);
      socket.off('slide:reordered', handleSlideReordered);
      socket.off('presentation:themeChanged', handleThemeChanged);
      socket.off('image:selectionRequest', handleImageSelectionRequest);
      leavePresentation(presentationId);
    };
  }, [presentationId, addSlide, updateSlide, removeSlide, reorderSlides, setTheme, addImageSelection]);
}
