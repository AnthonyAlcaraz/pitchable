import { useEffect, useState, useCallback, useRef } from 'react';
import { PeachLogo } from '@/components/icons/PeachLogo';
import {
  Download, ChevronDown, FileText, Loader2, Check, Edit3,
  SkipForward, Coins, Eye,
} from 'lucide-react';
import { usePresentationStore } from '@/stores/presentation.store';
import type { SlideData } from '@/stores/presentation.store';
import { useWorkflowStore } from '@/stores/workflow.store';
import { useSlideUpdates } from '@/hooks/useSlideUpdates';
import { ThumbnailSidebar } from './ThumbnailSidebar';
import { SlideHeader } from './SlideHeader';
import { PresentationMode } from './PresentationMode';
import { NarrativeAdvice } from './NarrativeAdvice';
import { CascadeConfirmModal } from './CascadeConfirmModal';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

// ── Cascade types ──────────────────────────────────────────
interface AffectedSlide {
  slideNumber: number;
  title: string;
  slideType: string;
}

interface CascadeData {
  slideId: string;
  feedback: string;
  affectedSlideCount: number;
  creditCost: number;
  reason: string;
  affectedSlides: AffectedSlide[];
  slideNumber: number;
}

interface CascadeProgress {
  current: number;
  total: number;
  slideTitle: string;
}

// ── Component ──────────────────────────────────────────────
const SLIDE_TYPE_LABELS: Record<string, string> = {
  SPLIT_STATEMENT: 'PROBLEM',
  DATA_METRICS: 'DATA',
  METRICS_HIGHLIGHT: 'METRICS',
  FEATURE_GRID: 'FEATURES',
  VISUAL_HUMOR: 'VISUAL',
  SECTION_DIVIDER: 'DIVIDER',
  PRODUCT_SHOWCASE: 'SHOWCASE',
  MARKET_SIZING: 'MARKET',
  LOGO_WALL: 'LOGOS',
};

interface PreviewPanelProps {
  presentationId?: string;
}

