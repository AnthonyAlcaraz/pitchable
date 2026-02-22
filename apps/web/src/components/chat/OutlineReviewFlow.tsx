import { useState } from 'react';
import { Check, ChevronRight, Edit3, SkipForward, Loader2, Coins } from 'lucide-react';
import type { OutlineReviewState } from '../../stores/chat.store.js';

/** Short descriptions to help users understand each slide type */
const SLIDE_TYPE_DESCRIPTIONS: Record<string, string> = {
  TITLE: 'Opening slide with your deck title and subtitle',
  PROBLEM: 'Define the pain point or challenge your audience faces',
  SOLUTION: 'Present your answer to the problem',
  ARCHITECTURE: 'Show system design, technical stack, or how components connect',
  PROCESS: 'Step-by-step flow or methodology breakdown',
  COMPARISON: 'Side-by-side analysis — before/after, us vs them, options evaluated',
  DATA_METRICS: 'Key numbers, charts, KPIs, or quantitative evidence',
  CTA: 'Call-to-action — what you want the audience to do next',
  CONTENT: 'General content slide with bullets or paragraphs',
  QUOTE: 'Featured quote from a customer, expert, or notable source',
  VISUAL_HUMOR: 'Image-forward humor slide to lighten the mood',
  OUTLINE: 'Agenda or table of contents for the presentation',
  TEAM: 'Team members, roles, and credentials',
  TIMELINE: 'Chronological milestones or roadmap',
  SECTION_DIVIDER: 'Visual break between major sections',
  METRICS_HIGHLIGHT: 'Spotlight on 2-3 hero metrics with large numbers',
  FEATURE_GRID: 'Grid layout showing multiple features or capabilities',
  PRODUCT_SHOWCASE: 'Product screenshot or demo walkthrough',
  LOGO_WALL: 'Client logos, partner logos, or tech stack icons',
  MARKET_SIZING: 'TAM/SAM/SOM or market opportunity analysis',
  SPLIT_STATEMENT: 'Bold statement split across the slide for impact',
};

interface OutlineReviewFlowProps {
  state: OutlineReviewState;
  onApproveStep: (step: number) => void;
  onEditTitle: (newTitle: string) => void;
  onSkipToApproveAll: () => void;
  onFinalApprove: () => void;
  onEditSlide?: (slideIndex: number, feedback: string) => Promise<{ success: boolean; error?: string }>;
}

