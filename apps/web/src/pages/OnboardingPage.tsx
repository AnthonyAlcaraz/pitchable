import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import type { CreatePitchLensInput } from '@/stores/pitch-lens.store';
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Upload,
  FileText,
  X,
  Focus,
  BookOpen,
  Sparkles,
} from 'lucide-react';
import { PeachLogo } from '@/components/icons/PeachLogo';
import { cn } from '@/lib/utils';

// ── Constants ─────────────────────────────────────────────────

const INGESTION_VERBS = [
  'Peeling through your documents',
  'Juicing the key insights',
  'Ripening your knowledge base',
  'Extracting the good stuff',
  'Pulping through the pages',
  'Preserving every detail',
  'Blending facts into fuel',
  'Sun-drying the highlights',
  'Fermenting your data',
  'Pit-stopping to chunk smartly',
  'Caramelizing the takeaways',
  'Orchard-sorting your content',
  'Squeezing meaning from words',
  'Peach-pressing your sources',
];

type Phase = 'welcome' | 'brief' | 'lens' | 'generate';

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Persistence ───────────────────────────────────────────────

interface OnboardingState {
  phase: Phase;
  briefId: string | null;
  lensId: string | null;
}

function saveState(state: OnboardingState) {
  localStorage.setItem('onboarding-state', JSON.stringify(state));
}

function loadState(): OnboardingState | null {
  try {
    const raw = localStorage.getItem('onboarding-state');
    if (!raw) return null;
    return JSON.parse(raw) as OnboardingState;
  } catch {
    return null;
  }
}

function clearState() {
  localStorage.removeItem('onboarding-state');
}

// ── Card Selector Component ───────────────────────────────────

