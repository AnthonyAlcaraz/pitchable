import { useTranslation } from 'react-i18next';
import { CircularProgress } from '@/components/ui/CircularProgress';

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
      <div className="flex items-center gap-3">
        {/* Circular progress indicator */}
        <CircularProgress
          percent={percent}
          size={48}
          strokeWidth={3.5}
          status={isComplete ? 'verified' : 'generating'}
          showCheck={isComplete}
          label={isComplete ? undefined : `${percent}%`}
        />

        {/* Text info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">
              {isComplete ? t('chat.progress.generated') : t('chat.progress.generating')}
            </span>
            <span className="text-xs font-mono text-muted-foreground tabular-nums">
              {t('chat.progress.slide_count', { current, total })}
            </span>
          </div>
          {!isComplete && label && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {t('chat.progress.current_label', { label })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
