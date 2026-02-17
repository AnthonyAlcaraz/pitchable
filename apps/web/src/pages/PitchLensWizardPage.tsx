import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import type { CreatePitchLensInput } from '@/stores/pitch-lens.store';
import { ArrowLeft, ArrowRight, Check, Focus } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = ['Name', 'Audience', 'Goal', 'Context', 'Tone', 'Framework', 'Review'] as const;

const AUDIENCE_OPTIONS = [
  { value: 'INVESTORS', label: 'Investors', desc: 'VCs, angels, or PE firms' },
  { value: 'CUSTOMERS', label: 'Customers', desc: 'Prospects or existing clients' },
  { value: 'EXECUTIVES', label: 'Executives', desc: 'C-suite decision makers' },
  { value: 'TEAM', label: 'Team', desc: 'Internal team or all-hands' },
  { value: 'CONFERENCE', label: 'Conference', desc: 'Public talks or panels' },
  { value: 'BOARD', label: 'Board', desc: 'Board members or stakeholders' },
  { value: 'TECHNICAL', label: 'Technical', desc: 'Engineers or architects' },
];

const GOAL_OPTIONS = [
  { value: 'RAISE_FUNDING', label: 'Raise Funding', desc: 'Secure investment capital' },
  { value: 'SELL_PRODUCT', label: 'Sell Product', desc: 'Close a deal or demo' },
  { value: 'GET_BUYIN', label: 'Get Buy-In', desc: 'Win internal approval' },
  { value: 'EDUCATE', label: 'Educate', desc: 'Teach or train the audience' },
  { value: 'INSPIRE', label: 'Inspire', desc: 'Motivate and energize' },
  { value: 'REPORT_RESULTS', label: 'Report Results', desc: 'Share metrics and outcomes' },
];

const TONE_OPTIONS = [
  { value: 'FORMAL', label: 'Formal', desc: 'Professional and polished' },
  { value: 'CONVERSATIONAL', label: 'Conversational', desc: 'Warm and approachable' },
  { value: 'BOLD', label: 'Bold', desc: 'Confident and assertive' },
  { value: 'INSPIRATIONAL', label: 'Inspirational', desc: 'Visionary and forward-looking' },
  { value: 'ANALYTICAL', label: 'Analytical', desc: 'Data-driven and precise' },
  { value: 'STORYTELLING', label: 'Storytelling', desc: 'Narrative-driven' },
];

const STAGE_OPTIONS = [
  { value: 'IDEA', label: 'Idea' },
  { value: 'MVP', label: 'MVP' },
  { value: 'GROWTH', label: 'Growth' },
  { value: 'ENTERPRISE', label: 'Enterprise' },
];

const TECH_OPTIONS = [
  { value: 'NON_TECHNICAL', label: 'Non-Technical' },
  { value: 'SEMI_TECHNICAL', label: 'Semi-Technical' },
  { value: 'TECHNICAL', label: 'Technical' },
  { value: 'HIGHLY_TECHNICAL', label: 'Highly Technical' },
];

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PitchLensWizardPage() {
  const { id: editId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { createLens, updateLens, loadLens, currentLens, getRecommendations, recommendations, loadFrameworks, allFrameworks } = usePitchLensStore();

  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  });

  // Load existing lens for editing
  useEffect(() => {
    if (editId) {
      loadLens(editId).then(() => {});
    }
    loadFrameworks();
  }, [editId, loadLens, loadFrameworks]);

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
        showSectionLabels: (currentLens as Record<string, unknown>).showSectionLabels as boolean ?? false,
        showOutlineSlide: (currentLens as Record<string, unknown>).showOutlineSlide as boolean ?? false,
      });
    }
  }, [editId, currentLens]);

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
        {editId ? 'Back to Lens' : 'Back to Pitch Lenses'}
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
          {editId ? 'Edit' : 'Create'} Pitch Lens — {STEPS[step]}
        </h2>

        {/* Step 0: Name */}
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Lens Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Series A Pitch, Q1 Board Update..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Description (optional)</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What is this lens for?"
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
              <label className="mb-1.5 block text-sm font-medium text-foreground">Industry / Domain</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                placeholder="e.g., AI/SaaS, Healthcare, Fintech..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-foreground">Company Stage</label>
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
              <label className="mb-1.5 block text-sm font-medium text-foreground">Audience Technical Level</label>
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
                  Based on your profile, we recommend these storytelling frameworks:
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
                          {rec.score}% match
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
                Custom Guidance (optional)
              </label>
              <textarea
                value={form.customGuidance}
                onChange={(e) => setForm({ ...form, customGuidance: e.target.value })}
                placeholder="Any additional instructions for the AI..."
                rows={3}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
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
                <label className="text-sm font-medium text-foreground">Section Labels</label>
                <p className="text-xs text-muted-foreground">Show category tags on each slide (e.g., VISION, EVIDENCE, THE ASK)</p>
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
                <label className="text-sm font-medium text-foreground">Outline Slide</label>
                <p className="text-xs text-muted-foreground">Add an agenda / table of contents slide after the title</p>
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
                { label: 'Audience', value: formatEnum(form.audienceType) },
                { label: 'Goal', value: formatEnum(form.pitchGoal) },
                { label: 'Industry', value: form.industry },
                { label: 'Stage', value: formatEnum(form.companyStage) },
                { label: 'Tone', value: formatEnum(form.toneStyle) },
                { label: 'Technical Level', value: formatEnum(form.technicalLevel) },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-sm font-medium text-foreground">{item.value}</p>
                </div>
              ))}
            </div>

            {form.selectedFramework && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Framework</p>
                <p className="text-sm font-medium text-foreground">
                  {formatEnum(form.selectedFramework)}
                </p>
              </div>
            )}

            {form.customGuidance && (
              <div className="border-t border-border pt-3">
                <p className="text-xs text-muted-foreground">Custom Guidance</p>
                <p className="text-sm text-foreground">{form.customGuidance}</p>
              </div>
            )}

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Section Labels</p>
              <p className="text-sm font-medium text-foreground">{form.showSectionLabels ? 'Enabled' : 'Disabled'}</p>
            </div>

            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">Outline Slide</p>
              <p className="text-sm font-medium text-foreground">{form.showOutlineSlide ? 'Enabled' : 'Disabled'}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button
            onClick={() => step > 0 ? setStep(step - 1) : navigate('/pitch-lens')}
            className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
            {step > 0 ? 'Back' : 'Cancel'}
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
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {isSubmitting ? 'Creating...' : editId ? 'Save Changes' : 'Create Lens'}
              <Check className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default PitchLensWizardPage;
