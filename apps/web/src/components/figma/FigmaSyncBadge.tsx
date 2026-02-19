import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface FigmaSyncBadgeProps {
  figmaLastSyncAt?: string | null;
  figmaSyncVersion?: number;
  imageSource: string;
  figmaNodeId?: string | null;
}

/**
 * Visual sync status indicator for Figma-sourced slides.
 * Green: synced recently (within 5 min)
 * Yellow: synced but stale (> 5 min ago)
 * Red: never synced / error
 */
export function FigmaSyncBadge({
  figmaLastSyncAt,
  figmaSyncVersion,
  imageSource,
  figmaNodeId,
}: FigmaSyncBadgeProps) {
  if (imageSource !== 'FIGMA' || !figmaNodeId) return null;

  let color: string;
  let label: string;

  if (!figmaLastSyncAt) {
    color = 'bg-gray-400';
    label = 'Not synced';
  } else {
    const lastSync = new Date(figmaLastSyncAt);
    const ageMs = Date.now() - lastSync.getTime();
    const fiveMin = 5 * 60 * 1000;

    if (ageMs < fiveMin) {
      color = 'bg-green-500';
      label = 'Synced';
    } else {
      color = 'bg-yellow-500';
      label = 'Stale';
    }
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[0.45em] text-white"
      title={`Figma sync: ${label}${figmaSyncVersion ? ` (v${figmaSyncVersion})` : ''}`}
    >
      <span className={cn('inline-block h-1.5 w-1.5 rounded-full', color)} />
      <RefreshCw className="h-2.5 w-2.5" />
    </span>
  );
}
