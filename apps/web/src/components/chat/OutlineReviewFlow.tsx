import { useState } from 'react';
import { Check, ChevronRight, Edit3, SkipForward } from 'lucide-react';
import type { OutlineReviewState } from '../../stores/chat.store.js';

interface OutlineReviewFlowProps {
  state: OutlineReviewState;
  onApproveStep: (step: number) => void;
  onEditTitle: (newTitle: string) => void;
  onSkipToApproveAll: () => void;
  onFinalApprove: () => void;
}

export function OutlineReviewFlow({
  state,
  onApproveStep,
  onEditTitle,
  onSkipToApproveAll,
  onFinalApprove,
}: OutlineReviewFlowProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(state.outlineData?.title ?? '');

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

            {isCurrent && !isApproved && (
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => onApproveStep(stepNum)}
                  className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                >
                  <Check className="h-3 w-3" />
                  Approve
                </button>
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
