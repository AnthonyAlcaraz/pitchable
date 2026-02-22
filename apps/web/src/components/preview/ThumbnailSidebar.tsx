import { cn } from '@/lib/utils';
import { SlideRenderer } from './SlideRenderer';
import type { SlideData, ThemeData } from '@/stores/presentation.store';

interface ThumbnailSidebarProps {
  slides: SlideData[];
  currentIndex: number;
  onSelect: (index: number) => void;
  theme?: ThemeData | null;
}

export function ThumbnailSidebar({ slides, currentIndex, onSelect, theme }: ThumbnailSidebarProps) {
  if (slides.length === 0) return null;

  return (
    <div className="flex w-44 flex-shrink-0 flex-col gap-2 overflow-y-auto border-r border-border bg-muted/30 p-2">
      {slides.map((slide, index) => (
        <button
          key={slide.id}
          onClick={() => onSelect(index)}
          className={cn(
            'relative rounded-md border transition-all',
            index === currentIndex
              ? 'border-primary ring-2 ring-primary/30'
              : 'border-border hover:border-primary/50',
          )}
        >
          {slide.previewUrl ? (
            <div className="aspect-video w-full overflow-hidden rounded-md bg-card">
              <img
                src={`/slides/${slide.id}/preview`}
                alt={slide.title}
                className="h-full w-full object-cover"
                loading="lazy"
              />
            </div>
          ) : (
            <SlideRenderer slide={slide} theme={theme} scale={0.35} />
          )}
          <span
            className={cn(
              'absolute bottom-0.5 right-1 text-[8px] font-medium',
              index === currentIndex ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {slide.slideNumber}
          </span>
        </button>
      ))}
    </div>
  );
}
