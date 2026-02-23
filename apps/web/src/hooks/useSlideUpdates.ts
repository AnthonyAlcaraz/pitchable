import { useEffect } from 'react';
import { getSocket, joinPresentation, leavePresentation } from '../lib/socket.js';
import type { ExportProgressEvent, GenerationProgressEvent } from '../lib/socket.js';
import { usePresentationStore } from '../stores/presentation.store.js';
import type { SlideVerificationStatus } from '../stores/presentation.store.js';
import { useChatStore } from '../stores/chat.store.js';
import { useWorkflowStore } from '../stores/workflow.store.js';
import { useAuthStore } from '../stores/auth.store.js';

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

interface ImageGeneratedEvent {
  presentationId: string;
  slideId: string;
  imageUrl: string;
}

interface ImagesCompleteEvent {
  presentationId: string;
}

interface ImageSelectionRequestEvent {
  presentationId: string;
  slideId: string;
  contextId: string;
  candidates: Array<{ id: string; imageUrl: string; score: number; prompt: string }>;
  defaultImageId: string;
  timeoutMs: number;
}

interface SlideVerificationEvent {
  presentationId: string;
  slideId: string;
  slideNumber: number;
  status: SlideVerificationStatus;
  score?: number;
}

interface VerificationCompleteEvent {
  presentationId: string;
  passed: boolean;
  metrics: {
    avgStyleScore: number;
    narrativeScore: number;
    avgFactScore: number;
    slidesFixed: number;
  };
}

export function useSlideUpdates(presentationId: string | undefined) {
  const addSlide = usePresentationStore((s) => s.addSlide);
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const removeSlide = usePresentationStore((s) => s.removeSlide);
  const reorderSlides = usePresentationStore((s) => s.reorderSlides);
  const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  const setTheme = usePresentationStore((s) => s.setTheme);
  const addImageSelection = useChatStore((s) => s.addImageSelection);
  const addOrUpdateAgentStep = useChatStore((s) => s.addOrUpdateAgentStep);

  useEffect(() => {
    if (!presentationId || presentationId === 'new') return;

    const socket = getSocket();
    joinPresentation(presentationId);

    const handleSlideAdded = (event: SlideAddedEvent) => {
      addSlide(event.slide);
      // Auto-navigate to the newly added slide
      setCurrentSlide(event.position - 1);
      // Auto-transition to generating phase if first slide arrives during outline review
      const phase = useWorkflowStore.getState().phase;
      if (phase === 'outline_review') {
        useWorkflowStore.getState().setPhase('generating');
      }
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

    const handleImageGenerated = (event: ImageGeneratedEvent) => {
      updateSlide(event.slideId, { imageUrl: event.imageUrl });
    };

    const handleImagesComplete = (_event: ImagesCompleteEvent) => {
      // Backend already regenerated previews with images — bust browser cache so img tags refetch
      usePresentationStore.getState().bustPreviewCache();
      // Refresh credit balance (image generation consumes credits)
      useAuthStore.getState().refreshCreditBalance();
    };

    const handleExportProgress = (event: ExportProgressEvent) => {
      const stepId = `export_${event.step}`;
      const status = event.progress === 100 ? 'complete' : event.progress === -1 ? 'error' : 'running';
      addOrUpdateAgentStep(stepId, event.message, status);

      // Auto-clear after terminal state
      if (event.progress === 100 || event.progress === -1) {
        setTimeout(() => {
          useChatStore.getState().addOrUpdateAgentStep(stepId, event.message, status === 'error' ? 'error' : 'complete');
        }, 2000);
      }
    };

    const handleGenerationProgress = (event: GenerationProgressEvent) => {
      // Only handle image generation progress (step starts with "image-")
      if (!event.step.startsWith('image-')) return;
      const stepId = `image_gen`;
      const status = event.progress === 1 ? 'complete' : 'running';
      const pct = Math.round(event.progress * 100);
      addOrUpdateAgentStep(stepId, event.message, status, { current: pct, total: 100 });
    };

    const handleSlideVerification = (event: SlideVerificationEvent) => {
      if (event.presentationId !== presentationId) return;
      usePresentationStore.getState().setSlideVerification(event.slideId, event.status, event.score);
    };

    const handleVerificationComplete = (event: VerificationCompleteEvent) => {
      if (event.presentationId !== presentationId) return;
      usePresentationStore.getState().setVerificationResult({ passed: event.passed, metrics: event.metrics });
    };

    socket.on('export:progress', handleExportProgress);
    socket.on('generation:progress', handleGenerationProgress);
    socket.on('slide:added', handleSlideAdded);
    socket.on('slide:updated', handleSlideUpdated);
    socket.on('slide:removed', handleSlideRemoved);
    socket.on('slide:reordered', handleSlideReordered);
    socket.on('presentation:themeChanged', handleThemeChanged);
    socket.on('image:generated', handleImageGenerated);
    socket.on('images:complete', handleImagesComplete);
    socket.on('image:selectionRequest', handleImageSelectionRequest);
    socket.on('slide:verification', handleSlideVerification);
    socket.on('verification:complete', handleVerificationComplete);

    return () => {
      socket.off('export:progress', handleExportProgress);
      socket.off('generation:progress', handleGenerationProgress);
      socket.off('slide:added', handleSlideAdded);
      socket.off('slide:updated', handleSlideUpdated);
      socket.off('slide:removed', handleSlideRemoved);
      socket.off('slide:reordered', handleSlideReordered);
      socket.off('presentation:themeChanged', handleThemeChanged);
      socket.off('image:generated', handleImageGenerated);
      socket.off('images:complete', handleImagesComplete);
      socket.off('image:selectionRequest', handleImageSelectionRequest);
      socket.off('slide:verification', handleSlideVerification);
      socket.off('verification:complete', handleVerificationComplete);
      leavePresentation(presentationId);
    };
  }, [presentationId, addSlide, updateSlide, removeSlide, reorderSlides, setCurrentSlide, setTheme, addImageSelection, addOrUpdateAgentStep]);
}
