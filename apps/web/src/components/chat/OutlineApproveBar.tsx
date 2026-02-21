import { useState, useRef } from 'react';
import { Check, RefreshCw, Send } from 'lucide-react';

interface OutlineApproveBarProps {
  onApprove: () => void;
  onRetry: (feedback: string) => void;
  disabled?: boolean;
}

export function OutlineApproveBar({ onApprove, onRetry, disabled }: OutlineApproveBarProps) {
  const [mode, setMode] = useState<'buttons' | 'feedback'>('buttons');
  const [feedback, setFeedback] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

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
      <p className="mb-2 text-xs font-medium text-muted-foreground">Review the outline above</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onApprove}
          disabled={disabled}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          Approve & Generate
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
