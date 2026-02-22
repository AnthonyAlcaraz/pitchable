import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import { usePresentationStore } from '@/stores/presentation.store';
import type { SlideData } from '@/stores/presentation.store';
import { useChatStore } from '@/stores/chat.store';
import { cn } from '@/lib/utils';

const EMPTY_SLIDES: SlideData[] = [];

export function StickySlidePreview() {
  const slides = usePresentationStore((s) => s.presentation?.slides ?? EMPTY_SLIDES);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const setCurrentSlide = usePresentationStore((s) => s.setCurrentSlide);
  const nextSlide = usePresentationStore((s) => s.nextSlide);
  const previousSlide = usePresentationStore((s) => s.previousSlide);
  const cacheBuster = usePresentationStore((s) => s.previewCacheBuster);
  const lastExportUrl = useChatStore((s) => s.lastExportUrl);

  const hasAnyPreview = useMemo(
    () => slides.some((s) => s.previewUrl),
    [slides],
  );

  if (!hasAnyPreview || slides.length === 0) return null;

  const currentSlide = slides[currentSlideIndex];

  return (
    <div className="flex-shrink-0 border-b border-border bg-muted/30 px-3 py-2">
      {/* Preview image */}
      <div
        className="relative overflow-hidden rounded-md border border-border bg-black"
        style={{ aspectRatio: '16/9' }}
      >
        {currentSlide?.previewUrl ? (
          <img
            src={`/slides/${currentSlide.id}/preview?v=${cacheBuster}`}
            alt={`Slide ${currentSlide.slideNumber}`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Eye className="h-6 w-6 text-muted-foreground/40" />
          </div>
        )}
      </div>

      {/* Navigation + download row */}
      <div className="mt-1.5 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            onClick={previousSlide}
            disabled={currentSlideIndex <= 0}
            className={cn(
              'rounded p-0.5 transition-colors',
              currentSlideIndex <= 0
                ? 'text-muted-foreground/30'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
            {currentSlideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={nextSlide}
            disabled={currentSlideIndex >= slides.length - 1}
            className={cn(
              'rounded p-0.5 transition-colors',
              currentSlideIndex >= slides.length - 1
                ? 'text-muted-foreground/30'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {lastExportUrl && (
          <button
            onClick={() => window.open(lastExportUrl, '_blank')}
            className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-0.5 text-xs font-medium text-orange-400 transition-colors hover:bg-orange-500/20"
            title="Download export"
          >
            <Download className="h-3 w-3" />
            <span className="hidden sm:inline">Download</span>
          </button>
        )}
      </div>

      {/* Horizontal thumbnail strip */}
      {slides.length > 1 && (
        <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setCurrentSlide(index)}
              className={cn(
                'relative flex-shrink-0 overflow-hidden rounded border transition-all',
                index === currentSlideIndex
                  ? 'border-primary ring-1 ring-primary/30'
                  : 'border-border/50 hover:border-primary/50',
              )}
              style={{ width: 56, aspectRatio: '16/9' }}
            >
              {slide.previewUrl ? (
                <img
                  src={`/slides/${slide.id}/preview?v=${cacheBuster}`}
                  alt={`Slide ${slide.slideNumber}`}
                  className="h-full w-full object-contain bg-black"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-muted/50">
                  <span className="text-[8px] text-muted-foreground">{slide.slideNumber}</span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
