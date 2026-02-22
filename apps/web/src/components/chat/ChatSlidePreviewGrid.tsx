import { useEffect, useRef } from 'react';
import type { SlideData } from '../../stores/presentation.store.js';
import { usePresentationStore } from '../../stores/presentation.store.js';
import { SlideRenderer, themeToStyleVars } from '../preview/SlideRenderer.js';
import { cn } from '../../lib/utils.js';
import type { InlineSlideCard as InlineSlideCardType } from '../../stores/chat.store.js';
import type { ThemeData } from '../../stores/presentation.store.js';

interface ChatSlidePreviewGridProps {
  slideCards: InlineSlideCardType[];
  theme?: ThemeData | null;
  onSlideClick?: (slideIndex: number) => void;
}

/**
 * Full-width vertical slide preview grid for chat messages.
 * Shows both the exported rendered image (if available) and the editable content.
 * Syncs highlight with the lateral sidebar selection.
 */
const EMPTY_SLIDES: SlideData[] = [];

export function ChatSlidePreviewGrid({ slideCards, theme, onSlideClick }: ChatSlidePreviewGridProps) {
  const slides = usePresentationStore((s) => s.presentation?.slides ?? EMPTY_SLIDES);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const activeRef = useRef<HTMLDivElement>(null);

  // Scroll the highlighted slide into view when sidebar selection changes
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentSlideIndex]);

  return (
    <div className="mt-3 space-y-2">
      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        Slide Previews
      </p>
      {slideCards.map((card) => {
        const idx = card.slideNumber - 1;
        const isActive = idx === currentSlideIndex;
        // Match to full slide data from store (has previewUrl)
        const fullSlide = slides.find((s) => s.slideNumber === card.slideNumber);

        return (
          <div
            key={card.id}
            ref={isActive ? activeRef : undefined}
            onClick={() => onSlideClick?.(idx)}
            className={cn(
              'cursor-pointer rounded-lg border overflow-hidden transition-all',
              isActive
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-border/50 hover:border-primary/50',
            )}
          >
            {/* Exported rendered image — the "generated" version */}
            {fullSlide?.previewUrl && (
              <div>
                <p className="px-2 pt-1.5 text-[9px] font-medium text-green-400/80 uppercase tracking-wide">
                  Final
                </p>
                <div style={{ aspectRatio: '16/9' }}>
                  <img
                    src={`/slides/${fullSlide.id}/preview?t=${fullSlide.updatedAt ?? ''}`}
                    alt={`Slide ${card.slideNumber} rendered`}
                    className="h-full w-full object-contain bg-black"
                  />
                </div>
              </div>
            )}

            {/* Editable content view — the "editable" version */}
            {fullSlide ? (
              <div>
                {fullSlide.previewUrl && (
                  <p className="px-2 pt-1.5 text-[9px] font-medium text-orange-400/80 uppercase tracking-wide">
                    Editable
                  </p>
                )}
                <div style={themeToStyleVars(theme)}>
                  <SlideRenderer slide={fullSlide} theme={theme} scale={0.4} />
                </div>
              </div>
            ) : (
              /* Fallback to card data if store doesn't have the slide */
              <div
                className="rounded-lg border border-border bg-card overflow-hidden"
                style={{ aspectRatio: '16/9', ...themeToStyleVars(theme) }}
              >
                <div className="flex h-full flex-col p-[4%]">
                  <div className="mb-1 flex items-center gap-1.5">
                    <span className="rounded bg-primary/10 px-1 py-0.5 text-[8px] font-medium text-primary">
                      {card.slideType.replace('_', ' ')}
                    </span>
                    <span className="text-[8px] text-muted-foreground">#{card.slideNumber}</span>
                  </div>
                  <h5 className="mb-1 text-[11px] font-bold leading-tight text-foreground line-clamp-2">
                    {card.title}
                  </h5>
                  <p className="flex-1 overflow-hidden text-[9px] leading-tight text-foreground/60 line-clamp-4">
                    {card.body}
                  </p>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
