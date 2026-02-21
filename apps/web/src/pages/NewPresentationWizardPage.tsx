import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  BookOpen,
  Focus,
  Sparkles,
  Plus,
  MessageSquare,
} from 'lucide-react';
import { PeachLogo } from '@/components/icons/PeachLogo';
import { cn } from '@/lib/utils';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { api } from '@/lib/api';

// ── Types ────────────────────────────────────────────────────

type Step = 'brief' | 'lens' | 'topic' | 'confirm';

const STEPS: Step[] = ['brief', 'lens', 'topic', 'confirm'];

interface WizardState {
  step: Step;
  briefId: string | null;
  lensId: string | null;
  topic: string;
}

// ── Persistence ──────────────────────────────────────────────

const STORAGE_KEY = 'new-presentation-wizard';

function saveState(state: WizardState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState(): WizardState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WizardState;
  } catch {
    return null;
  }
}

function clearState() {
  localStorage.removeItem(STORAGE_KEY);
}

// ── Helpers ──────────────────────────────────────────────────

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Main Component ───────────────────────────────────────────

export function NewPresentationWizardPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { briefs, isLoading: briefsLoading, loadBriefs } = usePitchBriefStore();
  const { lenses, isLoading: lensesLoading, loadLenses } = usePitchLensStore();

  const [step, setStep] = useState<Step>('brief');
  const [briefId, setBriefId] = useState<string | null>(null);
  const [lensId, setLensId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ title: string; description: string }>>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  // Load data
  useEffect(() => {
    loadBriefs();
    loadLenses();
  }, [loadBriefs, loadLenses]);

  // Restore state from localStorage
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setStep(saved.step);
      setBriefId(saved.briefId);
      setLensId(saved.lensId);
      setTopic(saved.topic);
    }
  }, []);

  // Persist state
  useEffect(() => {
    saveState({ step, briefId, lensId, topic });
  }, [step, briefId, lensId, topic]);

  // Fetch topic suggestions when entering topic step
  useEffect(() => {
    if (step !== 'topic') return;
    if (!lensId && !briefId) return;
    if (suggestions.length > 0) return;

    let cancelled = false;
    setSuggestionsLoading(true);
    api.post<{ suggestions: { title: string; description: string }[] }>(
      '/chat/suggest-subjects',
      { lensId, briefId },
    ).then((res) => {
      if (!cancelled && res.suggestions?.length) {
        setSuggestions(res.suggestions);
      }
    }).catch(() => { /* suggestions are optional */ })
      .finally(() => { if (!cancelled) setSuggestionsLoading(false); });

    return () => { cancelled = true; };
  }, [step, lensId, briefId, suggestions.length]);

  const stepIndex = STEPS.indexOf(step);

  const goTo = useCallback((s: Step) => setStep(s), []);

  const handleLaunch = useCallback(() => {
    clearState();
    const params = new URLSearchParams();
    if (briefId) params.set('briefId', briefId);
    if (lensId) params.set('lensId', lensId);
    if (topic.trim()) params.set('topic', topic.trim());
    const qs = params.toString();
    navigate(`/workspace/new${qs ? `?${qs}` : ''}`);
  }, [briefId, lensId, topic, navigate]);

  const selectedBrief = briefs.find((b) => b.id === briefId);
  const selectedLens = lenses.find((l) => l.id === lensId);

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <Link to="/cockpit" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <PeachLogo className="h-5 w-5" />
            <span className="text-lg font-bold text-foreground">{t('common.app_name')}</span>
          </Link>
        </div>
        <button
          onClick={() => { clearState(); navigate('/cockpit'); }}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {t('common.cancel')}
        </button>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Progress bar */}
          <div className="mb-8 flex items-center justify-center gap-2">
            {STEPS.map((s, i) => {
              const labels: Record<Step, string> = {
                brief: t('wizard.step_brief'),
                lens: t('wizard.step_lens'),
                topic: t('wizard.step_topic'),
                confirm: t('wizard.step_confirm'),
              };
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors',
                      i < stepIndex ? 'bg-primary text-primary-foreground'
                        : i === stepIndex ? 'border-2 border-primary text-primary'
                        : 'border border-border text-muted-foreground',
                    )}>
                      {i < stepIndex ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    <span className={cn(
                      'hidden text-xs font-medium sm:inline',
                      i === stepIndex ? 'text-primary' : 'text-muted-foreground',
                    )}>
                      {labels[s]}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn('h-px w-8', i < stepIndex ? 'bg-primary' : 'bg-border')} />
                  )}
                </div>
              );
            })}
          </div>

          {/* ─── Step 1: Brief ────────────────────────── */}
          {step === 'brief' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t('wizard.brief_title')}</h2>
                <p className="mt-1 text-muted-foreground">{t('wizard.brief_subtitle')}</p>
              </div>

              {briefsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {/* No brief option */}
                  <button
                    onClick={() => setBriefId(null)}
                    className={cn(
                      'rounded-lg border-2 p-4 text-left transition-colors',
                      briefId === null
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/30',
                    )}
                  >
                    <p className="font-medium text-foreground">{t('wizard.no_brief')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{t('wizard.no_brief_desc')}</p>
                  </button>

                  {briefs.map((brief) => (
                    <button
                      key={brief.id}
                      onClick={() => setBriefId(brief.id)}
                      className={cn(
                        'rounded-lg border-2 p-4 text-left transition-colors',
                        briefId === brief.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-primary" />
                        <p className="font-medium text-foreground">{brief.name}</p>
                      </div>
                      {brief.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{brief.description}</p>
                      )}
                      <p className="mt-2 text-xs text-muted-foreground">
                        {t('common.docs_count', { count: brief.documentCount })} &middot; {t('common.entities_count', { count: brief.entityCount })}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex justify-center">
                <Link
                  to="/pitch-briefs/new"
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {t('wizard.create_new_brief')}
                </Link>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => { clearState(); navigate('/cockpit'); }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.back')}
                </button>
                <button
                  onClick={() => goTo('lens')}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  {t('common.next')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 2: Lens ─────────────────────────── */}
          {step === 'lens' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Focus className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t('wizard.lens_title')}</h2>
                <p className="mt-1 text-muted-foreground">{t('wizard.lens_subtitle')}</p>
              </div>

              {lensesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : lenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12">
                  <Focus className="mb-3 h-10 w-10 text-muted-foreground/50" />
                  <p className="mb-4 text-sm text-muted-foreground">{t('wizard.no_lenses_message')}</p>
                  <Link
                    to="/pitch-lens/new"
                    className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    {t('wizard.create_first_lens')}
                  </Link>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {lenses.map((lens) => (
                    <button
                      key={lens.id}
                      onClick={() => setLensId(lens.id)}
                      className={cn(
                        'rounded-lg border-2 p-4 text-left transition-colors',
                        lensId === lens.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <Focus className="h-4 w-4 text-primary" />
                        <p className="font-medium text-foreground">{lens.name}</p>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {formatEnum(lens.audienceType)}
                        </span>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {formatEnum(lens.pitchGoal)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {lenses.length > 0 && (
                <div className="flex justify-center">
                  <Link
                    to="/pitch-lens/new"
                    className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('wizard.create_new_lens')}
                  </Link>
                </div>
              )}

              {!lensId && lenses.length > 0 && (
                <p className="text-center text-xs text-amber-500">
                  {t('wizard.lens_required')}
                </p>
              )}

              <div className="flex justify-between">
                <button
                  onClick={() => goTo('brief')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.back')}
                </button>
                <button
                  onClick={() => goTo('topic')}
                  disabled={!lensId}
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t('common.next')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* ─── Step 3: Topic ────────────────────────── */}
          {step === 'topic' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t('wizard.topic_title')}</h2>
                <p className="mt-1 text-muted-foreground">{t('wizard.topic_subtitle')}</p>
              </div>

              {/* AI suggestions */}
              {suggestionsLoading && (
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-xs text-muted-foreground">{t('wizard.loading_suggestions')}</span>
                </div>
              )}
              {suggestions.length > 0 && (
                <div className="rounded-lg border border-border bg-card">
                  <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
                    <Sparkles className="h-4 w-4 text-orange-400" />
                    <span className="text-xs font-medium text-foreground">{t('wizard.suggested_topics')}</span>
                  </div>
                  <div className="space-y-1.5 p-3">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setTopic(`Create a presentation about ${s.title}`)}
                        className="flex w-full items-start gap-2.5 rounded-md border border-border bg-background p-2.5 text-left transition-all hover:border-orange-500/50 hover:bg-orange-500/5"
                      >
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-orange-500/10 text-[10px] font-bold text-orange-400">
                          {i + 1}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground">{s.title}</p>
                          <p className="text-xs text-muted-foreground">{s.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic textarea */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">
                  {t('wizard.topic_label')}
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={4}
                  placeholder={t('wizard.topic_placeholder')}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  autoFocus
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => goTo('lens')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.back')}
                </button>
                <div className="flex gap-3">
                  {!topic.trim() && (
                    <button
                      onClick={() => goTo('confirm')}
                      className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                    >
                      {t('common.skip')}
                    </button>
                  )}
                  <button
                    onClick={() => goTo('confirm')}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {t('common.next')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Step 4: Confirm ──────────────────────── */}
          {step === 'confirm' && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">{t('wizard.confirm_title')}</h2>
                <p className="mt-1 text-muted-foreground">{t('wizard.confirm_subtitle')}</p>
              </div>

              <div className="mx-auto max-w-md space-y-3">
                {/* Brief summary */}
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                  <BookOpen className="h-5 w-5 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="text-xs text-muted-foreground">{t('wizard.summary_brief')}</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedBrief ? selectedBrief.name : t('wizard.no_brief')}
                    </p>
                  </div>
                  <button
                    onClick={() => goTo('brief')}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    {t('common.edit')}
                  </button>
                </div>

                {/* Lens summary */}
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                  <Focus className="h-5 w-5 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="text-xs text-muted-foreground">{t('wizard.summary_lens')}</p>
                    <p className="text-sm font-medium text-foreground">
                      {selectedLens ? selectedLens.name : '—'}
                    </p>
                    {selectedLens && (
                      <div className="mt-1 flex gap-1">
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {formatEnum(selectedLens.audienceType)}
                        </span>
                        <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          {formatEnum(selectedLens.pitchGoal)}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => goTo('lens')}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    {t('common.edit')}
                  </button>
                </div>

                {/* Topic summary */}
                <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <div className="flex-1 text-left">
                    <p className="text-xs text-muted-foreground">{t('wizard.summary_topic')}</p>
                    <p className="text-sm font-medium text-foreground">
                      {topic.trim() || t('wizard.topic_empty')}
                    </p>
                  </div>
                  <button
                    onClick={() => goTo('topic')}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    {t('common.edit')}
                  </button>
                </div>
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => goTo('topic')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.back')}
                </button>
                <button
                  onClick={handleLaunch}
                  className="flex items-center gap-2 rounded-lg bg-primary px-8 py-2.5 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  {t('wizard.launch')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default NewPresentationWizardPage;
