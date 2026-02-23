import { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SlideRenderer } from './SlideRenderer';
import { Check, ChevronRight } from 'lucide-react';
import { usePresentationStore } from '@/stores/presentation.store';
import type { SlideData, ThemeData, SlideVerificationEntry } from '@/stores/presentation.store';
import { CircularProgress } from '@/components/ui/CircularProgress';

interface ThumbnailSidebarProps {
  slides: SlideData[];
  currentIndex: number;
  onSelect: (index: number) => void;
  theme?: ThemeData | null;
  approvedSlides?: number[];
  slideVerification?: Map<string, SlideVerificationEntry>;
}

export function ThumbnailSidebar({ slides, currentIndex, onSelect, theme, approvedSlides, slideVerification }: ThumbnailSidebarProps) {
  const cacheBuster = usePresentationStore((s) => s.previewCacheBuster);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentIndex]);

  if (slides.length === 0) return null;

  return (
    <div className="flex w-40 flex-shrink-0 flex-col gap-1.5 overflow-y-auto border-r border-border bg-muted/30 p-1.5">
      {slides.map((slide, index) => {
        const isApproved = approvedSlides?.includes(index);
        const isCurrent = index === currentIndex;
        const verification = slideVerification?.get(slide.id);
        const isVerifying = verification?.status === 'verifying';
        const isVerified = verification?.status === 'verified' || verification?.status === 'fixed';

        return (
          <button
            key={slide.id}
            ref={isCurrent ? activeRef : undefined}
            onClick={() => onSelect(index)}
            className={cn(
              'relative rounded-md border transition-all',
              isCurrent
                ? 'border-primary ring-2 ring-primary/30'
                : isApproved
                  ? 'border-green-500/50 hover:border-primary/50'
                  : isVerified
                    ? 'border-teal-500/40 hover:border-primary/50'
                    : 'border-border hover:border-primary/50',
            )}
          >
            {slide.previewUrl ? (
              <div className="aspect-video w-full overflow-hidden rounded-md bg-card">
                <img
                  src={`/slides/${slide.id}/preview?v=${cacheBuster}`}
                  alt={slide.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            ) : (
              <SlideRenderer slide={slide} theme={theme} scale={0.18} />
            )}
            {/* Slide number */}
            <span
              className={cn(
                'absolute bottom-0.5 left-1 text-[7px] font-medium',
                isCurrent ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              {slide.slideNumber}
            </span>
            {/* Approval checkmark (review flow) */}
            {approvedSlides && isApproved && (
              <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-500 shadow-sm">
                <Check className="h-2 w-2 text-white" />
              </div>
            )}
            {/* Current unapproved arrow (review flow) */}
            {approvedSlides && isCurrent && !isApproved && (
              <div className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-orange-500 shadow-sm">
                <ChevronRight className="h-2 w-2 text-white" />
              </div>
            )}
            {/* Verification progress indicator (generation flow) */}
            {verification && !approvedSlides && (
              <div className="absolute -right-1 -top-1">
                {isVerifying ? (
                  <CircularProgress
                    percent={30}
                    size={18}
                    strokeWidth={2}
                    status="verifying"
                    indeterminate
                  />
                ) : isVerified ? (
                  <CircularProgress
                    percent={100}
                    size={18}
                    strokeWidth={2}
                    status={verification.status === 'fixed' ? 'fixed' : 'verified'}
                    showCheck
                  />
                ) : (
                  <CircularProgress
                    percent={50}
                    size={18}
                    strokeWidth={2}
                    status="generating"
                    indeterminate
                  />
                )}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
