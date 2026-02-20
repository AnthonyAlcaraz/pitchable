import { useTranslation } from 'react-i18next';
import { Layers } from 'lucide-react';

interface DeckProgressHeaderProps {
  current: number;
  total: number;
  label: string;
  isComplete: boolean;
}

export function DeckProgressHeader({ current, total, label, isComplete }: DeckProgressHeaderProps) {
  const { t } = useTranslation();
  const percent = Math.round((current / total) * 100);

  return (
    <div className="border-b border-border bg-card/80 px-4 py-3">
      {/* Header row */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-foreground">
            {isComplete ? t('chat.progress.generated') : t('chat.progress.generating')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {t('chat.progress.slide_count', { current, total })}
          </span>
          <span className="text-xs font-mono font-semibold text-primary tabular-nums">
            {percent}%
          </span>
        </div>
      </div>

      {/* Current slide label */}
      {!isComplete && label && (
        <p className="mb-2 truncate text-xs text-muted-foreground">
          {t('chat.progress.current_label', { label })}
        </p>
      )}

      {/* Progress bar */}
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
