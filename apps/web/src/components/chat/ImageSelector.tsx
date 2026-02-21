import { useCallback, useState } from 'react';
import { Image, Check, Coins } from 'lucide-react';
import { CountdownBar } from './CountdownBar.js';
import { useAuthStore } from '../../stores/auth.store.js';
import type { PendingImageSelection } from '../../stores/chat.store.js';

interface ImageSelectorProps {
  selection: PendingImageSelection;
  presentationId: string;
  onSelect: (presentationId: string, interactionType: string, contextId: string, selection: unknown) => void;
}

export function ImageSelector({ selection, presentationId, onSelect }: ImageSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const creditBalance = useAuthStore((s) => s.user?.creditBalance ?? 0);

  const handleSelect = useCallback(
    (candidateId: string) => {
      if (selected) return;
      setSelected(candidateId);
      onSelect(presentationId, 'image_selection', selection.contextId, candidateId);
    },
    [selected, presentationId, selection.contextId, onSelect],
  );

  const handleTimeout = useCallback(() => {
    if (!selected) {
      setSelected(selection.defaultImageId);
      onSelect(presentationId, 'image_selection', selection.contextId, selection.defaultImageId);
    }
  }, [selected, selection.defaultImageId, selection.contextId, presentationId, onSelect]);

  return (
    <div className="mx-4 my-2 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Choose an image for your slide</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Coins className="h-3 w-3 text-amber-500" />
          <span className="text-[10px] text-muted-foreground">1 credit/image &middot; {creditBalance} available</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3">
        {selection.candidates.map((candidate) => {
          const isSelected = selected === candidate.id;

          return (
            <button
              key={candidate.id}
              type="button"
              onClick={() => handleSelect(candidate.id)}
              disabled={!!selected}
              className={`group relative rounded-lg border overflow-hidden transition-all ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/30'
                  : selected
                    ? 'border-border opacity-50'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="aspect-square bg-muted">
                <img
                  src={candidate.imageUrl}
                  alt={`Image option ${candidate.id}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>

              {/* Score badge */}
              <div className="absolute right-1 top-1 rounded bg-black/70 px-1 py-0.5 text-[8px] font-medium text-white">
                {candidate.score.toFixed(1)}
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                  <Check className="h-6 w-6 text-primary" />
                </div>
              )}

              {/* Prompt preview on hover */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="text-[8px] leading-tight text-white line-clamp-2">{candidate.prompt}</p>
              </div>
            </button>
          );
        })}
      </div>

      {!selected && (
        <div className="px-3 pb-2">
          <CountdownBar
            durationMs={selection.timeoutMs}
            startedAt={selection.receivedAt}
            onTimeout={handleTimeout}
          />
          <p className="mt-1 text-center text-[9px] text-muted-foreground">
            Auto-selecting top-scored image when timer expires
          </p>
        </div>
      )}
    </div>
  );
}
