interface SlidePreviewCardProps {
  slideNumber: number;
  title: string;
  body: string;
  slideType: string;
  className?: string;
  sources?: string[];
}

export function SlidePreviewCard({
  slideNumber,
  title,
  body,
  slideType,
  className = '',
  sources,
}: SlidePreviewCardProps) {
  // Parse bullet points from body
  const lines = body.split('\n').filter((l) => l.trim().length > 0);
  const hasBullets = lines.some(
    (l) => l.trim().startsWith('-') || l.trim().startsWith('•'),
  );

  return (
    <div
      className={`rounded-lg border border-border bg-card overflow-hidden border-l-2 border-l-orange-500/40 ${className}`}
      style={{ aspectRatio: '16/9', maxWidth: '320px' }}
    >
      <div className="flex h-full flex-col p-3">
        {/* Header */}
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded bg-orange-500/10 px-1 py-0.5 text-[9px] font-medium text-orange-400">
            {slideType.replace('_', ' ')}
          </span>
          <span className="text-[9px] text-muted-foreground">
            #{slideNumber}
          </span>
        </div>

        {/* Title */}
        <h5 className="mb-1 text-sm font-bold leading-tight text-foreground line-clamp-2">
          {title}
        </h5>

        {/* Body preview */}
        <div className="flex-1 overflow-hidden">
          {hasBullets ? (
            <ul className="space-y-1.5">
              {lines.slice(0, 4).map((line, i) => (
                <li key={i} className="text-[10px] leading-relaxed text-foreground/60 truncate">
                  {line.replace(/^[-•]\s*/, '• ')}
                </li>
              ))}
              {lines.length > 4 && (
                <li className="text-[9px] text-muted-foreground">
                  +{lines.length - 4} more...
                </li>
              )}
            </ul>
          ) : (
            <p className="text-[9px] leading-tight text-foreground/60 line-clamp-4">
              {body}
            </p>
          )}
        </div>

        {/* Source attribution */}
        {sources && sources.length > 0 && (
          <div className="mt-auto pt-1 border-t border-border/30">
            <p className="text-[8px] text-muted-foreground/50 truncate">
              {sources.length === 1 ? `Source: ${sources[0]}` : `${sources.length} sources`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
