import { useState, useCallback, useRef, useEffect } from 'react';
import { Check, ChevronRight, Edit3, SkipForward, Download, ChevronDown, Coins, Loader2 } from 'lucide-react';
import { EditableSlide } from './EditableSlide';
import { NarrativeAdvice } from './NarrativeAdvice';
import { CascadeConfirmModal } from './CascadeConfirmModal';
import { usePresentationStore } from '@/stores/presentation.store';
import type { ReviewState, SlideData, ThemeData } from '@/stores/presentation.store';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';

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

interface SlideReviewFlowProps {
  slides: SlideData[];
  presentationId: string;
  theme?: ThemeData | null;
  reviewState: ReviewState;
  onExport: (format: string) => void;
  onFinishReview: () => void;
}

export function SlideReviewFlow({
  slides,
  presentationId,
  theme,
  reviewState,
  onExport,
  onFinishReview,
}: SlideReviewFlowProps) {
  const { currentStep, approvedSlides } = reviewState;
  const totalSlides = slides.length;
  const allApproved = approvedSlides.length >= totalSlides;

  const approveReviewSlide = usePresentationStore((s) => s.approveReviewSlide);
  const approveAllReviewSlides = usePresentationStore((s) => s.approveAllReviewSlides);
  const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const unapproveSlides = usePresentationStore((s) => s.unapproveSlides);

  const [editingFeedback, setEditingFeedback] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  const [editLoading, setEditLoading] = useState(false);

  // Cascade state
  const [cascadeData, setCascadeData] = useState<CascadeData | null>(null);
  const [cascadeProgress, setCascadeProgress] = useState<CascadeProgress | null>(null);
  const [cascadeExecuting, setCascadeExecuting] = useState(false);

  // Export dropdown
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

  // Auto-scroll main area when step changes
  const mainRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep]);

  // Listen for cascade WebSocket events
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

  const currentSlide = slides[currentStep];

  const handleApprove = useCallback(() => {
    approveReviewSlide(currentStep);
    setIsEditing(false);
    setEditingFeedback('');
  }, [currentStep, approveReviewSlide]);

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

      // Unapprove all affected slide indices (0-based)
      const affectedIndices = cascadeData.affectedSlides.map((s) => s.slideNumber - 1);
      unapproveSlides(affectedIndices);
    } catch (err) {
      console.error('Cascade execution failed:', err);
      setCascadeExecuting(false);
      setCascadeProgress(null);
      setCascadeData(null);
    }
    // Note: cascade:complete WS event will clear cascadeExecuting/Data
  }, [cascadeData, presentationId, unapproveSlides]);

  const handleCascadeCancel = useCallback(() => {
    setCascadeData(null);
    setCascadeProgress(null);
    setCascadeExecuting(false);
  }, []);

  const handleSaveSpeakerNotes = useCallback(async (value: string) => {
    if (!currentSlide) return;
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

  const handleThumbnailClick = useCallback((index: number) => {
    setCurrentSlide(index);
    // Also update review step if clicking an unapproved slide
    const presStore = usePresentationStore.getState();
    if (presStore.reviewState && !presStore.reviewState.approvedSlides.includes(index)) {
      usePresentationStore.setState({
        reviewState: { ...presStore.reviewState, currentStep: index },
      });
    }
  }, [setCurrentSlide]);

  if (!currentSlide) return null;

  return (
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

      {/* Review progress header */}
      <div className="flex items-center gap-3 border-b border-border bg-card/50 px-4 py-2.5">
        <span className="text-sm font-medium text-orange-400">
          Slide Review
        </span>
        <span className="text-xs text-muted-foreground">
          {Math.min(approvedSlides.length, totalSlides)}/{totalSlides} approved
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onFinishReview}
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
                    onClick={() => { onExport(fmt); setShowExportMenu(false); }}
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

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Thumbnail sidebar with approval badges */}
        <div className="flex w-44 flex-shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-muted/30 p-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => handleThumbnailClick(index)}
              className={`relative rounded-md border transition-all ${
                index === currentStep
                  ? 'border-primary ring-2 ring-primary/30'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {slide.previewUrl ? (
                <div className="aspect-video w-full overflow-hidden rounded-md bg-card">
                  <img
                    src={`/api/slides/${slide.id}/preview`}
                    alt={slide.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
              ) : (
                <div className="aspect-video w-full rounded-md bg-card p-2">
                  <p className="truncate text-[8px] font-medium text-foreground">{slide.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[6px] text-muted-foreground">{slide.body}</p>
                </div>
              )}
              <span className={`absolute bottom-0.5 right-1 text-[8px] font-medium ${
                index === currentStep ? 'text-primary' : 'text-muted-foreground'
              }`}>
                {slide.slideNumber}
              </span>
              {approvedSlides.includes(index) && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 shadow-sm">
                  <Check className="h-2.5 w-2.5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Main slide view */}
        <div ref={mainRef} className="flex-1 overflow-y-auto bg-muted/20 p-6">
          <div className="mx-auto w-full max-w-3xl space-y-4">
            {/* Current slide preview */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Slide {currentSlide.slideNumber}
                  </p>
                  <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
                    {currentSlide.slideType.replace(/_/g, ' ')}
                  </span>
                  {approvedSlides.includes(currentStep) && (
                    <span className="flex items-center gap-1 text-[10px] text-green-400">
                      <Check className="h-3 w-3" /> Approved
                    </span>
                  )}
                </div>
              </div>
              <EditableSlide
                slide={currentSlide}
                presentationId={presentationId}
                theme={theme}
              />
            </div>

            {/* Approval actions */}
            {!approvedSlides.includes(currentStep) && !isEditing && (
              <div className="flex gap-2" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
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
                {currentStep < totalSlides - 1 && (
                  <button
                    type="button"
                    onClick={handleApproveAll}
                    className="flex items-center gap-1.5 ml-auto text-xs text-muted-foreground hover:text-orange-400 transition-colors"
                  >
                    <ChevronRight className="h-3 w-3" />
                    Approve remaining
                  </button>
                )}
              </div>
            )}

            {/* Edit feedback form */}
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

            {/* Speaker notes + Narrative coaching */}
            <NarrativeAdvice
              slideType={currentSlide.slideType}
              speakerNotes={currentSlide.speakerNotes}
              onSaveSpeakerNotes={handleSaveSpeakerNotes}
            />

            {/* All approved — terminal export section */}
            {allApproved && (
              <div
                className="rounded-lg border border-green-500/30 bg-green-500/5 p-6 text-center"
                style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
              >
                <p className="text-base font-medium text-foreground mb-1">
                  All {totalSlides} slides approved
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Your deck is ready to export. You can also continue editing individual slides.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => onExport('pdf')}
                    className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => onExport('pptx')}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    Export PPTX
                  </button>
                  <button
                    type="button"
                    onClick={onFinishReview}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                  >
                    Continue editing
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
