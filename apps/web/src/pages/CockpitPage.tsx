import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Gauge,
  Plus,
  BookOpen,
  Focus,
  CreditCard,
  FileText,
  BarChart3,
  ArrowRight,
  ChevronDown,
  GitFork,
  Sparkles,
  Image,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { usePresentationsStore } from '@/stores/presentations.store';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { PresentationGrid } from '@/components/dashboard/PresentationGrid';
import { ForkDialog } from '@/components/dashboard/ForkDialog';
import type { PresentationListItem } from '@/stores/presentations.store';
import { api } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  EMPTY: 'bg-gray-500/10 text-gray-400',
  PROCESSING: 'bg-yellow-500/10 text-yellow-500',
  READY: 'bg-green-500/10 text-green-500',
  ERROR: 'bg-red-500/10 text-red-500',
};

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function CockpitPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const presentations = usePresentationsStore((s) => s.presentations);
  const presentationsLoading = usePresentationsStore((s) => s.isLoading);
  const loadPresentations = usePresentationsStore((s) => s.loadPresentations);
  const deletePresentation = usePresentationsStore((s) => s.deletePresentation);
  const duplicatePresentation = usePresentationsStore((s) => s.duplicatePresentation);
  const renamePresentation = usePresentationsStore((s) => s.renamePresentation);
  const forkPresentation = usePresentationsStore((s) => s.forkPresentation);
  const toggleVisibility = usePresentationsStore((s) => s.toggleVisibility);
  const { briefs, isLoading: briefsLoading, loadBriefs } = usePitchBriefStore();
  const { lenses, isLoading: lensesLoading, loadLenses } = usePitchLensStore();

  const [selectedBriefId, setSelectedBriefId] = useState('');
  const [selectedLensId, setSelectedLensId] = useState('');
  const [selectedSourceId, setSelectedSourceId] = useState('');
  const [forkTarget, setForkTarget] = useState<PresentationListItem | null>(null);
  const [, setDeckStats] = useState<{ decksUsed: number; decksLimit: number | null } | null>(null);

  useEffect(() => {
    loadPresentations();
    loadBriefs();
    loadLenses();
    api.get<{ decksUsed: number; decksLimit: number | null }>('/credits/tier-status')
      .then((s) => setDeckStats(s))
      .catch(() => {});
  }, [loadPresentations, loadBriefs, loadLenses]);

  const handleGenerate = async () => {
    if (selectedSourceId) {
      // Fork from existing presentation with selected Brief/Lens
      const newId = await forkPresentation(selectedSourceId, {
        briefId: selectedBriefId || undefined,
        pitchLensId: selectedLensId || undefined,
      });
      if (newId) navigate(`/workspace/${newId}`);
    } else {
      const params = new URLSearchParams();
      if (selectedBriefId) params.set('briefId', selectedBriefId);
      if (selectedLensId) params.set('lensId', selectedLensId);
      const qs = params.toString();
      navigate(`/workspace/new${qs ? `?${qs}` : ''}`);
    }
  };

  const handleFork = async (overrides: { briefId?: string; pitchLensId?: string; title?: string }) => {
    if (!forkTarget) return;
    const newId = await forkPresentation(forkTarget.id, overrides);
    setForkTarget(null);
    if (newId) navigate(`/workspace/${newId}`);
  };

  const completedPresentations = presentations.filter((p) => p.status === 'COMPLETED');

  const recentPresentations = presentations.slice(0, 6);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-1 flex items-center gap-3">
          <Gauge className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('cockpit.title')}</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('cockpit.subtitle')}
        </p>
      </div>

      {/* Hero CTA */}
      <div className="mb-8 rounded-lg border border-border bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-8">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t('cockpit.hero_title')}</h2>
              <p className="text-sm text-muted-foreground">{t('cockpit.hero_subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/presentations/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {t('cockpit.hero_cta')}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick Generate (advanced, collapsible) */}
      <details className="mb-8">
        <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
          {t('cockpit.quick_generate_label')}
        </summary>
        <div className="mt-3 rounded-lg border border-border bg-card p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t('cockpit.pitch_brief_label')}
              </label>
              <div className="relative">
                <select
                  value={selectedBriefId}
                  onChange={(e) => setSelectedBriefId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('common.no_brief')}</option>
                  {briefs.map((brief) => (
                    <option key={brief.id} value={brief.id}>
                      {brief.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t('cockpit.pitch_lens_label')}
              </label>
              <div className="relative">
                <select
                  value={selectedLensId}
                  onChange={(e) => setSelectedLensId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('common.no_lens')}</option>
                  {lenses.map((lens) => (
                    <option key={lens.id} value={lens.id}>
                      {lens.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-foreground">
                {t('cockpit.starting_from_label')}
              </label>
              <div className="relative">
                <select
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-border bg-background px-4 py-2.5 pr-10 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{t('common.blank')}</option>
                  {completedPresentations.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({t('common.slides_count', { count: p.slideCount })})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!selectedLensId}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-6 py-2.5 font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {selectedSourceId ? (
                <>
                  {t('common.fork')}
                  <GitFork className="h-4 w-4" />
                </>
              ) : (
                <>
                  {t('common.generate')}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
          {!selectedLensId && (
            <p className="mt-3 text-xs text-amber-500">
              {t('cockpit.select_lens_warning')}
              {lenses.length === 0 && t('cockpit.create_lens_first')}
            </p>
          )}
        </div>
      </details>

      {/* Stats Row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('cockpit.credit_balance')}</p>
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
              <p className="text-sm text-muted-foreground">{t('cockpit.presentations')}</p>
              <p className="text-xl font-semibold text-foreground">
                {presentations.length}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('cockpit.pitch_briefs')}</p>
              <p className="text-xl font-semibold text-foreground">
                {briefs.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Presentations */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('cockpit.recent_presentations')}</h2>
          {presentations.length > 6 && (
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 text-sm text-primary hover:text-primary/80"
            >
              {t('common.view_all')}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {presentationsLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : (
          <PresentationGrid
            presentations={recentPresentations}
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
      </div>

      {/* Pitch Briefs */}
      <div className="mb-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('cockpit.pitch_briefs')}</h2>
          <button
            onClick={() => navigate('/pitch-briefs/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('cockpit.new_brief')}
          </button>
        </div>
        {briefsLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : briefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12">
            <BookOpen className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="mb-4 text-sm text-muted-foreground">
              {t('cockpit.empty_briefs_message')}
            </p>
            <button
              onClick={() => navigate('/pitch-briefs/new')}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t('cockpit.create_brief')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {briefs.map((brief) => (
              <div
                key={brief.id}
                onClick={() => navigate(`/pitch-briefs/${brief.id}`)}
                className="cursor-pointer rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="mb-3 flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold text-foreground">{brief.name}</h3>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[brief.status] ?? STATUS_COLORS.EMPTY}`}>
                    {formatEnum(brief.status)}
                  </span>
                </div>
                {brief.description && (
                  <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                    {brief.description}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    {t('common.docs_count', { count: brief.documentCount })}
                  </span>
                  <span className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {t('common.entities_count', { count: brief.entityCount })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Focus className="h-3 w-3" />
                    {t('common.lenses_count', { count: brief.lensCount })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pitch Lenses */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">{t('cockpit.pitch_lenses')}</h2>
          <button
            onClick={() => navigate('/pitch-lens/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            {t('cockpit.new_lens')}
          </button>
        </div>
        {lensesLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : lenses.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12">
            <Focus className="mb-3 h-10 w-10 text-muted-foreground/50" />
            <p className="mb-4 text-sm text-muted-foreground">
              {t('cockpit.empty_lenses_message')}
            </p>
            <button
              onClick={() => navigate('/pitch-lens/new')}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              {t('cockpit.create_lens')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {lenses.map((lens) => (
              <div
                key={lens.id}
                onClick={() => navigate(`/pitch-lens/${lens.id}`)}
                className="cursor-pointer rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="mb-3 flex items-center gap-2">
                  <Focus className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{lens.name}</h3>
                </div>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {formatEnum(lens.audienceType)}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    {formatEnum(lens.pitchGoal)}
                  </span>
                </div>
                {lens.imageFrequency > 0 && lens.framework?.idealSlideRange && (() => {
                  const freq = lens.imageFrequency;
                  const range = lens.framework.idealSlideRange;
                  const minImg = Math.max(1, Math.floor(range.min / freq));
                  const maxImg = Math.max(1, Math.floor(range.max / freq));
                  return (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Image className="h-3 w-3 shrink-0" />
                      <span>
                        {minImg === maxImg ? `${minImg}` : `${minImg}–${maxImg}`} {t('common.images')}
                      </span>
                      <span>&middot;</span>
                      <span>{lens.imageLayout === 'BACKGROUND' ? t('wizard.image_layout_background') : t('wizard.image_layout_side')}</span>
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground">
                  {lens.presentationCount === 1
                    ? t('common.presentation_count', { count: lens.presentationCount })
                    : t('common.presentation_count_plural', { count: lens.presentationCount })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {forkTarget && (
        <ForkDialog
          presentation={forkTarget}
          onFork={handleFork}
          onClose={() => setForkTarget(null)}
        />
      )}
    </div>
  );
}

export default CockpitPage;
