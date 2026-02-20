import type { InlineSlideCard as InlineSlideCardType } from '../../stores/chat.store.js';

interface InlineSlideCardProps {
  slide: InlineSlideCardType;
  onClick?: () => void;
}

export function InlineSlideCard({ slide, onClick }: InlineSlideCardProps) {
  const lines = slide.body.split('\n').filter((l) => l.trim().length > 0);
  const hasBullets = lines.some((l) => l.trim().startsWith('-') || l.trim().startsWith('•'));

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 rounded-lg border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors cursor-pointer text-left"
      style={{ width: '240px', aspectRatio: '16/9' }}
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

        <div className="flex-1 overflow-hidden">
          {hasBullets ? (
            <ul className="space-y-0.5">
              {lines.slice(0, 3).map((line, i) => (
                <li key={i} className="text-[8px] leading-tight text-foreground/50 truncate">
                  {line.replace(/^[-•]\s*/, '- ')}
                </li>
              ))}
              {lines.length > 3 && (
                <li className="text-[8px] text-muted-foreground">+{lines.length - 3} more</li>
              )}
            </ul>
          ) : (
            <p className="text-[8px] leading-tight text-foreground/50 line-clamp-3">{slide.body}</p>
          )}
        </div>
      </div>
    </button>
  );
}
