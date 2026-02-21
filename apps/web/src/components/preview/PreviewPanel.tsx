import { useEffect, useState, useCallback, useRef } from 'react';
import { PeachLogo } from '@/components/icons/PeachLogo';
import { Download, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { usePresentationStore } from '@/stores/presentation.store';
import { useChatStore } from '@/stores/chat.store';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useSlideUpdates } from '@/hooks/useSlideUpdates';
import { ThumbnailSidebar } from './ThumbnailSidebar';
import { SlideHeader } from './SlideHeader';
import { PresentationMode } from './PresentationMode';
import { EditableSlide } from './EditableSlide';
import { NarrativeAdvice } from './NarrativeAdvice';
import { api } from '@/lib/api';

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
  const updateSlide = usePresentationStore((s) => s.updateSlide);

  const slides = presentation?.slides ?? [];
  const currentSlide = slides[currentSlideIndex];

  const handleExport = useCallback((format: string) => {
    if (presentationId) {
      sendMessage(presentationId, `/export ${format}`);
    }
  }, [presentationId, sendMessage]);

  const handleSaveSpeakerNotes = useCallback(async (value: string) => {
    if (!currentSlide || !presentationId) return;
    updateSlide(currentSlide.id, { speakerNotes: value });
    try {
      await api.patch(`/presentations/${presentationId}/slides/${currentSlide.id}`, {
        speakerNotes: value,
      });
    } catch (err) {
      updateSlide(currentSlide.id, { speakerNotes: currentSlide.speakerNotes });
      console.error('Failed to save speaker notes:', err);
    }
  }, [currentSlide, presentationId, updateSlide]);

  // Auto-scroll right panel when slide changes
  const mainContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentSlideIndex]);

  // Inline export dropdown state
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showExportMenu) return;
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

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

  // No slides yet — show phase-aware guidance
  const phase = useWorkflowStore((s) => s.phase);

  if (slides.length === 0) {
    const phaseContent = {
      subject_selection: {
        icon: <PeachLogo className="h-10 w-10 opacity-50" />,
        title: 'Choose Your Topic',
        subtitle: 'Select a suggested topic or type your own in the chat panel',
      },
      outline_review: {
        icon: <FileText className="h-10 w-10 text-orange-400/70" />,
        title: 'Review Your Outline',
        subtitle: 'Approve the outline in the chat panel to start generating slides',
      },
      generating: {
        icon: <Loader2 className="h-10 w-10 animate-spin text-orange-400" />,
        title: 'Building Your Deck',
        subtitle: 'Slides are being generated — watch progress in the chat panel',
      },
      editing: {
        icon: <PeachLogo className="h-10 w-10 opacity-50" />,
        title: presentation?.title ?? 'Untitled Presentation',
        subtitle: 'No slides yet. Ask the AI to generate an outline to get started.',
      },
    }[phase];

    return (
      <div className="flex h-full flex-col items-center justify-center p-8">
        <div className="mb-4 rounded-2xl border border-border/50 bg-card/50 p-4">
          {phaseContent.icon}
        </div>
        <p className="mb-2 text-center text-sm font-medium text-foreground">
          {phaseContent.title}
        </p>
        <p className="text-center text-sm text-muted-foreground">
          {phaseContent.subtitle}
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

          {/* Main slide view — scrollable with preview + editable + coaching */}
          <div ref={mainContentRef} className="flex-1 overflow-y-auto bg-muted/20 p-6">
            {currentSlide && (
              <div className="mx-auto w-full max-w-5xl space-y-4">
                {/* Final Result — exported slide image, or placeholder */}
                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">Final Result</p>
                  {currentSlide.previewUrl ? (
                    <div className="overflow-hidden rounded-lg border border-border shadow-sm" style={{ aspectRatio: '16/9' }}>
                      <img
                        src={`/slides/${currentSlide.id}/preview?t=${Date.now()}`}
                        alt={`Slide ${currentSlide.slideNumber} preview`}
                        className="h-full w-full object-contain bg-black"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          target.parentElement?.classList.add('preview-fallback');
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50" style={{ aspectRatio: '16/9' }}>
                      <PeachLogo className="mb-3 h-12 w-12 opacity-30" />
                      <p className="text-sm text-muted-foreground">Export to see final result</p>
                      <p className="mt-1 text-xs text-muted-foreground/60">PDF or PowerPoint with images &amp; backgrounds</p>
                    </div>
                  )}
                </div>

                {/* Editable slide + export button */}
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Edit</p>
                    <div className="relative" ref={exportMenuRef}>
                      <button
                        onClick={() => setShowExportMenu((v) => !v)}
                        className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2.5 py-1 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/20"
                      >
                        <Download className="h-3 w-3" />
                        Export
                        <ChevronDown className="h-3 w-3" />
                      </button>
                      {showExportMenu && (
                        <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-popover py-1 shadow-md">
                          {(['pdf', 'pptx', 'pdf-figma', 'pptx-figma', 'html'] as const).map((fmt) => (
                            <button
                              key={fmt}
                              onClick={() => { handleExport(fmt); setShowExportMenu(false); }}
                              className="flex w-full items-center px-3 py-1.5 text-left text-sm text-popover-foreground transition-colors hover:bg-accent"
                            >
                              {fmt === 'pdf' ? 'PDF' : fmt === 'pptx' ? 'PowerPoint' : fmt === 'pdf-figma' ? 'PDF (Figma)' : fmt === 'pptx-figma' ? 'PPTX (Figma)' : 'HTML'}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <EditableSlide slide={currentSlide} presentationId={presentationId!} theme={presentation?.theme} />
                </div>

                {/* Speaker notes + Narrative coaching */}
                <NarrativeAdvice
                  slideType={currentSlide.slideType}
                  speakerNotes={currentSlide.speakerNotes}
                  onSaveSpeakerNotes={handleSaveSpeakerNotes}
                />
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
