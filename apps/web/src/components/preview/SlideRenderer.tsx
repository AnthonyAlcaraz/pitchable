import { cn } from '@/lib/utils';
import type { SlideData, ThemeData } from '@/stores/presentation.store';
import { MarkdownBody } from './MarkdownBody';

/** Convert theme colorPalette to CSS custom property overrides for scoped theming */
export function themeToStyleVars(theme?: ThemeData | null): React.CSSProperties | undefined {
  if (!theme?.colorPalette) return undefined;
  const p = theme.colorPalette;
  return {
    '--color-card': p.surface ?? p.background,
    '--color-card-foreground': p.text,
    '--color-primary': p.primary,
    '--color-foreground': p.text,
    '--color-muted-foreground': p.secondary,
    '--color-border': p.border ?? p.secondary,
    '--color-background': p.background,
  } as React.CSSProperties;
}

interface SlideRendererProps {
  slide: SlideData;
  theme?: ThemeData | null;
  className?: string;
  scale?: number;
  onClick?: () => void;
}

const SLIDE_ASPECT_RATIO = 16 / 9;

/**
 * Renders a single slide with theme-aware styling.
 * Aspect ratio locked at 16:9. When a theme is passed, CSS custom properties
 * are scoped to the slide container so Tailwind tokens resolve to theme colors.
 */
export function SlideRenderer({ slide, theme, className, scale = 1, onClick }: SlideRendererProps) {
  const isTitle = slide.slideType === 'TITLE';
  const isCTA = slide.slideType === 'CTA';
  const isQuote = slide.slideType === 'QUOTE';

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
        ...themeToStyleVars(theme),
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
          <MarkdownBody
            className={cn(
              'flex-1 text-[0.75em] leading-relaxed text-foreground/80',
              isCTA && 'flex items-center justify-center text-center',
              isQuote && 'flex items-center justify-center italic',
            )}
          >
            {slide.body}
          </MarkdownBody>
        )}

        {/* Title slide subtitle */}
        {isTitle && slide.body && (
          <MarkdownBody className="text-[0.9em] text-muted-foreground">{slide.body}</MarkdownBody>
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
