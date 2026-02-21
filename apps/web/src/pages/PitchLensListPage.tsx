import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { useBillingStore } from '@/stores/billing.store';
import { Plus, Focus, Star, Trash2, Image, Coins, Lock } from 'lucide-react';

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function lensOneLiner(lens: { audienceType: string; pitchGoal: string; toneStyle: string; industry: string; selectedFramework: string }): string {
  return `${formatEnum(lens.toneStyle)} ${formatEnum(lens.pitchGoal).toLowerCase()} for ${formatEnum(lens.audienceType).toLowerCase()} in ${lens.industry}, using ${formatEnum(lens.selectedFramework)}`;
}

export function PitchLensListPage() {
  const { t } = useTranslation();
  const { lenses, isLoading, loadLenses, deleteLens } = usePitchLensStore();
  const { tierStatus, loadTierStatus } = useBillingStore();
  const navigate = useNavigate();
  const atLimit = tierStatus ? tierStatus.lensesUsed >= tierStatus.lensesLimit : false;

  useEffect(() => { loadLenses(); loadTierStatus(); }, [loadLenses, loadTierStatus]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{t('pitch_lenses.list.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('pitch_lenses.list.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {tierStatus && (
            <span className="text-xs text-muted-foreground">
              {tierStatus.lensesUsed}/{tierStatus.lensesLimit}
            </span>
          )}
          {atLimit ? (
            <button
              disabled
              className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 text-sm font-medium text-muted-foreground cursor-not-allowed"
              title={t('common.upgrade_to_create_more')}
            >
              <Lock className="h-4 w-4" />
              {t('pitch_lenses.list.new_lens')}
            </button>
          ) : (
            <button
              onClick={() => navigate('/pitch-lens/new')}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t('pitch_lenses.list.new_lens')}
            </button>
          )}
        </div>
      </div>

      {atLimit && (
        <div className="mb-6 flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-amber-400" />
            <p className="text-sm text-amber-400">{t('pitch_lenses.list.limit_banner')}</p>
          </div>
          <Link to="/billing" className="text-sm font-medium text-primary hover:underline">
            {t('pitch_lenses.list.limit_banner_cta')}
          </Link>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : lenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
          <Focus className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="mb-2 text-lg font-semibold text-foreground">{t('pitch_lenses.list.no_lenses_title')}</h2>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            {t('pitch_lenses.list.no_lenses_desc')}
          </p>
          <button
            onClick={() => navigate('/pitch-lens/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('pitch_lenses.list.create_first_lens')}
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lenses.map((lens) => (
            <div
              key={lens.id}
              onClick={() => navigate(`/pitch-lens/${lens.id}`)}
              className="group cursor-pointer rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Focus className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{lens.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {lens.isDefault && (
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(t('pitch_lenses.list.confirm_delete'))) deleteLens(lens.id);
                    }}
                    className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>

              <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">
                {lens.description || lensOneLiner(lens)}
              </p>

              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {formatEnum(lens.audienceType)}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {formatEnum(lens.pitchGoal)}
                </span>
                {lens.framework && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    {lens.framework.name}
                  </span>
                )}
              </div>

              {/* Image generation info */}
              {(lens.backgroundImageFrequency > 0 || lens.sidePanelImageFrequency > 0) && lens.framework?.idealSlideRange && (() => {
                const bgF = lens.backgroundImageFrequency;
                const spF = lens.sidePanelImageFrequency;
                const range = lens.framework.idealSlideRange;
                const bgCount = bgF > 0 ? Math.max(1, Math.floor(range.max / bgF)) : 0;
                const spCount = spF > 0 ? Math.max(1, Math.floor(range.max / spF)) : 0;
                const totalUnique = Math.min(range.max, bgCount + spCount);
                const labels: string[] = [];
                if (bgF > 0) labels.push('bg');
                if (spF > 0) labels.push('side');
                return (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Image className="h-3 w-3 shrink-0" />
                    <span>~{totalUnique} {t('common.images')}</span>
                    <span>&middot;</span>
                    <span>{labels.join(' + ')}</span>
                    <Coins className="ml-auto h-3 w-3 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400">
                      ~{totalUnique}
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{lens.presentationCount} {lens.presentationCount !== 1 ? t('common.presentations') : t('common.presentation')}</span>
                <span>{lens.industry}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PitchLensListPage;
