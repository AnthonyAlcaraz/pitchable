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
          <Layers className="h-4 w-4" style={{ color: '#E88D67' }} />
          <span className="text-sm font-medium text-foreground">
            {isComplete ? t('chat.progress.generated') : t('chat.progress.generating')}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-muted-foreground tabular-nums">
            {t('chat.progress.slide_count', { current, total })}
          </span>
          <span className="text-xs font-mono font-semibold tabular-nums" style={{ color: '#E88D67' }}>
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
      <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: '#FFF0E6' }}>
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${percent}%`, background: 'linear-gradient(90deg, #FFAB76, #FF9F6B, #E88D67)' }}
        />
      </div>
    </div>
  );
}
