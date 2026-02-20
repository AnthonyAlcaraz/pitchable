import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { useBillingStore } from '@/stores/billing.store';
import { PlanCard } from '@/components/billing/PlanCard';
import { TransactionHistory } from '@/components/billing/TransactionHistory';
import { CreditCard, ExternalLink } from 'lucide-react';

const PLANS = [
  {
    tier: 'FREE' as const,
    name: 'Free Sample',
    price: 'Free',
    description: 'See what Pitchable can do',
    features: [
      '2 sample decks',
      '4 slides per deck (preview)',
      'No credit card required',
      'PPTX, PDF, HTML export',
    ],
  },
  {
    tier: 'STARTER' as const,
    name: 'Starter',
    price: '$19',
    description: 'For regular presenters',
    features: [
      '40 credits per month',
      '10 decks per month',
      'AI image generation',
      'Up to 15 slides per deck',
    ],
    isPopular: true,
  },
  {
    tier: 'PRO' as const,
    name: 'Pro',
    price: '$49',
    description: 'For power users and teams',
    features: [
      '100 credits per month',
      'Unlimited decks & slides',
      'AI image generation',
      'Priority support',
    ],
  },
];

export function BillingPage() {
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
    openPortal,
    clearError,
  } = useBillingStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const checkoutStatus = searchParams.get('status');

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

  const currentTier = user?.tier ?? 'FREE';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your subscription and credits
          </p>
        </div>
        {subscription && subscription.status === 'active' && (
          <button
            onClick={() => void handleManageSubscription()}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <ExternalLink className="h-4 w-4" />
            Manage Subscription
          </button>
        )}
      </div>

      {checkoutStatus === 'success' && (
        <div className="mb-6 rounded-md border border-green-200 bg-green-50 p-4 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          Subscription activated! Your credits have been allocated.
        </div>
      )}

      {error && (
        <div className="mb-6 flex items-center justify-between rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <span>{error}</span>
          <button onClick={clearError} className="font-medium underline">
            Dismiss
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
                <p className="text-sm text-muted-foreground">Credit Balance</p>
                <p className="text-xl font-semibold text-foreground">
                  {tierStatus.creditBalance}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <p className="text-sm text-muted-foreground">Decks This Month</p>
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
            <p className="text-sm text-muted-foreground">Image Credits / Month</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {tierStatus.imageCreditsPerMonth}
            </p>
            {tierStatus.creditsReserved > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                {tierStatus.creditsReserved} reserved
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

      {/* Transaction history */}
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">
          Transaction History
        </h2>
        <TransactionHistory transactions={transactions} />
      </section>
    </div>
  );
}

export default BillingPage;