function CardSelector({ options, value, onChange }: {
  options: Array<{ value: string; label: string; desc?: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
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
}

// ── Main Component ────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  // ── Option arrays (must be inside component for t() access) ──

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

  // Already completed onboarding — redirect
  useEffect(() => {
    if (user?.onboardingCompleted) {
      navigate('/cockpit', { replace: true });
    }
  }, [user, navigate]);

  // ── Phase state ────────────────────────────────────────────

  const [phase, setPhase] = useState<Phase>('welcome');
  const [briefId, setBriefId] = useState<string | null>(null);
  const [lensId, setLensId] = useState<string | null>(null);

  // Restore state from localStorage
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setPhase(saved.phase);
      setBriefId(saved.briefId);
      setLensId(saved.lensId);
    }
  }, []);

  // Persist state
  useEffect(() => {
    saveState({ phase, briefId, lensId });
  }, [phase, briefId, lensId]);

  const goToPhase = useCallback((p: Phase) => {
    setPhase(p);
  }, []);

  // ── Brief state ────────────────────────────────────────────

  const { createBrief, uploadDocument, addTextDocument, addUrlDocument } = usePitchBriefStore();
  const [briefStep, setBriefStep] = useState(0); // 0=name, 1=docs, 2=done
  const [briefName, setBriefName] = useState('');
  const [briefDesc, setBriefDesc] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingTexts, setPendingTexts] = useState<Array<{ title: string; content: string }>>([]);
  const [pendingUrls, setPendingUrls] = useState<Array<{ title: string; url: string }>>([]);
  const [textTitle, setTextTitle] = useState('');
  const [textInput, setTextInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [ingestionVerb, setIngestionVerb] = useState(0);
  const ingestionTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isSubmitting && briefStep === 1) {
      setIngestionVerb(Math.floor(Math.random() * INGESTION_VERBS.length));
      ingestionTimer.current = setInterval(() => {
        setIngestionVerb((v) => (v + 1) % INGESTION_VERBS.length);
      }, 2800);
    } else if (ingestionTimer.current) {
      clearInterval(ingestionTimer.current);
      ingestionTimer.current = null;
    }
    return () => { if (ingestionTimer.current) clearInterval(ingestionTimer.current); };
  }, [isSubmitting, briefStep]);

  const totalDocs = pendingFiles.length + pendingTexts.length + pendingUrls.length;

  const handleBriefNext = useCallback(async () => {
    if (briefStep === 0) {
      if (!briefName.trim()) return;
      setIsSubmitting(true);
      try {
        const id = await createBrief({ name: briefName, description: briefDesc || undefined });
        setBriefId(id);
        setBriefStep(1);
      } catch (err) {
        console.error('Failed to create brief:', err);
      } finally {
        setIsSubmitting(false);
      }
    } else if (briefStep === 1) {
      if (!briefId) return;
      setIsSubmitting(true);
      setUploadError(null);
      try {
        for (const file of pendingFiles) {
          await uploadDocument(briefId, file);
        }
        for (const text of pendingTexts) {
          await addTextDocument(briefId, text.content, text.title);
        }
        for (const url of pendingUrls) {
          await addUrlDocument(briefId, url.url, url.title);
        }
        setBriefStep(2);
      } catch (err: any) {
        console.error('Failed to upload documents:', err);
        setUploadError(err?.message || 'Upload failed. Check file type (PDF, DOCX, TXT, MD, CSV, XLSX, PPTX) and try again.');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      goToPhase('lens');
    }
  }, [briefStep, briefName, briefDesc, briefId, pendingFiles, pendingTexts, pendingUrls, createBrief, uploadDocument, addTextDocument, addUrlDocument, goToPhase]);

  // ── Lens state ─────────────────────────────────────────────

  const { createLens, getRecommendations, recommendations, loadFrameworks } = usePitchLensStore();
  const [lensStep, setLensStep] = useState(0); // 0..6
  const [lensForm, setLensForm] = useState<CreatePitchLensInput>({
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
  });

  useEffect(() => {
    loadFrameworks();
  }, [loadFrameworks]);

  // Auto-select top recommendation when recommendations load
  useEffect(() => {
    if (lensStep === 5 && recommendations.length > 0 && !lensForm.selectedFramework) {
      setLensForm((f) => ({ ...f, selectedFramework: recommendations[0].framework.id }));
    }
  }, [recommendations, lensStep, lensForm.selectedFramework]);

  const lensCanProceed = (): boolean => {
    switch (lensStep) {
      case 0: return lensForm.name.trim().length > 0;
      case 1: return lensForm.audienceType !== '';
      case 2: return lensForm.pitchGoal !== '';
      case 3: return lensForm.industry.trim().length > 0;
      case 4: return lensForm.toneStyle !== '';
      case 5: return lensForm.selectedFramework !== '';
      case 6: return true;
      default: return false;
    }
  };

  const handleLensNext = useCallback(async () => {
    if (lensStep === 4) {
      await getRecommendations({
        audienceType: lensForm.audienceType,
        pitchGoal: lensForm.pitchGoal,
        companyStage: lensForm.companyStage,
        technicalLevel: lensForm.technicalLevel,
      });
    }
    setLensStep(lensStep + 1);
  }, [lensStep, lensForm, getRecommendations]);

  const handleLensSubmit = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const id = await createLens(lensForm);
      setLensId(id);
      goToPhase('generate');
    } catch (err) {
      console.error('Failed to create lens:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [lensForm, createLens, goToPhase]);

  // ── Generate ───────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding();
      clearState();
      const params = new URLSearchParams();
      if (briefId) params.set('briefId', briefId);
      if (lensId) params.set('lensId', lensId);
      const qs = params.toString();
      navigate(`/workspace/new${qs ? `?${qs}` : ''}`, { replace: true });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [completeOnboarding, clearState, navigate, briefId, lensId]);

  // ── Drag & Drop handlers ───────────────────────────────────

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setPendingFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
  }, []);

  // ── LENS STEPS labels ──────────────────────────────────────

  const LENS_STEPS = [
    t('onboarding.lens.step_name'),
    t('onboarding.lens.step_audience'),
    t('onboarding.lens.step_goal'),
    t('onboarding.lens.step_context'),
    t('onboarding.lens.step_tone'),
    t('onboarding.lens.step_framework'),
    t('onboarding.lens.step_review'),
  ] as const;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Minimal header */}
      <header className="flex h-14 items-center justify-center border-b border-border">
        <div className="flex items-center gap-2">
          <PeachLogo className="h-5 w-5" />
          <span className="text-lg font-bold text-foreground">{t('common.app_name')}</span>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* ─── Welcome ──────────────────────────────────── */}
          {phase === 'welcome' && (
            <div className="space-y-8 text-center">
              <div>
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-foreground">{t('onboarding.welcome.title')}</h1>
                <p className="mt-2 text-muted-foreground">
                  {t('onboarding.welcome.subtitle')}
                </p>
              </div>

              <div className="mx-auto max-w-md space-y-4">
                {[
                  { icon: BookOpen, label: t('onboarding.welcome.step_1_label'), desc: t('onboarding.welcome.step_1_desc') },
                  { icon: Focus, label: t('onboarding.welcome.step_2_label'), desc: t('onboarding.welcome.step_2_desc') },
                  { icon: PeachLogo, label: t('onboarding.welcome.step_3_label'), desc: t('onboarding.welcome.step_3_desc') },
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-4 rounded-lg border border-border bg-card p-4 text-left">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{step.label}</p>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mx-auto max-w-md rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-left">
                <p className="text-sm font-medium text-amber-400">{t('onboarding.welcome.credits_title')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('onboarding.welcome.credits_desc')}</p>
              </div>

              <button
                onClick={() => goToPhase('brief')}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {t('onboarding.welcome.get_started')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* ─── Brief ────────────────────────────────────── */}
          {phase === 'brief' && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-primary">{t('onboarding.brief.step_label')}</p>
                <h2 className="text-2xl font-bold text-foreground">{t('onboarding.brief.title')}</h2>
                <p className="mt-1 text-muted-foreground">
                  {t('onboarding.brief.subtitle')}
                </p>
              </div>

              {/* Brief step indicators */}
              <div className="flex items-center gap-2">
                {[t('onboarding.brief.step_name'), t('onboarding.brief.step_documents'), t('onboarding.brief.step_done')].map((label, i) => (
                  <div key={label} className="flex items-center gap-2">
                    <div className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                      i < briefStep ? 'bg-primary text-primary-foreground'
                        : i === briefStep ? 'border-2 border-primary text-primary'
                        : 'border border-border text-muted-foreground',
                    )}>
                      {i < briefStep ? <Check className="h-3.5 w-3.5" /> : i + 1}
                    </div>
                    {i < 2 && <div className={cn('h-px w-8', i < briefStep ? 'bg-primary' : 'bg-border')} />}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                {/* Brief Step 0: Name */}
                {briefStep === 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t('onboarding.brief.brief_name_label')}</label>
                      <input
                        type="text"
                        value={briefName}
                        onChange={(e) => setBriefName(e.target.value)}
                        maxLength={100}
                        placeholder={t('onboarding.brief.brief_name_placeholder')}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t('onboarding.brief.description_label')}</label>
                      <textarea
                        value={briefDesc}
                        onChange={(e) => setBriefDesc(e.target.value)}
                        rows={3}
                        maxLength={2000}
                        placeholder={t('onboarding.brief.description_placeholder')}
                        className="w-full rounded-lg border border-border bg-background px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                    </div>
                  </div>
                )}

                {/* Brief Step 1: Documents */}
                {briefStep === 1 && (
                  <div className="space-y-6">
                    {!isSubmitting && (<>
                    {/* File upload */}
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={cn(
                        'border-2 border-dashed rounded-lg p-6 text-center transition-colors',
                        dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                      )}
                    >
                      <Upload className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                      <p className="text-sm text-foreground">{t('onboarding.brief.drag_drop_files')}</p>
                      <label className="mt-2 inline-block cursor-pointer rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90">
                        {t('onboarding.brief.browse_files')}
                        <input type="file" multiple onChange={(e) => {
                          setPendingFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                        }} className="hidden" />
                      </label>
                    </div>

                    {/* Text input */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground">{t('onboarding.brief.add_text_title')}</h3>
                      <input
                        type="text" value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder={t('onboarding.brief.document_title_placeholder')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        rows={3}
                        placeholder={t('onboarding.brief.paste_text_placeholder')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                      <button
                        onClick={() => {
                          if (textTitle.trim() && textInput.trim()) {
                            setPendingTexts((prev) => [...prev, { title: textTitle, content: textInput }]);
                            setTextTitle(''); setTextInput('');
                          }
                        }}
                        disabled={!textTitle.trim() || !textInput.trim()}
                        className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {t('onboarding.brief.add_text_title')}
                      </button>
                    </div>

                    {/* URL input */}
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-foreground">{t('onboarding.brief.add_url_title')}</h3>
                      <input
                        type="text" value={urlTitle}
                        onChange={(e) => setUrlTitle(e.target.value)}
                        placeholder={t('onboarding.brief.document_title_placeholder')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="url" value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder={t('onboarding.brief.url_placeholder')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <button
                        onClick={() => {
                          if (urlTitle.trim() && urlInput.trim()) {
                            setPendingUrls((prev) => [...prev, { title: urlTitle, url: urlInput }]);
                            setUrlTitle(''); setUrlInput('');
                          }
                        }}
                        disabled={!urlTitle.trim() || !urlInput.trim()}
                        className="rounded-lg bg-primary px-4 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        {t('onboarding.brief.add_url_title')}
                      </button>
                    </div>
                    </>)}

                    {/* Upload error */}
                    {uploadError && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                        {uploadError}
                      </div>
                    )}

                    {/* Ingestion loading overlay */}
                    {isSubmitting && (
                      <div
                        className="flex flex-col items-center justify-center gap-4 rounded-xl border border-orange-500/20 bg-orange-500/5 py-10"
                        style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
                      >
                        <div className="relative">
                          <div
                            className="absolute -inset-3 rounded-full opacity-20"
                            style={{
                              background: 'radial-gradient(circle, #f97316 0%, transparent 70%)',
                              animation: 'shimmer 2s ease-in-out infinite',
                            }}
                          />
                          <PeachLogo className="h-14 w-14 animate-[spin_4s_linear_infinite]" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium text-foreground">
                            Ingesting {totalDocs} {totalDocs === 1 ? 'document' : 'documents'}...
                          </p>
                          <p
                            className="mt-1 text-xs font-medium"
                            style={{
                              backgroundImage: 'linear-gradient(to right, #fb923c, #ea580c, #171717)',
                              backgroundSize: '200% 100%',
                              backgroundClip: 'text',
                              WebkitBackgroundClip: 'text',
                              color: 'transparent',
                              animation: 'gradientShift 3s ease-in-out infinite',
                            }}
                          >
                            {INGESTION_VERBS[ingestionVerb]}...
                          </p>
                        </div>
                        <div
                          className="h-0.5 w-48 overflow-hidden rounded-full bg-orange-500/10"
                        >
                          <div
                            className="h-full rounded-full"
                            style={{
                              background: 'linear-gradient(90deg, #f97316, #fb923c, #f97316)',
                              backgroundSize: '200% 100%',
                              animation: 'shimmer 1.5s ease-in-out infinite',
                              width: '100%',
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Pending documents list */}
                    {!isSubmitting && totalDocs > 0 && (
                      <div>
                        <h3 className="mb-2 text-sm font-medium text-foreground">{t('onboarding.brief.added_count', { count: totalDocs })}</h3>
                        <div className="space-y-2">
                          {pendingFiles.map((f, i) => (
                            <div key={`f-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">{f.name}</span>
                              </div>
                              <button onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          {pendingTexts.map((pt, i) => (
                            <div key={`t-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">{pt.title}</span>
                              </div>
                              <button onClick={() => setPendingTexts((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                          {pendingUrls.map((u, i) => (
                            <div key={`u-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-background p-2.5">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm text-foreground">{u.title}</span>
                              </div>
                              <button onClick={() => setPendingUrls((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Brief Step 2: Done */}
                {briefStep === 2 && (
                  <div className="space-y-4 text-center py-4">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                      <Check className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{t('onboarding.brief.brief_created')}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('onboarding.brief.brief_created_desc', { name: briefName, count: totalDocs, documentWord: totalDocs === 1 ? t('common.document') : t('common.documents') })}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Brief navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => briefStep > 0 ? setBriefStep(briefStep - 1) : goToPhase('welcome')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.back')}
                </button>
                <div className="flex gap-3">
                  {briefStep === 0 && (
                    <button
                      onClick={() => goToPhase('lens')}
                      className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                    >
                      {t('onboarding.brief.skip_brief')}
                    </button>
                  )}
                  {briefStep === 1 && (
                    <button
                      onClick={() => setBriefStep(2)}
                      disabled={isSubmitting}
                      className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent"
                    >
                      {t('onboarding.brief.skip_documents')}
                    </button>
                  )}
                  <button
                    onClick={handleBriefNext}
                    disabled={isSubmitting || (briefStep === 0 && !briefName.trim())}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSubmitting ? t('common.saving') : briefStep === 2 ? t('onboarding.brief.continue_to_strategy') : t('common.next')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ─── Lens ─────────────────────────────────────── */}
          {phase === 'lens' && (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium text-primary">{t('onboarding.lens.step_label')}</p>
                <h2 className="text-2xl font-bold text-foreground">{t('onboarding.lens.title')}</h2>
                <p className="mt-1 text-muted-foreground">
                  {t('onboarding.lens.subtitle')}
                </p>
              </div>

              {/* Lens step indicators */}
              <div className="flex items-center gap-1">
                {LENS_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={cn(
                      'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-medium',
                      i < lensStep ? 'bg-primary text-primary-foreground'
                        : i === lensStep ? 'border-2 border-primary text-primary'
                        : 'border border-border text-muted-foreground',
                    )}>
                      {i < lensStep ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    {i < LENS_STEPS.length - 1 && (
                      <div className={cn('h-px w-3', i < lensStep ? 'bg-primary' : 'bg-border')} />
                    )}
                  </div>
                ))}
              </div>

              <div className="rounded-lg border border-border bg-card p-6">
                {/* Step 0: Name */}
                {lensStep === 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t('onboarding.lens.lens_name_label')}</label>
                      <input
                        type="text"
                        value={lensForm.name}
                        onChange={(e) => setLensForm({ ...lensForm, name: e.target.value })}
                        placeholder={t('onboarding.lens.lens_name_placeholder')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t('onboarding.lens.description_label')}</label>
                      <textarea
                        value={lensForm.description}
                        onChange={(e) => setLensForm({ ...lensForm, description: e.target.value })}
                        placeholder={t('onboarding.lens.description_placeholder')}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Step 1: Audience */}
                {lensStep === 1 && (
                  <CardSelector
                    options={AUDIENCE_OPTIONS}
                    value={lensForm.audienceType}
                    onChange={(v) => setLensForm({ ...lensForm, audienceType: v })}
                  />
                )}

                {/* Step 2: Goal */}
                {lensStep === 2 && (
                  <CardSelector
                    options={GOAL_OPTIONS}
                    value={lensForm.pitchGoal}
                    onChange={(v) => setLensForm({ ...lensForm, pitchGoal: v })}
                  />
                )}

                {/* Step 3: Context */}
                {lensStep === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t('onboarding.lens.industry_label')}</label>
                      <input
                        type="text"
                        value={lensForm.industry}
                        onChange={(e) => setLensForm({ ...lensForm, industry: e.target.value })}
                        placeholder={t('onboarding.lens.industry_placeholder')}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t('onboarding.lens.company_stage_label')}</label>
                      <div className="flex gap-2">
                        {STAGE_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setLensForm({ ...lensForm, companyStage: opt.value })}
                            className={cn(
                              'flex-1 rounded-lg border-2 px-3 py-2 text-sm font-medium transition-colors',
                              lensForm.companyStage === opt.value
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
                      <label className="mb-1.5 block text-sm font-medium text-foreground">{t('onboarding.lens.technical_level_label')}</label>
                      <div className="flex gap-2">
                        {TECH_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => setLensForm({ ...lensForm, technicalLevel: opt.value })}
                            className={cn(
                              'flex-1 rounded-lg border-2 px-3 py-1.5 text-xs font-medium transition-colors',
                              lensForm.technicalLevel === opt.value
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
                {lensStep === 4 && (
                  <CardSelector
                    options={TONE_OPTIONS}
                    value={lensForm.toneStyle}
                    onChange={(v) => setLensForm({ ...lensForm, toneStyle: v })}
                  />
                )}

                {/* Step 5: Framework */}
                {lensStep === 5 && (
                  <div className="space-y-4">
                    {recommendations.length > 0 && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          {t('onboarding.lens.framework_recommendation')}
                        </p>
                        <div className="space-y-3">
                          {recommendations.map((rec, i) => (
                            <button
                              key={rec.framework.id}
                              onClick={() => setLensForm({ ...lensForm, selectedFramework: rec.framework.id })}
                              className={cn(
                                'w-full rounded-lg border-2 p-4 text-left transition-colors',
                                lensForm.selectedFramework === rec.framework.id
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
                              <p className="mb-2 text-sm text-muted-foreground">{rec.framework.shortDescription}</p>
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
                        {t('onboarding.lens.custom_guidance_label')}
                      </label>
                      <textarea
                        value={lensForm.customGuidance}
                        onChange={(e) => setLensForm({ ...lensForm, customGuidance: e.target.value })}
                        placeholder={t('onboarding.lens.custom_guidance_placeholder')}
                        rows={3}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                )}

                {/* Step 6: Review */}
                {lensStep === 6 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-border pb-4">
                      <Focus className="h-6 w-6 text-primary" />
                      <div>
                        <h3 className="font-semibold text-foreground">{lensForm.name}</h3>
                        {lensForm.description && (
                          <p className="text-sm text-muted-foreground">{lensForm.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {[
                        { label: t('onboarding.lens.review_audience'), value: formatEnum(lensForm.audienceType) },
                        { label: t('onboarding.lens.review_goal'), value: formatEnum(lensForm.pitchGoal) },
                        { label: t('onboarding.lens.review_industry'), value: lensForm.industry },
                        { label: t('onboarding.lens.review_stage'), value: formatEnum(lensForm.companyStage) },
                        { label: t('onboarding.lens.review_tone'), value: formatEnum(lensForm.toneStyle) },
                        { label: t('onboarding.lens.review_technical_level'), value: formatEnum(lensForm.technicalLevel) },
                      ].map((item) => (
                        <div key={item.label}>
                          <p className="text-xs text-muted-foreground">{item.label}</p>
                          <p className="text-sm font-medium text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {lensForm.selectedFramework && (
                      <div className="border-t border-border pt-3">
                        <p className="text-xs text-muted-foreground">{t('onboarding.lens.review_framework')}</p>
                        <p className="text-sm font-medium text-foreground">{formatEnum(lensForm.selectedFramework)}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lens navigation */}
              <div className="flex justify-between">
                <button
                  onClick={() => lensStep > 0 ? setLensStep(lensStep - 1) : goToPhase(briefId ? 'brief' : 'welcome')}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm hover:bg-accent"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.back')}
                </button>

                {lensStep < LENS_STEPS.length - 1 ? (
                  <button
                    onClick={handleLensNext}
                    disabled={!lensCanProceed()}
                    className={cn(
                      'flex items-center gap-1.5 rounded-lg px-6 py-2 text-sm font-medium',
                      lensCanProceed()
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'cursor-not-allowed bg-muted text-muted-foreground',
                    )}
                  >
                    {t('common.next')}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={handleLensSubmit}
                    disabled={isSubmitting}
                    className="flex items-center gap-1.5 rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isSubmitting ? t('common.creating') : t('onboarding.lens.create_lens')}
                    <Check className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ─── Generate ─────────────────────────────────── */}
          {phase === 'generate' && (
            <div className="space-y-8 text-center">
              <div>
                <p className="text-sm font-medium text-primary">{t('onboarding.generate.step_label')}</p>
                <h2 className="text-2xl font-bold text-foreground">{t('onboarding.generate.title')}</h2>
                <p className="mt-1 text-muted-foreground">
                  {t('onboarding.generate.subtitle')}
                </p>
              </div>

              <div className="mx-auto max-w-md space-y-3">
                {briefId && (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{t('onboarding.generate.brief_label')}</p>
                      <p className="text-sm font-medium text-foreground">{briefName || t('onboarding.generate.created')}</p>
                    </div>
                    <Check className="ml-auto h-4 w-4 text-green-500" />
                  </div>
                )}
                {lensId && (
                  <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                    <Focus className="h-5 w-5 text-primary" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">{t('onboarding.generate.lens_label')}</p>
                      <p className="text-sm font-medium text-foreground">{lensForm.name || t('onboarding.generate.created')}</p>
                    </div>
                    <Check className="ml-auto h-4 w-4 text-green-500" />
                  </div>
                )}
              </div>

              <button
                onClick={handleGenerate}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-8 py-3 font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? t('onboarding.generate.setting_up') : t('onboarding.generate.open_workspace')}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;
