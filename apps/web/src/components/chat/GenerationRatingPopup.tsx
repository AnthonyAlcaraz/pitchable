import { useState, useCallback, useEffect } from 'react';
import { api } from '../../lib/api.js';

const SMILEYS = [
  { value: 1, label: 'Terrible', icon: '\u{1F621}' },
  { value: 2, label: 'Poor', icon: '\u{1F615}' },
  { value: 3, label: 'Okay', icon: '\u{1F610}' },
  { value: 4, label: 'Good', icon: '\u{1F642}' },
  { value: 5, label: 'Amazing', icon: '\u{1F929}' },
];

const DISMISS_KEY = 'rating_dismissed_';
const TIMEOUT_MS = 60_000;

interface GenerationRatingPopupProps {
  presentationId: string;
}

export function GenerationRatingPopup({ presentationId }: GenerationRatingPopupProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [showComment, setShowComment] = useState(false);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'dismissed'>('idle');

  // Check if already rated or dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISS_KEY + presentationId);
    if (dismissed) {
      setStatus('dismissed');
      return;
    }
    // Check if already rated via API
    api.get<{ id: string; rating: number } | null>(`/presentations/${presentationId}/rating`)
      .then((existing) => {
        if (existing?.id) setStatus('done');
      })
      .catch(() => { /* ignore */ });
  }, [presentationId]);

  // Auto-dismiss after timeout
  useEffect(() => {
    if (status !== 'idle') return;
    const timer = setTimeout(() => setStatus('dismissed'), TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [status]);

  const handleSubmit = useCallback(async () => {
    if (!selected) return;
    setStatus('submitting');
    try {
      await api.post(`/presentations/${presentationId}/rating`, {
        rating: selected,
        comment: comment.trim() || undefined,
      });
      localStorage.setItem(DISMISS_KEY + presentationId, '1');
      setStatus('done');
    } catch {
      setStatus('idle');
    }
  }, [selected, comment, presentationId]);

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY + presentationId, '1');
    setStatus('dismissed');
  }, [presentationId]);

  if (status === 'done' || status === 'dismissed') return null;

  return (
    <div className="mt-3 rounded-lg border border-border/50 bg-card/50 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-muted-foreground">How was this generation?</span>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        >
          Skip
        </button>
      </div>

      <div className="flex gap-2 mb-2">
        {SMILEYS.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setSelected(s.value)}
            title={s.label}
            className={`flex flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-lg transition-all ${
              selected === s.value
                ? 'bg-primary/15 ring-1 ring-primary/40 scale-110'
                : 'hover:bg-muted/50'
            }`}
          >
            <span>{s.icon}</span>
            <span className="text-[10px] text-muted-foreground">{s.value}</span>
          </button>
        ))}
      </div>

      {selected && !showComment && (
        <button
          type="button"
          onClick={() => setShowComment(true)}
          className="text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors mb-2"
        >
          + Add a comment
        </button>
      )}

      {showComment && (
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Tell us more (optional)..."
          className="w-full rounded-md border border-border/50 bg-background/50 px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/30 mb-2 resize-none"
          rows={2}
        />
      )}

      {selected && (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={status === 'submitting'}
          className="rounded-md bg-primary/10 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {status === 'submitting' ? 'Submitting...' : 'Submit'}
        </button>
      )}
    </div>
  );
}
