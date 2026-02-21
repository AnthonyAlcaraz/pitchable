import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { useFigmaTemplateStore } from '@/stores/figma-template.store';
import { useBillingStore } from '@/stores/billing.store';
import type { CreatePitchLensInput } from '@/stores/pitch-lens.store';
import { ArrowLeft, ArrowRight, Check, Focus, Figma, ImageIcon, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PitchLensWizardPage() {
  const { t } = useTranslation();
  const { id: editId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createLens, updateLens, loadLens, currentLens, getRecommendations, recommendations, loadFrameworks } = usePitchLensStore();
  const { templates: figmaTemplates, loadTemplates: loadFigmaTemplates } = useFigmaTemplateStore();
  const { tierStatus, loadTierStatus } = useBillingStore();
  const maxGuidanceLength = tierStatus?.maxCustomGuidanceLength ?? 200;

  const STEPS = [
    t('pitch_lenses.wizard.step_name'),
    t('pitch_lenses.wizard.step_audience'),
    t('pitch_lenses.wizard.step_goal'),
    t('pitch_lenses.wizard.step_context'),
    t('pitch_lenses.wizard.step_tone'),
    t('pitch_lenses.wizard.step_framework'),
    t('pitch_lenses.wizard.step_review'),
  ] as const;

  const AUDIENCE_OPTIONS = [
    { value: 'INVESTORS', label: t('onboarding.audience_options.INVESTORS'), desc: t('onboarding.audience_options.INVESTORS_desc') },
    { value: 'CUSTOMERS', label: t('onboarding.audience_options.CUSTOMERS'), desc: t('onboarding.audience_options.CUSTOMERS_desc') },
    { value: 'EXECUTIVES', label: t('onboarding.audience_options.EXECUTIVES'), desc: t('onboarding.audience_options.EXECUTIVES_desc') },
    { value: 'TEAM', label: t('onboarding.audience_options.TEAM'), desc: t('onboarding.audience_options.TEAM_desc') },
    { value: 'CONFERENCE', label: t('onboarding.audience_options.CONFERENCE'), desc: t('onboarding.audience_options.CONFERENCE_desc') },
    { value: 'BOARD', label: t('onboarding.audience_options.BOARD'), desc: t('onboarding.audience_options.BOARD_desc') },
    { value: 'TECHNICAL', label: t('onboarding.audience_options.TECHNICAL'), desc: t('onboarding.audience_options.TECHNICAL_desc') },
  ];

  const GOAL_OPTIONS = [
    { value: 'RAISE_FUNDING', label: t('onboarding.goal_options.RAISE_FUNDING'), desc: t('onboarding.goal_options.RAISE_FUNDING_desc') },
    { value: 'SELL_PRODUCT', label: t('onboarding.goal_options.SELL_PRODUCT'), desc: t('onboarding.goal_options.SELL_PRODUCT_desc') },
    { value: 'GET_BUYIN', label: t('onboarding.goal_options.GET_BUYIN'), desc: t('onboarding.goal_options.GET_BUYIN_desc') },
    { value: 'EDUCATE', label: t('onboarding.goal_options.EDUCATE'), desc: t('onboarding.goal_options.EDUCATE_desc') },
    { value: 'INSPIRE', label: t('onboarding.goal_options.INSPIRE'), desc: t('onboarding.goal_options.INSPIRE_desc') },
    { value: 'REPORT_RESULTS', label: t('onboarding.goal_options.REPORT_RESULTS'), desc: t('onboarding.goal_options.REPORT_RESULTS_desc') },
  ];

  const TONE_OPTIONS = [
    { value: 'FORMAL', label: t('onboarding.tone_options.FORMAL'), desc: t('onboarding.tone_options.FORMAL_desc') },
    { value: 'CONVERSATIONAL', label: t('onboarding.tone_options.CONVERSATIONAL'), desc: t('onboarding.tone_options.CONVERSATIONAL_desc') },
    { value: 'BOLD', label: t('onboarding.tone_options.BOLD'), desc: t('onboarding.tone_options.BOLD_desc') },
    { value: 'INSPIRATIONAL', label: t('onboarding.tone_options.INSPIRATIONAL'), desc: t('onboarding.tone_options.INSPIRATIONAL_desc') },
    { value: 'ANALYTICAL', label: t('onboarding.tone_options.ANALYTICAL'), desc: t('onboarding.tone_options.ANALYTICAL_desc') },
    { value: 'STORYTELLING', label: t('onboarding.tone_options.STORYTELLING'), desc: t('onboarding.tone_options.STORYTELLING_desc') },
  ];

  const STAGE_OPTIONS = [
    { value: 'IDEA', label: t('onboarding.stage_options.IDEA') },
    { value: 'MVP', label: t('onboarding.stage_options.MVP') },
    { value: 'GROWTH', label: t('onboarding.stage_options.GROWTH') },
    { value: 'ENTERPRISE', label: t('onboarding.stage_options.ENTERPRISE') },
  ];

  const TECH_OPTIONS = [
    { value: 'NON_TECHNICAL', label: t('onboarding.tech_options.NON_TECHNICAL') },
    { value: 'SEMI_TECHNICAL', label: t('onboarding.tech_options.SEMI_TECHNICAL') },
    { value: 'TECHNICAL', label: t('onboarding.tech_options.TECHNICAL') },
    { value: 'HIGHLY_TECHNICAL', label: t('onboarding.tech_options.HIGHLY_TECHNICAL') },
  ];

  const { createFromUrl: createTemplateFromUrl } = useFigmaTemplateStore();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [figmaImporting, setFigmaImporting] = useState(false);
  const [figmaImportError, setFigmaImportError] = useState('');
  const [form, setForm] = useState<CreatePitchLensInput>({
    name: '',
    description: '',
    audienceType: '',
    pitchGoal: '',
    industry: '',
    companyStage: 'MVP',
    toneStyle: '',
    technicalLevel: 'SEMI_TECHNICAL',
    selectedFramework: '',
    customGuidance: '',
    showSectionLabels: false,
    showOutlineSlide: false,
    figmaFileKey: '',
    figmaAccessToken: '',
    figmaTemplateId: undefined as string | undefined,
    backgroundImageFrequency: 0,
    sidePanelImageFrequency: 5,
  });

  // Load existing lens for editing
  useEffect(() => {
    if (editId) {
      loadLens(editId).then(() => {});
    }
    loadFrameworks();
    loadFigmaTemplates();
    loadTierStatus();
  }, [editId, loadLens, loadFrameworks, loadFigmaTemplates, loadTierStatus]);

  useEffect(() => {
    if (editId && currentLens) {
      setForm({
        name: currentLens.name,
        description: currentLens.description ?? '',
        audienceType: currentLens.audienceType,
        pitchGoal: currentLens.pitchGoal,
        industry: currentLens.industry,
        companyStage: currentLens.companyStage,
        toneStyle: currentLens.toneStyle,
        technicalLevel: currentLens.technicalLevel,
        selectedFramework: currentLens.selectedFramework,
        customGuidance: currentLens.customGuidance ?? '',
        showSectionLabels: (currentLens as unknown as Record<string, unknown>).showSectionLabels as boolean ?? false,
        showOutlineSlide: (currentLens as unknown as Record<string, unknown>).showOutlineSlide as boolean ?? false,
        figmaFileKey: (currentLens as unknown as Record<string, unknown>).figmaFileKey as string ?? '',
        figmaAccessToken: (currentLens as unknown as Record<string, unknown>).figmaAccessToken as string ? '********' : '',
        backgroundImageFrequency: (currentLens as unknown as Record<string, unknown>).backgroundImageFrequency as number ?? 0,
        sidePanelImageFrequency: (currentLens as unknown as Record<string, unknown>).sidePanelImageFrequency as number ?? 5,
      });
    }
  }, [editId, currentLens]);

  async function handleFigmaImport() {
    if (!figmaUrl.trim()) return;
    setFigmaImporting(true);
    setFigmaImportError('');
    try {
      const templateId = await createTemplateFromUrl(figmaUrl.trim());
      setForm((f) => ({ ...f, figmaTemplateId: templateId }));
      setFigmaUrl('');
    } catch (err) {
      setFigmaImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setFigmaImporting(false);
    }
  }

  const canProceed = (): boolean => {
    switch (step) {
      case 0: return form.name.trim().length > 0;
      case 1: return form.audienceType !== '';
      case 2: return form.pitchGoal !== '';
      case 3: return form.industry.trim().length > 0;
      case 4: return form.toneStyle !== '';
      case 5: return form.selectedFramework !== '';
      case 6: return true;
      default: return false;
    }
  };

  const handleNext = async () => {
    if (step === 4) {
      // Moving from Tone to Framework — fetch recommendations
      await getRecommendations({
        audienceType: form.audienceType,
        pitchGoal: form.pitchGoal,
        companyStage: form.companyStage,
        technicalLevel: form.technicalLevel,
      });
    }
    setStep(step + 1);
  };

  // Auto-select top recommendation when recommendations load
  useEffect(() => {
    if (step === 5 && recommendations.length > 0 && !form.selectedFramework) {
      setForm((f) => ({ ...f, selectedFramework: recommendations[0].framework.id }));
    }
  }, [recommendations, step, form.selectedFramework]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (editId) {
        await updateLens(editId, form);
        navigate(`/pitch-lens/${editId}`);
      } else {
        const newId = await createLens(form);
        navigate(`/pitch-lens/${newId}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const CardSelector = ({ options, value, onChange }: {
    options: Array<{ value: string; label: string; desc?: string }>;
    value: string;
    onChange: (v: string) => void;
  }) => (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-lg border-2 p-4 text-left transition-colors',
            value === opt.value
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/30',
          )}
        >
          <p className="font-medium text-foreground">{opt.label}</p>
          {opt.desc && (
            <p className="mt-1 text-xs text-muted-foreground">{opt.desc}</p>
          )}
        </button>
      ))}
    </div>
  );

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(editId ? `/pitch-lens/${editId}` : '/pitch-lens')}
        className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {editId ? t('pitch_lenses.wizard.back_to_lens') : t('pitch_lenses.wizard.back_to_lenses')}
      </button>

      <div className="mx-auto max-w-2xl">
        {/* Progress */}
        <div className="mb-8 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                  i < step
                    ? 'bg-primary text-primary-foreground'
                    : i === step
                      ? 'border-2 border-primary text-primary'
                      : 'border border-border text-muted-foreground',
                )}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn('h-px w-4', i < step ? 'bg-primary' : 'bg-border')} />
              )}
            </div>
          ))}
        </div>

        <h2 className="mb-6 text-xl font-bold text-foreground">
          {t('pitch_lenses.wizard.title_template', { action: editId ? t('common.edit') : t('pitch_lenses.wizard.create_title').replace('Create Pitch Lens', 'Create'), step: STEPS[step] })}
        </h2>

        {/* Step 0: Name */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t('pitch_lenses.wizard.lens_name_label')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('pitch_lenses.wizard.lens_name_placeholder')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t('pitch_lenses.wizard.description_label')}</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('pitch_lenses.wizard.description_placeholder')}
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        )}

        {/* Step 1: Audience */}
        {step === 1 && (
          <CardSelector
            options={AUDIENCE_OPTIONS}
            value={form.audienceType}
            onChange={(v) => setForm({ ...form, audienceType: v })}
          />
        )}

        {/* Step 2: Goal */}
        {step === 2 && (
          <CardSelector
            options={GOAL_OPTIONS}
            value={form.pitchGoal}
            onChange={(v) => setForm({ ...form, pitchGoal: v })}
          />
        )}

        {/* Step 3: Context */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t('pitch_lenses.wizard.industry_label')}</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder={t('pitch_lenses.wizard.industry_placeholder')}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t('pitch_lenses.wizard.company_stage_label')}</label>
              <div className="flex gap-2">
                {STAGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, companyStage: opt.value })}
                    className={cn(
                      'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                      form.companyStage === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{t('pitch_lenses.wizard.technical_level_label')}</label>
              <div className="flex gap-2">
                {TECH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm({ ...form, technicalLevel: opt.value })}
                    className={cn(
                      'flex-1 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors',
                      form.technicalLevel === opt.value
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/30',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Figma Integration (optional) */}
            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center gap-2">
                <Figma className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">{t('pitch_lenses.wizard.figma_integration_title')}</label>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                Paste a Figma URL to import your template. AI will auto-map frames to slide types.
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={figmaUrl}
                  onChange={(e) => { setFigmaUrl(e.target.value); setFigmaImportError(''); }}
                  placeholder="https://www.figma.com/design/..."
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleFigmaImport}
                  disabled={!figmaUrl.trim() || figmaImporting}
                  className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {figmaImporting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Import
                </button>
              </div>

              {figmaImportError && (
                <p className="mt-1.5 text-xs text-red-500">{figmaImportError}</p>
              )}

              {form.figmaTemplateId && (
                <p className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                  <Figma className="h-3 w-3" />
                  Template linked &mdash; AI mappings applied
                </p>
              )}

              {!form.figmaTemplateId && figmaTemplates.length > 0 && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-muted-foreground">Or select existing template</label>
                  <select
                    value={form.figmaTemplateId ?? ''}
                    onChange={(e) => setForm({ ...form, figmaTemplateId: e.target.value || undefined })}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="">None</option>
                    {figmaTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name} ({tmpl.mappingCount} mapped)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Tone */}
        {step === 4 && (
          <CardSelector
            options={TONE_OPTIONS}
            value={form.toneStyle}
            onChange={(v) => setForm({ ...form, toneStyle: v })}
          />
        )}

        {/* Step 5: Framework Recommendation */}
        {step === 5 && (
          <div className="space-y-4">
            {recommendations.length > 0 && (
              <>
                <p className="text-sm text-muted-foreground">
                  {t('pitch_lenses.wizard.framework_recommendation')}
                </p>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <button
                      key={rec.framework.id}
                      onClick={() => setForm({ ...form, selectedFramework: rec.framework.id })}
                      className={cn(
                        'w-full rounded-lg border-2 p-4 text-left transition-colors',
                        form.selectedFramework === rec.framework.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30',
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                            i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                          )}>
                            {i + 1}
                          </span>
                          <h3 className="font-semibold text-foreground">{rec.framework.name}</h3>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {t('common.match_percent', { score: rec.score })}
                        </span>
                      </div>
                      <p className="mb-2 text-sm text-muted-foreground">
                        {rec.framework.shortDescription}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {rec.reasons.map((reason, j) => (
                          <span key={j} className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">
                {t('pitch_lenses.wizard.custom_guidance_label')}
              </label>
              <textarea
                value={form.customGuidance}
                onChange={(e) => {
                  if (e.target.value.length <= maxGuidanceLength) {
                    setForm({ ...form, customGuidance: e.target.value });
                  }
                }}
                placeholder={t('pitch_lenses.wizard.custom_guidance_placeholder')}
                rows={3}
                className={cn(
                  'w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1',
                  (form.customGuidance?.length ?? 0) >= maxGuidanceLength
                    ? 'border-amber-500 focus:border-amber-500 focus:ring-amber-500'
                    : 'border-border focus:border-primary focus:ring-primary',
                )}
              />
              <div className="mt-1 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {maxGuidanceLength <= 200 ? 'Upgrade for more characters' : ''}
                </span>
                <span className={(form.customGuidance?.length ?? 0) >= maxGuidanceLength ? 'text-amber-500 font-medium' : 'text-muted-foreground'}>
                  {form.customGuidance?.length ?? 0}/{maxGuidanceLength}
                </span>
              </div>
            </div>

            {/* Image Settings */}
            <div className="border-t border-border pt-4">
              <div className="mb-3 flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-muted-foreground" />
                <label className="text-sm font-medium text-foreground">Image Generation</label>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs text-muted-foreground">Background images (full-slide, 15% opacity)</label>
                <div className="flex gap-2">
                  {[
                    { value: 0, label: 'None' },
                    { value: 5, label: 'Few (~2)' },
                    { value: 3, label: 'Some (~4)' },
                    { value: 2, label: 'Many (~6)' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, backgroundImageFrequency: opt.value })}
                      className={cn(
                        'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                        form.backgroundImageFrequency === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-1.5 block text-xs text-muted-foreground">Side panel images (right side, 35% width)</label>
                <div className="flex gap-2">
                  {[
                    { value: 0, label: 'None' },
                    { value: 5, label: 'Few (~2)' },
                    { value: 3, label: 'Some (~4)' },
                    { value: 2, label: 'Many (~6)' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, sidePanelImageFrequency: opt.value })}
                      className={cn(
                        'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                        form.sidePanelImageFrequency === opt.value
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/30',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.showSectionLabels}
                onClick={() => setForm({ ...form, showSectionLabels: !form.showSectionLabels })}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  form.showSectionLabels ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
                    form.showSectionLabels ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
              <div>
                <label className="text-sm font-medium text-foreground">{t('pitch_lenses.wizard.section_labels_title')}</label>
                <p className="text-xs text-muted-foreground">{t('pitch_lenses.wizard.section_labels_desc')}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={form.showOutlineSlide}
                onClick={() => setForm({ ...form, showOutlineSlide: !form.showOutlineSlide })}
                className={cn(
                  'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                  form.showOutlineSlide ? 'bg-primary' : 'bg-muted',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform',
                    form.showOutlineSlide ? 'translate-x-5' : 'translate-x-0',
                  )}
                />
              </button>
              <div>
                <label className="text-sm font-medium text-foreground">{t('pitch_lenses.wizard.outline_slide_title')}</label>
                <p className="text-xs text-muted-foreground">{t('pitch_lenses.wizard.outline_slide_desc')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <div className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <Focus className="h-6 w-6 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">{form.name}</h3>
                {form.description && (
                  <p className="text-sm text-muted-foreground">{form.description}</p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { label: t('pitch_lenses.wizard.review_audience'), value: formatEnum(form.audienceType) },
                { label: t('pitch_lenses.wizard.review_goal'), value: formatEnum(form.pitchGoal) },
                { label: t('pitch_lenses.wizard.review_industry'), value: form.industry },
                { label: t('pitch_lenses.wizard.review_stage'), value: formatEnum(form.companyStage) },
                { label: t('pitch_lenses.wizard.review_tone'), value: formatEnum(form.toneStyle) },
                { label: t('pitch_lenses.wizard.review_technical_level'), value: formatEnum(form.technicalLevel) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {form.selectedFramework && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">{t('pitch_lenses.wizard.review_framework')}</p>
                <p className="text-sm font-medium text-foreground">
                  {formatEnum(form.selectedFramework)}
                </p>
              </div>
            )}

            {form.customGuidance && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">{t('pitch_lenses.wizard.review_custom_guidance')}</p>
                <p className="text-sm text-foreground">{form.customGuidance}</p>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">{t('pitch_lenses.wizard.review_section_labels')}</p>
              <p className="text-sm font-medium text-foreground">{form.showSectionLabels ? t('common.enabled') : t('common.disabled')}</p>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">{t('pitch_lenses.wizard.review_outline_slide')}</p>
              <p className="text-sm font-medium text-foreground">{form.showOutlineSlide ? t('common.enabled') : t('common.disabled')}</p>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Background images</p>
              <p className="text-sm font-medium text-foreground">
                {form.backgroundImageFrequency === 0 ? 'None' : form.backgroundImageFrequency === 5 ? 'Few (~2 per deck)' : form.backgroundImageFrequency === 3 ? 'Some (~4 per deck)' : form.backgroundImageFrequency === 2 ? 'Many (~6 per deck)' : `Custom (1 per ${form.backgroundImageFrequency} slides)`}
              </p>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Side panel images</p>
              <p className="text-sm font-medium text-foreground">
                {form.sidePanelImageFrequency === 0 ? 'None' : form.sidePanelImageFrequency === 5 ? 'Few (~2 per deck)' : form.sidePanelImageFrequency === 3 ? 'Some (~4 per deck)' : form.sidePanelImageFrequency === 2 ? 'Many (~6 per deck)' : `Custom (1 per ${form.sidePanelImageFrequency} slides)`}
              </p>
            </div>

            {form.figmaTemplateId && (
              <div className="border-t border-border pt-3">
                <div className="flex items-center gap-1.5">
                  <Figma className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">Figma Template</p>
                </div>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {figmaTemplates.find((t) => t.id === form.figmaTemplateId)?.name ?? 'Linked'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/pitch-lens')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            {step > 0 ? t('common.back') : t('common.cancel')}
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium',
                canProceed()
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'cursor-not-allowed bg-muted text-muted-foreground',
              )}
            >
              {t('common.next')}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? t('common.creating') : editId ? t('pitch_lenses.wizard.save_changes') : t('pitch_lenses.wizard.create_lens')}
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PitchLensWizardPage;
