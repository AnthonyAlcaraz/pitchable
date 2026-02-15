import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  UPLOADED: { label: 'Uploaded', className: 'bg-orange-500/10 text-orange-400' },
  PARSING: { label: 'Parsing', className: 'bg-yellow-500/10 text-yellow-400 animate-pulse' },
  EMBEDDING: { label: 'Embedding', className: 'bg-purple-500/10 text-purple-400 animate-pulse' },
  READY: { label: 'Ready', className: 'bg-green-500/10 text-green-400' },
  ERROR: { label: 'Error', className: 'bg-red-500/10 text-red-400' },
} as const;

type DocumentStatus = keyof typeof STATUS_CONFIG;

export function DocumentStatusBadge({ status }: { status: DocumentStatus }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UPLOADED;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}
