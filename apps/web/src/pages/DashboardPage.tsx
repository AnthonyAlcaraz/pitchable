import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { usePresentationsStore } from '@/stores/presentations.store';
import type { PresentationListItem } from '@/stores/presentations.store';
import { PresentationGrid } from '@/components/dashboard/PresentationGrid';
import { ForkDialog } from '@/components/dashboard/ForkDialog';
import { CreditCard, FileText, BarChart3, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';

export function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const presentations = usePresentationsStore((s) => s.presentations);
  const isLoading = usePresentationsStore((s) => s.isLoading);
  const loadPresentations = usePresentationsStore((s) => s.loadPresentations);
  const deletePresentation = usePresentationsStore((s) => s.deletePresentation);
  const duplicatePresentation = usePresentationsStore((s) => s.duplicatePresentation);
  const renamePresentation = usePresentationsStore((s) => s.renamePresentation);
  const forkPresentation = usePresentationsStore((s) => s.forkPresentation);
  const toggleVisibility = usePresentationsStore((s) => s.toggleVisibility);

  const [forkTarget, setForkTarget] = useState<PresentationListItem | null>(null);
  const [deckStats, setDeckStats] = useState<{ decksUsed: number; decksLimit: number | null } | null>(null);

  useEffect(() => {
    loadPresentations();
    api.get<{ decksUsed: number; decksLimit: number | null }>('/credits/tier-status')
      .then((s) => setDeckStats({ decksUsed: s.decksUsed, decksLimit: s.decksLimit }))
      .catch(() => {});
  }, [loadPresentations]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {user && !user.onboardingCompleted && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
          <div>
            <p className="text-sm font-medium text-foreground">
              {t('dashboard.onboarding_banner')}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('dashboard.onboarding_banner_subtitle')}
            </p>
          </div>
          <button
            onClick={() => navigate('/onboarding')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t('dashboard.resume_setup')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          {t('dashboard.welcome', { name: user?.name ?? 'there' })}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.credit_balance')}</p>
              <p className="text-xl font-semibold text-foreground">
                {user?.creditBalance ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.presentations')}</p>
              <p className="text-xl font-semibold text-foreground">
                {presentations.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.decks_this_month')}</p>
              <p className="text-xl font-semibold text-foreground">
                {deckStats?.decksUsed ?? 0}
                {deckStats?.decksLimit !== null && deckStats?.decksLimit !== undefined && (
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}/ {deckStats.decksLimit}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Presentations grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <PresentationGrid
          presentations={presentations}
          onDelete={deletePresentation}
          onDuplicate={duplicatePresentation}
          onRename={renamePresentation}
          onFork={(id) => {
            const p = presentations.find((x) => x.id === id);
            if (p) setForkTarget(p);
          }}
          onToggleVisibility={toggleVisibility}
        />
      )}

      {forkTarget && (
        <ForkDialog
          presentation={forkTarget}
          onFork={async (overrides) => {
            const newId = await forkPresentation(forkTarget.id, overrides);
            setForkTarget(null);
            if (newId) navigate(`/workspace/${newId}`);
          }}
          onClose={() => setForkTarget(null)}
        />
      )}
    </div>
  );
}

export default DashboardPage;