export function PreviewPanel({ presentationId }: PreviewPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Presentation store
  const presentation = usePresentationStore((s) => s.presentation);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const isLoading = usePresentationStore((s) => s.isLoading);
  const loadPresentation = usePresentationStore((s) => s.loadPresentation);
  const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  const nextSlide = usePresentationStore((s) => s.nextSlide);
  const previousSlide = usePresentationStore((s) => s.previousSlide);
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const reviewState = usePresentationStore((s) => s.reviewState);
  const startReview = usePresentationStore((s) => s.startReview);
  const resetReview = usePresentationStore((s) => s.resetReview);
  const approveReviewSlide = usePresentationStore((s) => s.approveReviewSlide);
  const approveAllReviewSlides = usePresentationStore((s) => s.approveAllReviewSlides);
  const unapproveSlides = usePresentationStore((s) => s.unapproveSlides);
  const cacheBuster = usePresentationStore((s) => s.previewCacheBuster);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Workflow store
  const phase = useWorkflowStore((s) => s.phase);
  const setPhase = useWorkflowStore((s) => s.setPhase);

  // Real-time slide updates
  useSlideUpdates(presentationId);

  // Local state — editing
  const [isEditing, setIsEditing] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  // Local state — cascade
  const [cascadeData, setCascadeData] = useState<CascadeData | null>(null);
  const [cascadeProgress, setCascadeProgress] = useState<CascadeProgress | null>(null);
  const [cascadeExecuting, setCascadeExecuting] = useState(false);

  // Export dropdown
  const [showExportMenu, setShowExportMenu] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Derived state
  const slides = presentation?.slides ?? [];
  const currentSlide = slides[currentSlideIndex];
  const isReviewing = phase === 'reviewing' && reviewState != null;
  const approvedSlides = reviewState?.approvedSlides ?? [];
  const allApproved = isReviewing && approvedSlides.length >= slides.length && slides.length > 0;
  const isCurrentApproved = isReviewing && approvedSlides.includes(currentSlideIndex);

  // ── Load presentation ──────────────────────────────────
  useEffect(() => {
    if (presentationId && presentationId !== 'new') {
      loadPresentation(presentationId);
    }
  }, [presentationId, loadPresentation]);

  // ── Auto-enter review after generation ─────────────────
  const prevPhaseRef = useRef(phase);
  useEffect(() => {
    const prevPhase = prevPhaseRef.current;
    prevPhaseRef.current = phase;

    // When generation completes, auto-enter review
    if (prevPhase === 'generating' && phase !== 'generating' && slides.length > 0) {
      if (phase !== 'reviewing') {
        setPhase('reviewing');
      }
      if (!reviewState) {
        startReview();
      }
    }

    // When in reviewing phase but no reviewState (e.g., page reload), start review
    if (phase === 'reviewing' && !reviewState && slides.length > 0) {
      startReview();
    }
  }, [phase, slides.length, reviewState, setPhase, startReview]);

  // ── Keyboard navigation ────────────────────────────────
  useEffect(() => {
    if (isFullscreen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); nextSlide(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); previousSlide(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, nextSlide, previousSlide]);

  // ── Auto-scroll main area when slide changes ──────────
  const mainContentRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentSlideIndex]);

  useEffect(() => setImgLoaded(false), [currentSlide?.id]);

  // ── Close export menu on outside click ─────────────────
  useEffect(() => {
    if (!showExportMenu) return;
    function handleClick(e: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) setShowExportMenu(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showExportMenu]);

  // ── Cascade WebSocket listeners ────────────────────────
  useEffect(() => {
    const socket = getSocket();
    const handleCascadeProgress = (event: {
      presentationId: string;
      currentSlide: number;
      totalSlides: number;
      slideTitle: string;
    }) => {
      if (event.presentationId !== presentationId) return;
      setCascadeProgress({
        current: event.currentSlide,
        total: event.totalSlides,
        slideTitle: event.slideTitle,
      });
    };
    const handleCascadeComplete = (event: { presentationId: string }) => {
      if (event.presentationId !== presentationId) return;
      setCascadeExecuting(false);
      setCascadeProgress(null);
      setCascadeData(null);
    };
    socket.on('cascade:progress', handleCascadeProgress);
    socket.on('cascade:complete', handleCascadeComplete);
    return () => {
      socket.off('cascade:progress', handleCascadeProgress);
      socket.off('cascade:complete', handleCascadeComplete);
    };
  }, [presentationId]);

  // ── Handlers ───────────────────────────────────────────
  const handleFullscreen = useCallback(() => setIsFullscreen(true), []);
  const handleExitFullscreen = useCallback(() => setIsFullscreen(false), []);

  const handleFinishReview = useCallback(() => {
    resetReview();
    setPhase('editing');
    if (presentationId) {
      try { sessionStorage.setItem('pitchable-review-completed', presentationId); } catch { /* */ }
    }
  }, [resetReview, setPhase, presentationId]);

  const handleApprove = useCallback(() => {
    approveReviewSlide(currentSlideIndex);
    setIsEditing(false);
    setEditingFeedback('');
  }, [currentSlideIndex, approveReviewSlide]);

  const handleApproveAll = useCallback(() => {
    approveAllReviewSlides();
    setIsEditing(false);
    setEditingFeedback('');
  }, [approveAllReviewSlides]);

  const handleSuggestChange = useCallback(async () => {
    if (!editingFeedback.trim() || !currentSlide) return;
    setEditLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        classification: 'cosmetic' | 'structural';
        message?: string;
        slide?: Partial<SlideData>;
        reason?: string;
        affectedSlideCount?: number;
        creditCost?: number;
        affectedSlides?: AffectedSlide[];
        slideNumber?: number;
      }>(`/chat/${presentationId}/edit-slide`, {
        slideId: currentSlide.id,
        feedback: editingFeedback.trim(),
      });

      if (res.classification === 'cosmetic' && res.success && res.slide) {
        updateSlide(currentSlide.id, res.slide);
        setIsEditing(false);
        setEditingFeedback('');
      } else if (res.classification === 'structural') {
        setCascadeData({
          slideId: currentSlide.id,
          feedback: editingFeedback.trim(),
          affectedSlideCount: res.affectedSlideCount ?? 0,
          creditCost: res.creditCost ?? 0,
          reason: res.reason ?? 'This change affects the narrative arc.',
          affectedSlides: res.affectedSlides ?? [],
          slideNumber: res.slideNumber ?? currentSlide.slideNumber,
        });
        setIsEditing(false);
        setEditingFeedback('');
      }
    } catch (err) {
      console.error('Failed to edit slide:', err);
    } finally {
      setEditLoading(false);
    }
  }, [editingFeedback, currentSlide, presentationId, updateSlide]);

  const handleCascadeConfirm = useCallback(async () => {
    if (!cascadeData) return;
    setCascadeExecuting(true);
    setCascadeProgress(null);
    try {
      await api.post(`/chat/${presentationId}/execute-cascade`, {
        slideId: cascadeData.slideId,
        feedback: cascadeData.feedback,
      });
      const affectedIndices = cascadeData.affectedSlides.map((s) => s.slideNumber - 1);
      unapproveSlides(affectedIndices);
    } catch (err) {
      console.error('Cascade execution failed:', err);
      setCascadeExecuting(false);
      setCascadeProgress(null);
      setCascadeData(null);
    }
  }, [cascadeData, presentationId, unapproveSlides]);

  const handleCascadeCancel = useCallback(() => {
    setCascadeData(null);
    setCascadeProgress(null);
    setCascadeExecuting(false);
  }, []);

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
        { silentAuth: true },
      );
      const jobId = jobs[0]?.id;
      if (!jobId) throw new Error('No export job created');
      let completed = false;
      for (let i = 0; i < 90; i++) {
        const job = await api.get<{ status: string; errorMessage?: string }>(`/exports/${jobId}`, { silentAuth: true });
        if (job.status === 'COMPLETED') { completed = true; break; }
        if (job.status === 'FAILED') throw new Error(job.errorMessage || 'Export failed');
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (!completed) throw new Error('Export timed out. Please try again.');
      const dl = await api.get<{ url: string; filename: string }>(`/exports/${jobId}/download-url`, { silentAuth: true });
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
    } catch (err) {
      if (newTab) {
        const msg = err instanceof Error ? err.message : 'Export failed';
        newTab.document.write(
          '<html><body style="background:#0f0f1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">' +
          `<div style="text-align:center"><p style="font-size:1.2rem;color:#f87171">Export Failed</p><p style="color:#888">${msg}</p><p style="margin-top:1rem"><a href="javascript:window.close()" style="color:#f97316">Close this tab</a></p></div></body></html>`,
        );
      }
    }
  }, [presentationId]);

  // ── Empty state ────────────────────────────────────────
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

  // ── Loading state ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  // ── No slides yet — phase-aware guidance ───────────────
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

  // ── Main view — slides exist ───────────────────────────
  return (
    <>
      <div className="flex h-full flex-col">
        {/* Cascade confirmation modal */}
        {cascadeData && (
          <CascadeConfirmModal
            reason={cascadeData.reason}
            affectedSlides={cascadeData.affectedSlides}
            creditCost={cascadeData.creditCost}
            progress={cascadeProgress}
            isExecuting={cascadeExecuting}
            onConfirm={() => void handleCascadeConfirm()}
            onCancel={handleCascadeCancel}
          />
        )}

        {/* Header with navigation + approval progress */}
        <SlideHeader
          title={presentation?.title ?? 'Untitled'}
          currentSlide={currentSlideIndex + 1}
          totalSlides={slides.length}
          onPrevious={previousSlide}
          onNext={nextSlide}
          onFullscreen={handleFullscreen}
          onExport={handleExport}
          approvedCount={isReviewing ? approvedSlides.length : undefined}
          exportDisabled={isReviewing && !allApproved}
        />

        {/* Review toolbar */}
        {isReviewing && (
          <div className="flex items-center gap-3 border-b border-border bg-card/50 px-4 py-2">
            <span className="text-sm font-medium text-orange-400">Slide Review</span>
            <span className="text-xs text-muted-foreground">
              {Math.min(approvedSlides.length, slides.length)}/{slides.length} approved
            </span>
            <div className="flex-1" />
            <button
              type="button"
              onClick={handleFinishReview}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip Review
            </button>
            {!allApproved && (
              <button
                type="button"
                onClick={handleApproveAll}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-orange-400 transition-colors"
              >
                <SkipForward className="h-3 w-3" />
                Approve All
              </button>
            )}
            {allApproved && (
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu((v) => !v)}
                  className="flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 transition-colors"
                >
                  <Download className="h-3 w-3" />
                  Export Deck
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
            )}
          </div>
        )}

        {/* Generating banner */}
        {phase === 'generating' && (
          <div className="flex items-center gap-2 border-b border-border bg-orange-500/5 px-4 py-1.5">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
            <span className="text-xs text-orange-400">Generating slides...</span>
            <span className="text-xs text-muted-foreground">{slides.length} ready</span>
          </div>
        )}

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Thumbnail sidebar with approval indicators */}
          <ThumbnailSidebar
            slides={slides}
            currentIndex={currentSlideIndex}
            onSelect={setCurrentSlide}
            theme={presentation?.theme}
            approvedSlides={isReviewing ? approvedSlides : undefined}
          />

          {/* Main slide view */}
          <div ref={mainContentRef} className="flex-1 overflow-y-auto bg-muted/20 p-4 md:p-6">
            {currentSlide && (
              <div className="mx-auto w-full max-w-4xl space-y-4">

                {/* ── Preview image (primary) ─────────── */}
                <div
                  key={currentSlide.id}
                  className="relative overflow-hidden rounded-lg border border-border bg-black shadow-lg"
                  style={{ aspectRatio: '16/9', animation: 'fadeSlideIn 0.25s ease-out' }}
                >
                  {currentSlide.previewUrl ? (
                    <>
                      {!imgLoaded && (
                        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-muted/50 via-muted to-muted/50" />
                      )}
                      <img
                        src={`/slides/${currentSlide.id}/preview?v=${cacheBuster}`}
                        alt={`Slide ${currentSlide.slideNumber}: ${currentSlide.title}`}
                        className={`h-full w-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                        onLoad={() => setImgLoaded(true)}
                      />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center bg-card">
                      <div className="text-center">
                        <Eye className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                        <p className="text-xs text-muted-foreground">Preview loading...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Slide info + action bar ──────────── */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Slide {currentSlide.slideNumber}
                    </p>
                    <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
                      {SLIDE_TYPE_LABELS[currentSlide.slideType] ?? currentSlide.slideType.replace(/_/g, ' ')}
                    </span>
                    {isCurrentApproved && (
                      <span className="flex items-center gap-1 text-[10px] text-green-400">
                        <Check className="h-3 w-3" /> Approved
                      </span>
                    )}
                  </div>

                  {/* Review actions */}
                  {isReviewing && !isCurrentApproved && !isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleApprove}
                        className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
                      >
                        <Check className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Edit3 className="h-4 w-4" />
                        Suggest Change
                      </button>
                    </div>
                  )}

                  {/* Non-review edit button */}
                  {!isReviewing && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                </div>

                {/* ── Edit feedback form ───────────────── */}
                {isEditing && (
                  <div className="space-y-2 rounded-lg border border-orange-500/30 bg-orange-500/5 p-3" style={{ animation: 'fadeSlideIn 0.2s ease-out' }}>
                    <div className="flex items-center gap-1.5 text-[10px] text-yellow-400">
                      <Coins className="h-3 w-3" />
                      Editing costs 1 credit (structural changes may cost more)
                    </div>
                    <textarea
                      value={editingFeedback}
                      onChange={(e) => setEditingFeedback(e.target.value)}
                      placeholder="Describe what you'd like to change..."
                      className="w-full rounded border border-orange-500/30 bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-orange-500 resize-none"
                      rows={3}
                      autoFocus
                      disabled={editLoading}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          void handleSuggestChange();
                        }
                        if (e.key === 'Escape') {
                          setIsEditing(false);
                          setEditingFeedback('');
                        }
                      }}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSuggestChange()}
                        disabled={editLoading || !editingFeedback.trim()}
                        className="flex items-center gap-1.5 rounded bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        {editLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Edit3 className="h-3 w-3" />}
                        {editLoading ? 'Analyzing...' : 'Regenerate'}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setIsEditing(false); setEditingFeedback(''); }}
                        disabled={editLoading}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Inline export (non-review mode) ──── */}
                {!isReviewing && (
                  <div className="flex items-center justify-end">
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
                )}

                {/* ── Speaker notes + Narrative coaching ── */}
                <NarrativeAdvice
                  slideType={currentSlide.slideType}
                  speakerNotes={currentSlide.speakerNotes}
                  onSaveSpeakerNotes={handleSaveSpeakerNotes}
                />

                {/* ── All approved — terminal section ──── */}
                {allApproved && (
                  <div
                    className="rounded-lg border border-green-500/30 bg-green-500/5 p-6 text-center"
                    style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
                  >
                    <p className="text-base font-medium text-foreground mb-1">
                      All {slides.length} slides approved
                    </p>
                    <p className="text-sm text-muted-foreground mb-4">
                      Your deck is ready to export. You can also continue editing individual slides.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => handleExport('pdf')}
                        className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Export PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExport('pptx')}
                        className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                      >
                        <Download className="h-4 w-4" />
                        Export PPTX
                      </button>
                      <button
                        type="button"
                        onClick={handleFinishReview}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                      >
                        Continue editing
                      </button>
                    </div>
                  </div>
                )}
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