export function OutlineReviewFlow({
  state,
  onApproveStep,
  onEditTitle,
  onSkipToApproveAll,
  onFinalApprove,
  onEditSlide,
}: OutlineReviewFlowProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(state.outlineData?.title ?? '');
  const [editingSlideIdx, setEditingSlideIdx] = useState<number | null>(null);
  const [slideFeedback, setSlideFeedback] = useState('');
  const [slideEditLoading, setSlideEditLoading] = useState(false);
  const [slideEditError, setSlideEditError] = useState<string | null>(null);

  if (!state.outlineData) return null;

  const { outlineData, currentStep, approvedSteps } = state;
  const totalSteps = outlineData.slides.length + 1; // +1 for title
  const allApproved = approvedSteps.length >= totalSteps;
  const displayTitle = state.titleEdited ?? outlineData.title;

  const handleTitleSave = () => {
    if (titleDraft.trim()) {
      onEditTitle(titleDraft.trim());
    }
    setEditingTitle(false);
  };

  const handleSlideEdit = async (slideIndex: number) => {
    if (!slideFeedback.trim() || !onEditSlide) return;
    setSlideEditLoading(true);
    setSlideEditError(null);
    const result = await onEditSlide(slideIndex, slideFeedback.trim());
    setSlideEditLoading(false);
    if (result.success) {
      setEditingSlideIdx(null);
      setSlideFeedback('');
    } else {
      setSlideEditError(result.error ?? 'Failed to edit slide');
    }
  };

  return (
    <div className="px-4 py-3 space-y-3" style={{ animation: 'fadeSlideIn 0.3s ease-out' }}>
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="font-medium text-orange-400">
          Outline Review
        </span>
        <span>
          {Math.min(approvedSteps.length, totalSteps)}/{totalSteps} approved
        </span>
        {!allApproved && (
          <button
            type="button"
            onClick={onSkipToApproveAll}
            className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-orange-400 transition-colors"
          >
            <SkipForward className="h-3 w-3" />
            Approve all
          </button>
        )}
      </div>

      {/* Step 0: Title review */}
      <div
        className={`rounded-lg border p-4 transition-all ${
          approvedSteps.includes(0)
            ? 'border-green-500/30 bg-green-500/5'
            : currentStep === 0
              ? 'border-orange-500/50 bg-orange-500/5'
              : 'border-border bg-card/50 opacity-50'
        }`}
        style={currentStep === 0 ? { animation: 'fadeSlideIn 0.3s ease-out' } : undefined}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
            TITLE
          </span>
          {approvedSteps.includes(0) && (
            <Check className="h-3.5 w-3.5 text-green-400" />
          )}
        </div>

        {editingTitle ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave();
                if (e.key === 'Escape') setEditingTitle(false);
              }}
              className="flex-1 rounded border border-orange-500/30 bg-background px-3 py-1.5 text-sm text-foreground outline-none focus:border-orange-500"
              autoFocus
            />
            <button
              type="button"
              onClick={handleTitleSave}
              className="rounded bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600"
            >
              Save
            </button>
          </div>
        ) : (
          <h3 className="text-base font-bold text-foreground">{displayTitle}</h3>
        )}

        {currentStep === 0 && !approvedSteps.includes(0) && (
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => onApproveStep(0)}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
            >
              <Check className="h-3 w-3" />
              Approve
            </button>
            <button
              type="button"
              onClick={() => { setTitleDraft(displayTitle); setEditingTitle(true); }}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
            >
              <Edit3 className="h-3 w-3" />
              Edit
            </button>
          </div>
        )}
      </div>

      {/* Steps 1..N: Slide review */}
      {outlineData.slides.map((slide, idx) => {
        const stepNum = idx + 1;
        const isApproved = approvedSteps.includes(stepNum);
        const isCurrent = currentStep === stepNum;
        const isVisible = approvedSteps.includes(stepNum - 1) || isApproved || isCurrent;
        const isEditing = editingSlideIdx === idx;

        if (!isVisible) return null;

        return (
          <div
            key={slide.slideNumber}
            className={`rounded-lg border p-3 transition-all ${
              isApproved
                ? 'border-green-500/30 bg-green-500/5'
                : isCurrent
                  ? 'border-orange-500/50 bg-orange-500/5'
                  : 'border-border bg-card/50 opacity-50'
            }`}
            style={isCurrent ? { animation: 'fadeSlideIn 0.3s ease-out' } : undefined}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-400">
                    {slide.slideType.replace(/_/g, ' ')}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    #{slide.slideNumber}
                  </span>
                  {isApproved && (
                    <Check className="h-3.5 w-3.5 text-green-400" />
                  )}
                </div>
                {SLIDE_TYPE_DESCRIPTIONS[slide.slideType] && (
                  <p className="text-[10px] text-muted-foreground/70 italic mb-1">
                    {SLIDE_TYPE_DESCRIPTIONS[slide.slideType]}
                  </p>
                )}
                <h4 className="text-sm font-semibold text-foreground mb-1">
                  {slide.title}
                </h4>
                <ul className="space-y-0.5">
                  {slide.bulletPoints.slice(0, 4).map((bp, i) => (
                    <li key={i} className="text-xs text-foreground/60 leading-relaxed">
                      - {bp}
                    </li>
                  ))}
                  {slide.bulletPoints.length > 4 && (
                    <li className="text-[10px] text-muted-foreground">
                      +{slide.bulletPoints.length - 4} more...
                    </li>
                  )}
                </ul>
                {slide.sources && slide.sources.length > 0 && (
                  <p className="mt-1 text-[10px] text-muted-foreground/50">
                    Sources: {slide.sources.join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Slide edit form */}
            {isEditing && (
              <div className="mt-2 space-y-2" style={{ animation: 'fadeSlideIn 0.2s ease-out' }}>
                <div className="flex items-center gap-1.5 text-[10px] text-yellow-400">
                  <Coins className="h-3 w-3" />
                  Editing costs 1 credit
                </div>
                <textarea
                  value={slideFeedback}
                  onChange={(e) => setSlideFeedback(e.target.value)}
                  placeholder="Describe what you'd like to change..."
                  className="w-full rounded border border-orange-500/30 bg-background px-3 py-2 text-xs text-foreground outline-none focus:border-orange-500 resize-none"
                  rows={2}
                  autoFocus
                  disabled={slideEditLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSlideEdit(idx);
                    }
                    if (e.key === 'Escape') {
                      setEditingSlideIdx(null);
                      setSlideFeedback('');
                      setSlideEditError(null);
                    }
                  }}
                />
                {slideEditError && (
                  <p className="text-[10px] text-red-400">{slideEditError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSlideEdit(idx)}
                    disabled={slideEditLoading || !slideFeedback.trim()}
                    className="flex items-center gap-1.5 rounded bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {slideEditLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Edit3 className="h-3 w-3" />}
                    {slideEditLoading ? 'Regenerating...' : 'Regenerate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEditingSlideIdx(null); setSlideFeedback(''); setSlideEditError(null); }}
                    disabled={slideEditLoading}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {isCurrent && !isApproved && !isEditing && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onApproveStep(stepNum)}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Approve
                </button>
                {onEditSlide && (
                  <button
                    type="button"
                    onClick={() => { setEditingSlideIdx(idx); setSlideFeedback(''); setSlideEditError(null); }}
                    className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  >
                    <Edit3 className="h-3 w-3" />
                    Suggest change
                  </button>
                )}
                <button
                  type="button"
                  onClick={onSkipToApproveAll}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-orange-400 transition-colors"
                >
                  <ChevronRight className="h-3 w-3" />
                  Approve remaining
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Final approval summary */}
      {allApproved && (
        <div
          className="rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center"
          style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
        >
          <p className="text-sm font-medium text-foreground mb-1">
            Outline ready — {outlineData.slides.length} slides
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            All slides reviewed. Click below to generate your deck.
          </p>
          <button
            type="button"
            onClick={onFinalApprove}
            className="rounded-lg bg-orange-500 px-6 py-2 text-sm font-medium text-white hover:bg-orange-600 transition-colors"
          >
            Generate Deck
          </button>
        </div>
      )}
    </div>
  );
}
