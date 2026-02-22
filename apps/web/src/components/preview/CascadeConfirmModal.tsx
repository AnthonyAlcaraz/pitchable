import { AlertTriangle, Coins, X, Loader2, Check } from 'lucide-react';

interface AffectedSlide {
  slideNumber: number;
  title: string;
  slideType: string;
}

interface CascadeProgress {
  current: number;
  total: number;
  slideTitle: string;
}

interface CascadeConfirmModalProps {
  reason: string;
  affectedSlides: AffectedSlide[];
  creditCost: number;
  progress: CascadeProgress | null;
  isExecuting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CascadeConfirmModal({
  reason,
  affectedSlides,
  creditCost,
  progress,
  isExecuting,
  onConfirm,
  onCancel,
}: CascadeConfirmModalProps) {
  const progressPct = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative mx-4 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl"
        style={{ animation: 'fadeSlideIn 0.2s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500/10">
            <AlertTriangle className="h-4 w-4 text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground">Structural Change Detected</h3>
            <p className="text-xs text-muted-foreground">{reason}</p>
          </div>
          {!isExecuting && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Affected slides list */}
        <div className="max-h-48 overflow-y-auto px-5 py-3">
          <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Affected Slides
          </p>
          <div className="space-y-1">
            {affectedSlides.map((slide, i) => (
              <div
                key={slide.slideNumber}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-[10px] font-medium text-muted-foreground">
                  {slide.slideNumber}
                </span>
                <span className="flex-1 truncate text-foreground">{slide.title}</span>
                <span className="text-[10px] text-muted-foreground">
                  {slide.slideType.replace(/_/g, ' ')}
                </span>
                {isExecuting && progress && (
                  <span className="ml-1">
                    {i === 0 || progress.current > i ? (
                      <Check className="h-3 w-3 text-green-400" />
                    ) : progress.current === i ? (
                      <Loader2 className="h-3 w-3 animate-spin text-orange-400" />
                    ) : null}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Progress bar (during execution) */}
        {isExecuting && progress && (
          <div className="px-5 pb-3">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
              <span>Regenerating: {progress.slideTitle}</span>
              <span>{progress.current}/{progress.total}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-orange-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Cost + Warning */}
        <div className="border-t border-border px-5 py-3 space-y-2">
          <div className="flex items-center gap-2">
            <Coins className="h-3.5 w-3.5 text-yellow-400" />
            <span className="text-xs text-foreground">
              This will regenerate <strong>{affectedSlides.length}</strong> slide{affectedSlides.length !== 1 ? 's' : ''}.
              Cost: <strong>{creditCost}</strong> credit{creditCost !== 1 ? 's' : ''}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Previously approved slides will need re-review after regeneration.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isExecuting}
            className="rounded-md px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isExecuting}
            className="flex items-center gap-1.5 rounded-md bg-orange-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Regenerating...
              </>
            ) : (
              <>Proceed — {creditCost} credit{creditCost !== 1 ? 's' : ''}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
