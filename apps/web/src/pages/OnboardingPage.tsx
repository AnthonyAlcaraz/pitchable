import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import {
  ArrowRight,
  Upload,
  FileText,
  X,
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

// ── Main Component ────────────────────────────────────────────

export function OnboardingPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);

  // Already completed onboarding — redirect
  useEffect(() => {
    if (user?.onboardingCompleted) {
      navigate('/cockpit', { replace: true });
    }
  }, [user, navigate]);

  // ── Brief store ──────────────────────────────────────────────

  const { createBrief, uploadDocument, addTextDocument, addUrlDocument } = usePitchBriefStore();

  // ── Local state ──────────────────────────────────────────────

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingTexts, setPendingTexts] = useState<Array<{ title: string; content: string }>>([]);
  const [pendingUrls, setPendingUrls] = useState<Array<{ title: string; url: string }>>([]);
  const [textTitle, setTextTitle] = useState('');
  const [textInput, setTextInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ingestionVerb, setIngestionVerb] = useState(0);
  const ingestionTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [showTextInput, setShowTextInput] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);

  // Ingestion animation
  useEffect(() => {
    if (isSubmitting) {
      setIngestionVerb(Math.floor(Math.random() * INGESTION_VERBS.length));
      ingestionTimer.current = setInterval(() => {
        setIngestionVerb((v) => (v + 1) % INGESTION_VERBS.length);
      }, 2800);
    } else if (ingestionTimer.current) {
      clearInterval(ingestionTimer.current);
      ingestionTimer.current = null;
    }
    return () => { if (ingestionTimer.current) clearInterval(ingestionTimer.current); };
  }, [isSubmitting]);

  const totalDocs = pendingFiles.length + pendingTexts.length + pendingUrls.length;

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

  // ── Create deck handler ─────────────────────────────────────

  const handleCreateDeck = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      let briefId: string | undefined;

      if (totalDocs > 0) {
        // Auto-generate brief name from first document
        const autoName = (pendingFiles[0]?.name?.replace(/\.[^.]+$/, '')
          || pendingTexts[0]?.title
          || pendingUrls[0]?.title
          || 'My Pitch Deck').slice(0, 200);

        briefId = await createBrief({ name: autoName });

        // Upload all documents
        for (const file of pendingFiles) {
          await uploadDocument(briefId, file);
        }
        for (const text of pendingTexts) {
          await addTextDocument(briefId, text.content, text.title);
        }
        for (const url of pendingUrls) {
          await addUrlDocument(briefId, url.url, url.title);
        }
      }

      await completeOnboarding();
      const params = new URLSearchParams();
      if (briefId) params.set('briefId', briefId);
      const qs = params.toString();
      navigate(`/workspace/new${qs ? `?${qs}` : ''}`, { replace: true });
    } catch (err: unknown) {
      console.error('Onboarding error:', err);
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }, [totalDocs, pendingFiles, pendingTexts, pendingUrls, createBrief, uploadDocument, addTextDocument, addUrlDocument, completeOnboarding, navigate]);

  // ── Skip handler ────────────────────────────────────────────

  const handleSkip = useCallback(async () => {
    setIsSubmitting(true);
    try {
      await completeOnboarding();
      navigate('/workspace/new', { replace: true });
    } catch (err) {
      console.error('Failed to complete onboarding:', err);
    } finally {
      setIsSubmitting(false);
    }
  }, [completeOnboarding, navigate]);

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

      <main className="flex flex-1 items-start justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-xl">

          {/* Ingestion loading state */}
          {isSubmitting ? (
            <div
              className="flex flex-col items-center justify-center gap-6 rounded-xl border border-orange-500/20 bg-orange-500/5 py-16"
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
                <p className="text-base font-medium text-foreground">
                  {totalDocs > 0
                    ? `Ingesting ${totalDocs} ${totalDocs === 1 ? 'document' : 'documents'}...`
                    : 'Setting up your workspace...'}
                </p>
                {totalDocs > 0 && (
                  <p
                    className="mt-1 text-sm font-medium"
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
                )}
              </div>
              <div className="h-0.5 w-48 overflow-hidden rounded-full bg-orange-500/10">
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
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
                  {t('onboarding.upload.title', { defaultValue: 'Add your context' })}
                </h1>
                <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                  {t('onboarding.upload.subtitle', { defaultValue: 'Upload documents, paste text, or add URLs. AI will build your pitch deck.' })}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              {/* Upload card */}
              <div className="rounded-xl border border-border bg-card p-5 sm:p-6">

                {/* File upload area */}
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-8 text-center transition-colors',
                    dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
                  )}
                >
                  <Upload className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">
                    {t('onboarding.upload.drag_drop', { defaultValue: 'Drag & drop files here' })}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('onboarding.upload.file_types', { defaultValue: 'PDF, DOCX, TXT, PPTX, images' })}
                  </p>
                  <label className="mt-3 inline-block cursor-pointer rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
                    {t('onboarding.upload.browse', { defaultValue: 'Browse files' })}
                    <input type="file" multiple onChange={(e) => {
                      setPendingFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
                    }} className="hidden" />
                  </label>
                </div>

                {/* Toggle buttons for text/URL */}
                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowTextInput(!showTextInput)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      showTextInput ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    + Paste text
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    className={cn(
                      'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                      showUrlInput ? 'border-primary bg-primary/5 text-primary' : 'border-border text-muted-foreground hover:text-foreground',
                    )}
                  >
                    + Add URL
                  </button>
                </div>

                {/* Text input */}
                {showTextInput && (
                  <div className="mt-4 space-y-2">
                    <input
                      type="text" value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      placeholder={t('onboarding.upload.text_title_placeholder', { defaultValue: 'Title (e.g. Company Overview)' })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <textarea
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      rows={3}
                      placeholder={t('onboarding.upload.text_content_placeholder', { defaultValue: 'Paste your content here...' })}
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
                      className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
                    >
                      Add text
                    </button>
                  </div>
                )}

                {/* URL input */}
                {showUrlInput && (
                  <div className="mt-4 space-y-2">
                    <input
                      type="text" value={urlTitle}
                      onChange={(e) => setUrlTitle(e.target.value)}
                      placeholder={t('onboarding.upload.url_title_placeholder', { defaultValue: 'Title (e.g. Product Page)' })}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <input
                      type="url" value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder={t('onboarding.upload.url_placeholder', { defaultValue: 'https://...' })}
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
                      className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50 transition-colors"
                    >
                      Add URL
                    </button>
                  </div>
                )}

                {/* Pending documents list */}
                {totalDocs > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      {totalDocs} {totalDocs === 1 ? 'document' : 'documents'} added
                    </p>
                    <div className="space-y-1.5">
                      {pendingFiles.map((f, i) => (
                        <div key={`f-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm text-foreground">{f.name}</span>
                          </div>
                          <button onClick={() => setPendingFiles((prev) => prev.filter((_, j) => j !== i))} className="ml-2 flex-shrink-0 text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {pendingTexts.map((pt, i) => (
                        <div key={`t-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm text-foreground">{pt.title}</span>
                          </div>
                          <button onClick={() => setPendingTexts((prev) => prev.filter((_, j) => j !== i))} className="ml-2 flex-shrink-0 text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                      {pendingUrls.map((u, i) => (
                        <div key={`u-${i}`} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <span className="truncate text-sm text-foreground">{u.title}</span>
                          </div>
                          <button onClick={() => setPendingUrls((prev) => prev.filter((_, j) => j !== i))} className="ml-2 flex-shrink-0 text-muted-foreground hover:text-foreground">
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => void handleCreateDeck()}
                  disabled={isSubmitting}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-8 py-3 text-base font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors sm:w-auto"
                >
                  {totalDocs > 0 ? (
                    <>
                      <Sparkles className="h-4 w-4" />
                      {t('onboarding.upload.create_deck', { defaultValue: 'Create my deck' })}
                    </>
                  ) : (
                    <>
                      <ArrowRight className="h-4 w-4" />
                      {t('onboarding.upload.start_fresh', { defaultValue: 'Start from scratch' })}
                    </>
                  )}
                </button>
                {totalDocs > 0 && (
                  <button
                    onClick={() => void handleSkip()}
                    disabled={isSubmitting}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('onboarding.upload.skip', { defaultValue: 'Skip — start without context' })}
                  </button>
                )}
              </div>

              {/* Credits note */}
              <p className="text-center text-xs text-muted-foreground">
                {t('onboarding.upload.credits_note', { defaultValue: 'You have 15 free credits. Creating a deck costs 5 credits.' })}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default OnboardingPage;
