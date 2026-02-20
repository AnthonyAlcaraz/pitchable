import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const STATUS_CLASSNAMES = {
  UPLOADED: 'bg-orange-500/10 text-orange-400',
  PARSING: 'bg-yellow-500/10 text-yellow-400 animate-pulse',
  EMBEDDING: 'bg-purple-500/10 text-purple-400 animate-pulse',
  READY: 'bg-green-500/10 text-green-400',
  ERROR: 'bg-red-500/10 text-red-400',
} as const;

type DocumentStatus = keyof typeof STATUS_CLASSNAMES;

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useTranslation();

  const STATUS_LABELS: Record<DocumentStatus, string> = {
    UPLOADED: t('knowledge_base.status_UPLOADED'),
    PARSING: t('knowledge_base.status_PARSING'),
    EMBEDDING: t('knowledge_base.status_EMBEDDING'),
    READY: t('knowledge_base.status_READY'),
    ERROR: t('knowledge_base.status_ERROR'),
  };

  const className = STATUS_CLASSNAMES[status] || STATUS_CLASSNAMES.UPLOADED;
  const label = STATUS_LABELS[status] || STATUS_LABELS.UPLOADED;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {label}
    </span>
  );
}
