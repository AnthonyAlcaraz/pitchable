import { Coins } from 'lucide-react';
import { useAuthStore } from '../../stores/auth.store.js';
import { cn } from '../../lib/utils.js';

interface CreditBadgeProps {
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export function CreditBadge({ className, showIcon = true, size = 'sm' }: CreditBadgeProps) {
  const creditBalance = useAuthStore((s) => s.user?.creditBalance ?? 0);

  return (
    <div className={cn(
      'flex items-center gap-1 rounded-full bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400',
      size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
      className,
    )}>
      {showIcon && <Coins className={size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
      <span>{creditBalance}</span>
    </div>
  );
}
