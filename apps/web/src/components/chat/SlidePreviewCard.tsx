interface SlidePreviewCardProps {
  slideNumber: number;
  title: string;
  body: string;
  slideType: string;
  className?: string;
}

export function SlidePreviewCard({
  slideNumber,
  title,
  body,
  slideType,
  className = '',
}: SlidePreviewCardProps) {
  // Parse bullet points from body
  const lines = body.split('\n').filter((l) => l.trim().length > 0);
  const hasBullets = lines.some(
    (l) => l.trim().startsWith('-') || l.trim().startsWith('•'),
  );

  return (
    <div
      className={`rounded-lg border border-border bg-card overflow-hidden ${className}`}
      style={{ aspectRatio: '16/9', maxWidth: '280px' }}
    >
      <div className="flex h-full flex-col p-3">
        {/* Header */}
        <div className="mb-1 flex items-center gap-1.5">
          <span className="rounded bg-primary/10 px-1 py-0.5 text-[9px] font-medium text-primary">
            {slideType.replace('_', ' ')}
          </span>
          <span className="text-[9px] text-muted-foreground">
            #{slideNumber}
          </span>
        </div>

        {/* Title */}
        <h5 className="mb-1 text-xs font-bold leading-tight text-foreground line-clamp-2">
          {title}
        </h5>

        {/* Body preview */}
        <div className="flex-1 overflow-hidden">
          {hasBullets ? (
            <ul className="space-y-0.5">
              {lines.slice(0, 4).map((line, i) => (
                <li key={i} className="text-[9px] leading-tight text-foreground/60 truncate">
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
      </div>
    </div>
  );
}
