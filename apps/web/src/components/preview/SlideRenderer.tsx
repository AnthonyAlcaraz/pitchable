import { cn } from '@/lib/utils';
import type { SlideData } from '@/stores/presentation.store';

interface SlideRendererProps {
  slide: SlideData;
  className?: string;
  scale?: number;
  onClick?: () => void;
}

const SLIDE_ASPECT_RATIO = 16 / 9;

/**
 * Renders a single slide with theme-aware styling.
 * Aspect ratio locked at 16:9.
 */
export function SlideRenderer({ slide, className, scale = 1, onClick }: SlideRendererProps) {
  const isTitle = slide.slideType === 'TITLE';
  const isCTA = slide.slideType === 'CTA';
  const isQuote = slide.slideType === 'QUOTE';

  // Parse bullet points from body
  const bodyLines = slide.body.split('\n').filter((l) => l.trim().length > 0);
  const hasBullets = bodyLines.some((l) => l.trim().startsWith('-') || l.trim().startsWith('•'));

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        onClick && 'cursor-pointer transition-shadow hover:shadow-md',
        className,
      )}
      style={{
        aspectRatio: `${SLIDE_ASPECT_RATIO}`,
        fontSize: `${scale * 100}%`,
      }}
      onClick={onClick}
    >
      <div className="flex h-full flex-col p-[6%]">
        {/* Slide type badge */}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.5em] font-medium text-primary">
            {slide.slideType.replace('_', ' ')}
          </span>
          <span className="text-[0.45em] text-muted-foreground">
            Slide {slide.slideNumber}
          </span>
        </div>

        {/* Title */}
        <h2
          className={cn(
            'font-heading font-bold leading-tight text-foreground',
            isTitle ? 'mb-auto text-[1.8em]' : 'mb-3 text-[1.2em]',
            isCTA && 'text-center',
            isQuote && 'italic',
          )}
        >
          {slide.title}
        </h2>

        {/* Body content */}
        {!isTitle && slide.body && (
          <div
            className={cn(
              'flex-1 text-[0.75em] leading-relaxed text-foreground/80',
              isCTA && 'flex items-center justify-center text-center',
              isQuote && 'flex items-center justify-center italic',
            )}
          >
            {hasBullets ? (
              <ul className="space-y-1">
                {bodyLines.map((line, i) => {
                  const text = line.replace(/^[-•]\s*/, '').trim();
                  if (!text) return null;
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-[0.3em] h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary" />
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="whitespace-pre-wrap">{slide.body}</p>
            )}
          </div>
        )}

        {/* Title slide subtitle */}
        {isTitle && slide.body && (
          <div className="text-[0.9em] text-muted-foreground">{slide.body}</div>
        )}
      </div>

      {/* Background image overlay */}
      {slide.imageUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${slide.imageUrl})` }}
        />
      )}
    </div>
  );
}
