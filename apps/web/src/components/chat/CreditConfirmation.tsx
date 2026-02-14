import { useState } from 'react';
import { Coins, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CreditConfirmationProps {
  action: string;
  creditCost: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CreditConfirmation({
  action,
  creditCost,
  onConfirm,
  onCancel,
}: CreditConfirmationProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = () => {
    setIsConfirming(true);
    onConfirm();
  };

  return (
    <div className="mx-3 my-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="flex items-start gap-3">
        <Coins className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">{action}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            This will use <span className="font-medium text-amber-500">{creditCost}</span>{' '}
            {creditCost === 1 ? 'credit' : 'credits'}.
          </p>
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className={cn(
            'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            isConfirming
              ? 'bg-primary/50 text-primary-foreground'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <Check className="h-3.5 w-3.5" />
          {isConfirming ? 'Processing...' : 'Confirm'}
        </button>
        <button
          onClick={onCancel}
          disabled={isConfirming}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Cancel
        </button>
      </div>
    </div>
  );
}
