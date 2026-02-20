import type { InlineSlideCard as InlineSlideCardType } from '../../stores/chat.store.js';
import type { ThemeData } from '../../stores/presentation.store.js';
import { themeToStyleVars } from '../preview/SlideRenderer.js';
import { MarkdownBody } from '../preview/MarkdownBody.js';

interface InlineSlideCardProps {
  slide: InlineSlideCardType;
  theme?: ThemeData | null;
  onClick?: () => void;
}

export function InlineSlideCard({ slide, theme, onClick }: InlineSlideCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors cursor-pointer text-left"
      style={{ width: '240px', aspectRatio: '16/9', ...themeToStyleVars(theme) }}
    >
      <div className="flex h-full flex-col p-2.5">
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded bg-primary/10 px-1 py-0.5 text-[8px] font-medium text-primary">
            {slide.slideType.replace('_', ' ')}
          </span>
          <span className="text-[8px] text-muted-foreground">#{slide.slideNumber}</span>
        </div>

        <h5 className="mb-1 text-[10px] font-bold leading-tight text-foreground line-clamp-1">
          {slide.title}
        </h5>

        <div className="flex-1 overflow-hidden line-clamp-3">
          <MarkdownBody compact className="text-[8px] leading-tight text-foreground/50">
            {slide.body}
          </MarkdownBody>
        </div>
      </div>
    </button>
  );
}
