import { ChevronLeft, ChevronRight, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideHeaderProps {
  title: string;
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  onFullscreen: () => void;
}

export function SlideHeader({
  title,
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  onFullscreen,
}: SlideHeaderProps) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-border px-3">
      <span className="truncate text-sm font-medium text-foreground">{title}</span>

      <div className="flex items-center gap-1">
        <button
          onClick={onPrevious}
          disabled={currentSlide <= 1}
          className={cn(
            'rounded p-1 transition-colors',
            currentSlide <= 1
              ? 'text-muted-foreground/30'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
          {totalSlides > 0 ? `${currentSlide} / ${totalSlides}` : '0 / 0'}
        </span>

        <button
          onClick={onNext}
          disabled={currentSlide >= totalSlides}
          className={cn(
            'rounded p-1 transition-colors',
            currentSlide >= totalSlides
              ? 'text-muted-foreground/30'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        <button
          onClick={onFullscreen}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Presentation mode"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
