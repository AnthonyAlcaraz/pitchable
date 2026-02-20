import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useBillingStore } from '@/stores/billing.store';
import { PlanCard } from '@/components/billing/PlanCard';
import { TransactionHistory } from '@/components/billing/TransactionHistory';
import { CreditCard, ExternalLink, Zap } from 'lucide-react';

export function BillingPage() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const {
    subscription,
    transactions,
    tierStatus,
    isLoading,
    error,
    loadSubscription,
    loadTransactions,
    loadTierStatus,
    createCheckout,
    buyTopUp,
    openPortal,
    clearError,
  } = useBillingStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('status');

  const PLANS = [
    {
      tier: 'FREE' as const,
      name: t('billing.plans.free_name'),
      price: t('billing.plans.free_price'),
      description: t('billing.plans.free_description'),
      features: [
        t('billing.plans.free_feature_0'),
        t('billing.plans.free_feature_1'),
        t('billing.plans.free_feature_2'),
      ],
    },
    {
      tier: 'STARTER' as const,
      name: t('billing.plans.starter_name'),
      price: t('billing.plans.starter_price'),
      description: t('billing.plans.starter_description'),
      features: [
        t('billing.plans.starter_feature_0'),
        t('billing.plans.starter_feature_1'),
        t('billing.plans.starter_feature_2'),
        t('billing.plans.starter_feature_3'),
      ],
      isPopular: true,
    },
    {
      tier: 'PRO' as const,
      name: t('billing.plans.pro_name'),
      price: t('billing.plans.pro_price'),
      description: t('billing.plans.pro_description'),
      features: [
        t('billing.plans.pro_feature_0'),
        t('billing.plans.pro_feature_1'),
        t('billing.plans.pro_feature_2'),
        t('billing.plans.pro_feature_3'),
      ],
    },
  ];

  const CREDIT_PACKS = [
    { id: 'pack_10', credits: 10, price: '$7.99', perCredit: '$0.80' },
    { id: 'pack_25', credits: 25, price: '$14.99', perCredit: '$0.60' },
    { id: 'pack_50', credits: 50, price: '$24.99', perCredit: '$0.50' },
  ];

  useEffect(() => {
    void loadSubscription();
    void loadTransactions(20);
    void loadTierStatus();
  }, [loadSubscription, loadTransactions, loadTierStatus]);

  useEffect(() => {
    if (checkoutStatus === 'success') {
      // Refresh data after successful checkout
      void loadSubscription();
      void loadTierStatus();
      setSearchParams({}, { replace: true });
    } else if (checkoutStatus === 'cancel') {
      setSearchParams({}, { replace: true });
    }
  }, [checkoutStatus, loadSubscription, loadTierStatus, setSearchParams]);

  const handleUpgrade = async (tier: 'STARTER' | 'PRO') => {
    try {
      const url = await createCheckout(tier);
      window.location.href = url;
    } catch {
      // Error is handled in store
    }
  };

  const handleManageSubscription = async () => {
    try {
      const url = await openPortal();
      window.location.href = url;
    } catch {
      // Error is handled in store
    }
  };

  const handleBuyCredits = async (packId: string) => {
    try {
      const url = await buyTopUp(packId);
      window.location.href = url;
    } catch {
      // Error is handled in store
    }
  };

  const currentTier = user?.tier ?? 'FREE';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('billing.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('billing.subtitle')}
          </p>
        </div>
        {subscription && subscription.status === 'active' && (
          <button
            onClick={() => void handleManageSubscription()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            {t('billing.manage_subscription')}
          </button>
        )}
      </div>

      {checkoutStatus === 'success' && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          {t('billing.checkout_success')}
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <span>{error}</span>
          <button onClick={clearError} className="font-medium underline">
            {t('common.dismiss')}
          </button>
        </div>
      )}

      {/* Usage stats */}
      {tierStatus && (
        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('billing.credit_balance')}</p>
                <p className="text-xl font-semibold text-foreground">
                  {tierStatus.creditBalance}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t('billing.decks_this_month')}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {tierStatus.decksUsed}
              {tierStatus.decksLimit !== null && (
                <span className="text-sm font-normal text-muted-foreground">
                  {' '}/ {tierStatus.decksLimit}
                </span>
              )}
            </p>
            {tierStatus.decksLimit !== null && (
              <div className="mt-2 h-1.5 w-full rounded-full bg-secondary">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{
                    width: `${Math.min(100, (tierStatus.decksUsed / tierStatus.decksLimit) * 100)}%`,
                  }}
                />
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">{t('billing.credits_per_month')}</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {tierStatus.creditsPerMonth}
            </p>
            {tierStatus.creditsReserved > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t('billing.credits_reserved', { count: tierStatus.creditsReserved })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.tier}
            name={plan.name}
            price={plan.price}
            description={plan.description}
            features={plan.features}
            isCurrent={currentTier === plan.tier}
            isPopular={plan.isPopular}
            isLoading={isLoading}
            onSelect={
              plan.tier !== 'FREE'
                ? () => void handleUpgrade(plan.tier as 'STARTER' | 'PRO')
                : undefined
            }
          />
        ))}
      </div>

      {/* Credit top-up packs */}
      <section className="mb-8">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {t('billing.credit_packs.title')}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <div
              key={pack.id}
              className="flex flex-col justify-between rounded-lg border border-border bg-card p-5"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" />
                  <span className="text-lg font-semibold text-foreground">
                    {t('billing.credit_packs.credits_label', { count: pack.credits })}
                  </span>
                </div>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  {pack.price}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t('billing.credit_packs.per_credit', { price: pack.perCredit })}
                </p>
              </div>
              <button
                onClick={() => void handleBuyCredits(pack.id)}
                disabled={isLoading}
                className="mt-4 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {t('billing.credit_packs.buy_credits')}
              </button>
            </div>
          ))}
        </div>
        {currentTier === 'FREE' || currentTier === 'STARTER' ? (
          <p className="mt-3 text-sm text-muted-foreground">
            {currentTier === 'FREE'
              ? t('billing.credit_packs.save_more_free')
              : t('billing.credit_packs.save_more_starter')}
          </p>
        ) : null}
      </section>

      {/* Transaction history */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          {t('billing.transaction_history.title')}
        </h2>
        <TransactionHistory transactions={transactions} />
      </section>
    </div>
  );
}

export default BillingPage;
