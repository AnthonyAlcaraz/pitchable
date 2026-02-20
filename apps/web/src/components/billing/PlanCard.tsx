import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanCardProps {
  name: string;
  price: string;
  description: string;
  features: string[];
  isCurrent: boolean;
  isPopular?: boolean;
  onSelect?: () => void;
  isLoading?: boolean;
}

export function PlanCard({
  name,
  price,
  description,
  features,
  isCurrent,
  isPopular,
  onSelect,
  isLoading,
}: PlanCardProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-lg border bg-card p-6',
        isPopular ? 'border-primary shadow-md' : 'border-border',
      )}
    >
      {isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
          {t('billing.plans.popular')}
        </span>
      )}

      <h3 className="text-lg font-semibold text-foreground">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>

      <div className="mt-4">
        <span className="text-3xl font-bold text-foreground">{price}</span>
        {price !== t('billing.plans.free_price') && (
          <span className="text-sm text-muted-foreground">{t('billing.plans.per_month')}</span>
        )}
      </div>

      <ul className="mt-6 flex-1 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        {isCurrent ? (
          <div className="w-full rounded-md border border-primary bg-primary/5 py-2 text-center text-sm font-medium text-primary">
            {t('billing.plans.current_plan')}
          </div>
        ) : (
          <button
            onClick={onSelect}
            disabled={isLoading}
            className={cn(
              'w-full rounded-md py-2 text-sm font-medium transition-colors',
              isPopular
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              isLoading && 'cursor-not-allowed opacity-50',
            )}
          >
            {isLoading ? t('common.loading') : t('common.upgrade')}
          </button>
        )}
      </div>
    </div>
  );
}
