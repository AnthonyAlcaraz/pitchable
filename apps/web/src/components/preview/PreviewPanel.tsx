import { useEffect, useState, useCallback } from 'react';
import { PeachLogo } from '@/components/icons/PeachLogo';
import { usePresentationStore } from '@/stores/presentation.store';
import { useChatStore } from '@/stores/chat.store';
import { useSlideUpdates } from '@/hooks/useSlideUpdates';
import { ThumbnailSidebar } from './ThumbnailSidebar';
import { SlideHeader } from './SlideHeader';
import { PresentationMode } from './PresentationMode';
import { EditableSlide } from './EditableSlide';

interface PreviewPanelProps {
  presentationId?: string;
}

export function PreviewPanel({ presentationId }: PreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const presentation = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const isLoading = usePresentationStore((s) => s.isLoading);
  const loadPresentation = usePresentationStore((s) => s.loadPresentation);
  const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  const nextSlide = usePresentationStore((s) => s.nextSlide);
  const previousSlide = usePresentationStore((s) => s.previousSlide);

  // Subscribe to real-time slide updates
  useSlideUpdates(presentationId);

  // Load presentation on mount (skip for 'new' presentations)
  useEffect(() => {
    if (presentationId && presentationId !== 'new') {
      loadPresentation(presentationId);
    }
  }, [presentationId, loadPresentation]);

  // Keyboard navigation
  useEffect(() => {
    if (isFullscreen) return; // PresentationMode handles its own keys

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if no input/textarea is focused
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextSlide();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        previousSlide();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, nextSlide, previousSlide]);

  const handleFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  const handleExitFullscreen = useCallback(() => {
    setIsFullscreen(false);
  }, []);

  const sendMessage = useChatStore((s) => s.sendMessage);

  const handleExport = useCallback((format: string) => {
    if (presentationId) {
      sendMessage(presentationId, `/export ${format}`);
    }
  }, [presentationId, sendMessage]);

  const slides = presentation?.slides ?? [];
  const currentSlide = slides[currentSlideIndex];

  // Empty state
  if (!presentationId || presentationId === 'new') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="relative mb-5">
          <div className="absolute inset-0 rounded-full bg-orange-500/10 blur-2xl" />
          <div className="relative rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
            <PeachLogo className="h-16 w-16 opacity-60" />
          </div>
        </div>
        <p className="text-center text-sm font-medium text-foreground/70">
          Your slides will appear here
        </p>
        <p className="mt-1 text-center text-xs text-muted-foreground">
          Start a conversation to generate slides in real-time
        </p>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // No slides yet
  if (slides.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="mb-4 rounded-2xl border border-border/50 bg-card/50 p-4">
          <PeachLogo className="h-10 w-10 opacity-50" />
        </div>
        <p className="mb-2 text-center text-sm font-medium text-foreground">
          {presentation?.title ?? 'Untitled Presentation'}
        </p>
        <p className="text-center text-sm text-muted-foreground">
          No slides yet. Ask the AI to generate an outline to get started.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex h-full flex-col">
        {/* Header with navigation */}
        <SlideHeader
          title={presentation?.title ?? 'Untitled'}
          currentSlide={currentSlideIndex + 1}
          totalSlides={slides.length}
          onPrevious={previousSlide}
          onNext={nextSlide}
          onFullscreen={handleFullscreen}
          onExport={handleExport}
        />

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Thumbnail sidebar */}
          <ThumbnailSidebar
            slides={slides}
            currentIndex={currentSlideIndex}
            onSelect={setCurrentSlide}
            theme={presentation?.theme}
          />

          {/* Main slide view */}
          <div className="flex flex-1 items-center justify-center bg-muted/20 p-6">
            {currentSlide && (
              <div className="w-full max-w-2xl">
                <EditableSlide slide={currentSlide} presentationId={presentationId!} theme={presentation?.theme} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen presentation mode */}
      {isFullscreen && (
        <PresentationMode
          slides={slides}
          currentIndex={currentSlideIndex}
          onNavigate={setCurrentSlide}
          onExit={handleExitFullscreen}
          theme={presentation?.theme}
        />
      )}
    </>
  );
}
