import { useState, useRef } from 'react';
import { Check, RefreshCw, Send, Coins } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.js';

interface OutlineApproveBarProps {
  onApprove: () => void;
  onRetry: (feedback: string) => void;
  disabled?: boolean;
}

const DECK_GENERATION_COST = 2;

export function OutlineApproveBar({ onApprove, onRetry, disabled }: OutlineApproveBarProps) {
  const [mode, setMode] = useState<'buttons' | 'feedback'>('buttons');
  const [feedback, setFeedback] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const creditBalance = useAuthStore((s) => s.user?.creditBalance ?? 0);
  const hasEnoughCredits = creditBalance >= DECK_GENERATION_COST;

  const handleRetryClick = () => {
    setMode('feedback');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleSendFeedback = () => {
    const trimmed = feedback.trim();
    if (!trimmed) return;
    onRetry(trimmed);
    setFeedback('');
    setMode('buttons');
  };

  if (mode === 'feedback') {
    return (
      <div className="border-t border-border bg-card p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">What would you like to change?</p>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendFeedback(); }
              if (e.key === 'Escape') { setMode('buttons'); setFeedback(''); }
            }}
            placeholder="e.g. Add a competitive analysis slide, make it more technical..."
            rows={2}
            className="flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-orange-500/50"
          />
          <button
            type="button"
            onClick={handleSendFeedback}
            disabled={!feedback.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => { setMode('buttons'); setFeedback(''); }}
          className="mt-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-border bg-card p-3">
      {/* Credit cost info */}
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Review the outline above</p>
        <div className="flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-xs text-muted-foreground">
            Cost: <strong className="text-foreground">{DECK_GENERATION_COST}</strong> credits
          </span>
          <span className="text-xs text-muted-foreground/60">
            ({creditBalance} available)
          </span>
        </div>
      </div>

      {!hasEnoughCredits && (
        <div className="mb-2.5 rounded-md bg-red-500/10 px-3 py-2 text-xs text-red-400">
          Not enough credits. You need {DECK_GENERATION_COST} credits but have {creditBalance}.
          <a href="/billing" className="ml-1 underline hover:text-red-300">Purchase credits</a>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={disabled || !hasEnoughCredits}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Approve & Generate ({DECK_GENERATION_COST} credits)
        </button>
        <button
          type="button"
          onClick={handleRetryClick}
          disabled={disabled}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Change Outline
        </button>
      </div>
    </div>
  );
}
