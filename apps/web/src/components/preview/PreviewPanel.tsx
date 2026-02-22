import { useEffect, useState, useCallback, useRef } from 'react';
import { PeachLogo } from '@/components/icons/PeachLogo';
import { Download, ChevronDown, FileText, Loader2 } from 'lucide-react';
import { usePresentationStore } from '@/stores/presentation.store';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useSlideUpdates } from '@/hooks/useSlideUpdates';
import { ThumbnailSidebar } from './ThumbnailSidebar';
import { SlideHeader } from './SlideHeader';
import { PresentationMode } from './PresentationMode';
import { EditableSlide } from './EditableSlide';
import { NarrativeAdvice } from './NarrativeAdvice';
import { SlideReviewFlow } from './SlideReviewFlow';
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

  // Must be called unconditionally (Rules of Hooks)
  const phase = useWorkflowStore((s) => s.phase);
  const setPhase = useWorkflowStore((s) => s.setPhase);
  const reviewState = usePresentationStore((s) => s.reviewState);
  const resetReview = usePresentationStore((s) => s.resetReview);

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

  const handleFinishReview = useCallback(() => {
    resetReview();
    setPhase('editing');
  }, [resetReview, setPhase]);

  const updateSlide = usePresentationStore((s) => s.updateSlide);

  const slides = presentation?.slides ?? [];
  const currentSlide = slides[currentSlideIndex];

  const handleExport = useCallback(async (format: string) => {
    if (!presentationId) return;
    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(
        '<html><body style="background:#0f0f1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">' +
        '<div style="text-align:center"><p style="font-size:1.2rem">Preparing your export...</p><p style="color:#888">This may take a moment.</p></div></body></html>',
      );
    }
    try {
      const formatMap: Record<string, string> = {
        pdf: 'PDF', pptx: 'PPTX', html: 'REVEAL_JS',
        'pdf-figma': 'PDF', 'pptx-figma': 'PPTX',
      };
      const exportFormat = formatMap[format] || 'PPTX';
      const jobs = await api.post<Array<{ id: string; format: string; status: string }>>(
        `/presentations/${presentationId}/export`,
        { formats: [exportFormat] },
      );
      const jobId = jobs[0]?.id;
      if (!jobId) throw new Error('No export job created');
      for (let i = 0; i < 90; i++) {
        const job = await api.get<{ status: string }>(`/exports/${jobId}`);
        if (job.status === 'COMPLETED') break;
        if (job.status === 'FAILED') throw new Error('Export failed');
        await new Promise((r) => setTimeout(r, 2000));
      }
      // Use authenticated endpoint to get presigned download URL
      const dl = await api.get<{ url: string; filename: string }>(`/exports/${jobId}/download-url`);
      if (newTab) {
        if (dl.url.startsWith('http')) {
          newTab.location.href = dl.url;
        } else {
          const raw = localStorage.getItem('auth-storage');
          const accessToken = raw ? JSON.parse(raw)?.state?.accessToken : null;
          const resp = await fetch(dl.url, {
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          });
          const blob = await resp.blob();
          newTab.location.href = URL.createObjectURL(blob);
        }
      }
    } catch {
      if (newTab) newTab.close();
    }
  }, [presentationId]);

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
      reviewing: {
        icon: <Loader2 className="h-10 w-10 animate-spin text-orange-400" />,
        title: 'Preparing Review',
        subtitle: 'Your slides are almost ready for review',
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
          {phaseContent?.icon}
        </div>
        <p className="mb-2 text-center text-sm font-medium text-foreground">
          {phaseContent?.title}
        </p>
        <p className="text-center text-sm text-muted-foreground">
          {phaseContent?.subtitle}
        </p>
      </div>
    );
  }

  // Review flow � shown after generation, before editing
  if (phase === 'reviewing' && slides.length > 0 && reviewState) {
    return (
      <SlideReviewFlow
        slides={slides}
        presentationId={presentationId!}
        theme={presentation?.theme}
        reviewState={reviewState}
        onExport={handleExport}
        onFinishReview={handleFinishReview}
      />
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
