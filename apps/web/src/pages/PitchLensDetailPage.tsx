import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { ArrowLeft, Plus, Pencil, Star, FileText, Focus, Image, Coins } from 'lucide-react';

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PitchLensDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLens, isLoading, loadLens, setDefault } = usePitchLensStore();

  useEffect(() => {
    if (id) loadLens(id);
  }, [id, loadLens]);

  if (isLoading || !currentLens) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const presentations = currentLens.presentations;
  const frameworkName = currentLens.framework?.name ?? '';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/pitch-lens')}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('pitch_lenses.detail.back_to_lenses')}
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Focus className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{currentLens.name}</h1>
              {currentLens.description && (
                <p className="mt-1 text-sm text-muted-foreground">{currentLens.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!currentLens.isDefault && (
              <button
                onClick={() => id && setDefault(id)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Star className="h-4 w-4" />
                {t('pitch_lenses.detail.set_default')}
              </button>
            )}
            <button
              onClick={() => navigate(`/pitch-lens/${id}/edit`)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Pencil className="h-4 w-4" />
              {t('common.edit')}
            </button>
          </div>
        </div>
      </div>

      {/* Lens Summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: t('pitch_lenses.detail.audience'), value: formatEnum(currentLens.audienceType) },
          { label: t('pitch_lenses.detail.goal'), value: formatEnum(currentLens.pitchGoal) },
          { label: t('pitch_lenses.detail.industry'), value: currentLens.industry },
          { label: t('pitch_lenses.detail.stage'), value: formatEnum(currentLens.companyStage) },
          { label: t('pitch_lenses.detail.tone'), value: formatEnum(currentLens.toneStyle) },
          { label: t('pitch_lenses.detail.technical_level'), value: formatEnum(currentLens.technicalLevel) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Image Settings */}
      <div className="mb-8 rounded-lg border border-border bg-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <Image className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">{t('pitch_lenses.detail.image_settings')}</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Background Images</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {currentLens.backgroundImageFrequency === 0
                ? t('pitch_lenses.detail.image_none')
                : currentLens.backgroundImageFrequency <= 2
                  ? t('pitch_lenses.detail.image_many')
                  : currentLens.backgroundImageFrequency <= 3
                    ? t('pitch_lenses.detail.image_some')
                    : t('pitch_lenses.detail.image_few')}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentLens.backgroundImageFrequency === 0
                ? t('pitch_lenses.detail.image_freq_none')
                : t('pitch_lenses.detail.image_freq', { n: currentLens.backgroundImageFrequency })}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Side Panel Images</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {currentLens.sidePanelImageFrequency === 0
                ? t('pitch_lenses.detail.image_none')
                : currentLens.sidePanelImageFrequency <= 2
                  ? t('pitch_lenses.detail.image_many')
                  : currentLens.sidePanelImageFrequency <= 3
                    ? t('pitch_lenses.detail.image_some')
                    : t('pitch_lenses.detail.image_few')}
            </p>
            <p className="text-xs text-muted-foreground">
              {currentLens.sidePanelImageFrequency === 0
                ? t('pitch_lenses.detail.image_freq_none')
                : t('pitch_lenses.detail.image_freq', { n: currentLens.sidePanelImageFrequency })}
            </p>
          </div>
          {(currentLens.backgroundImageFrequency > 0 || currentLens.sidePanelImageFrequency > 0) && currentLens.framework?.idealSlideRange && (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">{t('pitch_lenses.detail.estimated_images')}</p>
              {(() => {
                const bgF = currentLens.backgroundImageFrequency;
                const spF = currentLens.sidePanelImageFrequency;
                const range = currentLens.framework.idealSlideRange;
                const bgCount = bgF > 0 ? Math.max(1, Math.floor(range.max / bgF)) : 0;
                const spCount = spF > 0 ? Math.max(1, Math.floor(range.max / spF)) : 0;
                // Unique images: some slides may overlap (side panel wins), so estimate unique count
                const totalUnique = Math.min(range.max, bgCount + spCount);
                return (
                  <div className="mt-1 flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-foreground">
                      ~{totalUnique} {t('common.images')}
                    </p>
                    <Coins className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-xs text-amber-600 dark:text-amber-400">
                      ~{totalUnique} {t('common.credits')}
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Framework */}
      {currentLens.framework && (
        <div className="mb-8 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            {t('pitch_lenses.detail.framework_title', { name: frameworkName })}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {currentLens.framework.shortDescription}
          </p>
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">{t('pitch_lenses.detail.slide_structure')}</h3>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              {currentLens.framework.slideStructure.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Custom Guidance */}
      {currentLens.customGuidance && (
        <div className="mb-8 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-medium text-foreground">{t('pitch_lenses.detail.custom_guidance')}</h2>
          <p className="text-sm text-muted-foreground">{currentLens.customGuidance}</p>
        </div>
      )}

      {/* Presentations */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t('pitch_lenses.detail.presentations_title', { count: presentations.length })}
          </h2>
          <button
            onClick={() => navigate(`/workspace/new?lensId=${id}`)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('pitch_lenses.detail.new_presentation')}
          </button>
        </div>

        {presentations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('pitch_lenses.detail.no_presentations')}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {presentations.map((pres) => (
              <div
                key={pres.id}
                onClick={() => navigate(`/workspace/${pres.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div>
                  <p className="font-medium text-foreground">{pres.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEnum(pres.presentationType)} &middot; {formatEnum(pres.status)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(pres.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PitchLensDetailPage;
