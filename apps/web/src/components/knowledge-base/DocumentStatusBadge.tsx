import { cn } from '@/lib/utils';

const STATUS_CONFIG = {
  UPLOADED: { label: 'Uploaded', className: 'bg-blue-100 text-blue-700' },
  PARSING: { label: 'Parsing', className: 'bg-yellow-100 text-yellow-700 animate-pulse' },
  EMBEDDING: { label: 'Embedding', className: 'bg-purple-100 text-purple-700 animate-pulse' },
  READY: { label: 'Ready', className: 'bg-green-100 text-green-700' },
  ERROR: { label: 'Error', className: 'bg-red-100 text-red-700' },
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
