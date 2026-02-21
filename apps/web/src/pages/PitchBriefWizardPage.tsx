import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { useKbStore } from '@/stores/kb.store';
import { useDocumentProgress } from '@/hooks/useDocumentProgress';
import { ArrowLeft, ArrowRight, BookOpen, Upload, Check, FileText, X, Loader2, Globe } from 'lucide-react';

const PIPELINE_STEPS = ['Parse', 'Chunk', 'Index', 'Embed', 'Done'] as const;

function getStepIndex(step?: string): number {
  if (!step) return -1;
  if (step === 'parsing' || step === 'hashing') return 0;
  if (step === 'chunking' || step === 'storing_chunks') return 1;
  if (step === 'deduplicating' || step === 'indexing') return 2;
  if (step === 'embedding') return 3;
  if (step === 'ready') return 4;
  return -1;
}

export function PitchBriefWizardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  const STEPS = [
    { number: 1, label: t('pitch_briefs.wizard.step_1') },
    { number: 2, label: t('pitch_briefs.wizard.step_2') },
    { number: 3, label: t('pitch_briefs.wizard.step_3') },
  ];

  const { briefs, createBrief, updateBrief, loadBriefs, uploadDocument, addTextDocument, addUrlDocument, crawlWebsite } = usePitchBriefStore();
  const currentBrief = usePitchBriefStore((s) => s.currentBrief);
  const loadBrief = usePitchBriefStore((s) => s.loadBrief);
  const documentProgress = useKbStore((s) => s.documentProgress);

  // Establish WebSocket listener for document:progress events
  useDocumentProgress();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [briefId, setBriefId] = useState<string | null>(id || null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingTexts, setPendingTexts] = useState<Array<{ title: string; content: string }>>([]);
  const [pendingUrls, setPendingUrls] = useState<Array<{ title: string; url: string; crawl?: boolean; maxPages?: number; maxDepth?: number }>>([]);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [isUploaded, setIsUploaded] = useState(false);
  const [urlCrawlMode, setUrlCrawlMode] = useState(false);
  const [crawlMaxPages, setCrawlMaxPages] = useState(20);
  const [crawlMaxDepth, setCrawlMaxDepth] = useState(2);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  // Track elapsed time during processing
  const processingStartRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (isEditMode && id) {
      loadBriefs();
    }
  }, [isEditMode, id, loadBriefs]);

  useEffect(() => {
    if (isEditMode && id && briefs.length > 0) {
      const brief = briefs.find((b) => b.id === id);
      if (brief) {
        setName(brief.name);
        setDescription(brief.description || '');
      }
    }
  }, [isEditMode, id, briefs]);

  // Poll brief every 5s during processing (fallback for missed WebSocket events)
  useEffect(() => {
    if (!isUploaded || !briefId) return;

    const poll = setInterval(() => { loadBrief(briefId); }, 5000);
    return () => clearInterval(poll);
  }, [isUploaded, briefId, loadBrief]);

  // Track elapsed time during processing
  useEffect(() => {
    if (isUploaded && currentBrief) {
      const hasProcessing = currentBrief.documents.some(
        (d) => d.status !== 'READY' && d.status !== 'ERROR'
      );
      if (hasProcessing && !processingStartRef.current) {
        processingStartRef.current = Date.now();
      }
      if (!hasProcessing) {
        processingStartRef.current = null;
      }
    }
  }, [isUploaded, currentBrief]);

  useEffect(() => {
    if (!processingStartRef.current) {
      setElapsedSeconds(0);
      return;
    }
    const tick = setInterval(() => {
      if (processingStartRef.current) {
        setElapsedSeconds(Math.floor((Date.now() - processingStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [isUploaded, currentBrief]);

  // Auto-advance when all docs reach terminal state
  useEffect(() => {
    if (!isUploaded || !currentBrief) return;
    const docs = currentBrief.documents;
    if (docs.length === 0) return;

    const allTerminal = docs.every(
      (d) => d.status === 'READY' || d.status === 'ERROR'
    );

    if (allTerminal) {
      const timer = setTimeout(() => setStep(3), 1500);
      return () => clearTimeout(timer);
    }
  }, [isUploaded, currentBrief]);

  const handleNext = useCallback(async () => {
    if (step === 1) {
      if (!name.trim()) return;

      setIsSubmitting(true);
      try {
        if (isEditMode && briefId) {
          await updateBrief(briefId, { name, description });
          navigate(`/pitch-briefs/${briefId}`);
        } else {
          const newBriefId = await createBrief({ name, description });
          setBriefId(newBriefId);
          setStep(2);
        }
      } catch (error) {
        console.error('Failed to create/update brief:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else if (step === 2) {
      if (!briefId) return;
      const totalDocs = pendingFiles.length + pendingTexts.length + pendingUrls.length;
      if (totalDocs === 0) { setStep(3); return; }

      setIsSubmitting(true);
      try {
        let idx = 0;
        setUploadProgress({ current: 0, total: totalDocs });

        for (const file of pendingFiles) {
          setUploadProgress({ current: ++idx, total: totalDocs });
          await uploadDocument(briefId, file);
        }
        for (const text of pendingTexts) {
          setUploadProgress({ current: ++idx, total: totalDocs });
          await addTextDocument(briefId, text.content, text.title);
        }
        for (const url of pendingUrls) {
          setUploadProgress({ current: ++idx, total: totalDocs });
          if (url.crawl) {
            await crawlWebsite(briefId, url.url, url.maxPages, url.maxDepth);
          } else {
            await addUrlDocument(briefId, url.url, url.title);
          }
        }
        setUploadProgress(null);
        // Stay on step 2, show processing progress
        setIsUploaded(true);
        await loadBrief(briefId);
      } catch (error) {
        console.error('Failed to upload documents:', error);
        setUploadProgress(null);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [step, name, description, briefId, isEditMode, pendingFiles, pendingTexts, pendingUrls, createBrief, updateBrief, uploadDocument, addTextDocument, addUrlDocument, crawlWebsite, navigate, loadBrief]);

  const handleSkip = useCallback(() => {
    if (step === 2) {
      setStep(3);
    }
  }, [step]);

  const handleBack = useCallback(() => {
    if (step > 1) {
      setStep(step - 1);
    }
  }, [step]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    setPendingFiles((prev) => [...prev, ...files]);
  }, []);

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeText = useCallback((index: number) => {
    setPendingTexts((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const removeUrl = useCallback((index: number) => {
    setPendingUrls((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const addText = useCallback(() => {
    if (!textInput.trim() || !textTitle.trim()) return;
    setPendingTexts((prev) => [...prev, { title: textTitle, content: textInput }]);
    setTextInput('');
    setTextTitle('');
  }, [textInput, textTitle]);

  const addUrl = useCallback(() => {
    if (!urlInput.trim() || !urlTitle.trim()) return;
    setPendingUrls((prev) => [...prev, {
      title: urlTitle,
      url: urlInput,
      ...(urlCrawlMode ? { crawl: true, maxPages: crawlMaxPages, maxDepth: crawlMaxDepth } : {}),
    }]);
    setUrlInput('');
    setUrlTitle('');
    setUrlCrawlMode(false);
  }, [urlInput, urlTitle, urlCrawlMode, crawlMaxPages, crawlMaxDepth]);

  const handleCreateAnother = useCallback(() => {
    setStep(1);
    setName('');
    setDescription('');
    setBriefId(null);
    setPendingFiles([]);
    setPendingTexts([]);
    setPendingUrls([]);
    setIsUploaded(false);
    setUploadProgress(null);
  }, []);

  const totalDocuments = pendingFiles.length + pendingTexts.length + pendingUrls.length;

  // Compute processing state for step 2 footer
  const isProcessing = isUploaded && currentBrief && currentBrief.documents.some(
    (d) => d.status !== 'READY' && d.status !== 'ERROR'
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <button
            onClick={() => navigate('/pitch-briefs')}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('pitch_briefs.wizard.back_to_briefs')}</span>
          </button>
          <h1 className="text-3xl font-bold text-foreground">
            {isEditMode ? t('pitch_briefs.wizard.edit_title') : t('pitch_briefs.wizard.create_title')}
          </h1>
        </div>

        {!isEditMode && (
          <div className="mb-8">
            <div className="flex items-center justify-between">
              {STEPS.map((s, index) => (
                <div key={s.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                        step > s.number
                          ? 'bg-primary border-primary text-primary-foreground'
                          : step === s.number
                          ? 'border-primary text-primary'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      {step > s.number ? <Check className="w-5 h-5" /> : s.number}
                    </div>
                    <span
                      className={`mt-2 text-sm ${
                        step === s.number ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {s.label}
                    </span>
                  </div>
                  {index < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-4 ${
                        step > s.number ? 'bg-primary' : 'bg-border'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
                  {t('pitch_briefs.wizard.brief_name_label')} <span className="text-red-500">{t('pitch_briefs.wizard.brief_name_required')}</span>
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={100}
                  placeholder={t('pitch_briefs.wizard.brief_name_placeholder')}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('common.characters_count', { count: name.length, max: 100 })}
                </p>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-foreground mb-2">
                  {t('pitch_briefs.wizard.description_label')}
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={6}
                  placeholder={t('pitch_briefs.wizard.description_placeholder')}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('common.characters_count', { count: description.length, max: 2000 })}
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={handleNext}
                  disabled={!name.trim() || isSubmitting}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isEditMode ? t('common.save') : t('common.next')}
                  {!isEditMode && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Upload progress overlay */}
              {isSubmitting && uploadProgress ? (
                <div className="space-y-4 py-8">
                  <div className="text-center mb-6">
                    <Loader2 className="w-10 h-10 animate-spin mx-auto mb-3" style={{ color: '#E88D67' }} />
                    <h2 className="text-xl font-semibold text-foreground">Uploading documents...</h2>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Uploading {uploadProgress.current} of {uploadProgress.total}...
                    </span>
                    <span className="font-mono tabular-nums" style={{ color: '#E88D67' }}>
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: '#FFF0E6' }}>
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(uploadProgress.current / uploadProgress.total) * 100}%`,
                        background: 'linear-gradient(90deg, #FFAB76, #FF9F6B, #E88D67)',
                      }}
                    />
                  </div>
                </div>
              ) : isUploaded && currentBrief ? (
                /* Processing progress view */
                <div className="space-y-4">
                  {(() => {
                    const docs = currentBrief.documents;
                    const readyCount = docs.filter(d => d.status === 'READY').length;
                    const errorCount = docs.filter(d => d.status === 'ERROR').length;
                    const processingCount = docs.length - readyCount - errorCount;
                    const totalCount = docs.length;
                    const doneCount = readyCount + errorCount;
                    const pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
                    return (
                      <>
                        <h2 className="text-xl font-semibold text-foreground">
                          {processingCount > 0
                            ? `Processing ${processingCount} document${processingCount !== 1 ? 's' : ''}...`
                            : `All ${totalCount} document${totalCount !== 1 ? 's' : ''} ready`}
                        </h2>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {doneCount}/{totalCount} documents ready
                            {elapsedSeconds > 0 && processingCount > 0 && (
                              <span className="ml-2 text-xs">({elapsedSeconds}s elapsed)</span>
                            )}
                          </span>
                          <span className="font-mono tabular-nums" style={{ color: '#E88D67' }}>
                            {pct}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: '#FFF0E6' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #FFAB76, #FF9F6B, #E88D67)' }}
                          />
                        </div>
                      </>
                    );
                  })()}

                  {/* Per-document rows */}
                  {currentBrief.documents.map((doc) => {
                    const progress = documentProgress[doc.id];
                    const isTerminal = doc.status === 'READY' || doc.status === 'ERROR';
                    return (
                      <div key={doc.id} className="p-3 bg-background border border-border rounded-lg">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-foreground truncate">{doc.title}</span>
                          {isTerminal && (
                            <span className={`text-xs font-medium ${doc.status === 'ERROR' ? 'text-red-500' : 'text-green-600'}`}>
                              {doc.status === 'READY' ? 'Ready' : 'Error'}
                            </span>
                          )}
                        </div>
                        {isTerminal ? (
                          <div className="flex items-center gap-1 mt-2">
                            {PIPELINE_STEPS.map((label, i) => (
                              <div key={label} className="flex items-center gap-1 flex-1">
                                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium ${
                                  doc.status === 'ERROR'
                                    ? 'bg-red-100 text-red-500'
                                    : 'bg-[#E88D67] text-white'
                                }`}>
                                  {doc.status === 'ERROR' ? (i === PIPELINE_STEPS.length - 1 ? 'X' : (String.fromCharCode(10003))) : String.fromCharCode(10003)}
                                </div>
                                <span className="text-[10px] text-foreground">{label}</span>
                                {i < PIPELINE_STEPS.length - 1 && (
                                  <div className={`flex-1 h-0.5 mx-0.5 ${doc.status === 'ERROR' ? 'bg-red-200' : 'bg-[#E88D67]'}`} />
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 mt-2">
                            {PIPELINE_STEPS.map((label, i) => {
                              const currentStep = getStepIndex(progress?.step);
                              const isDone = i < currentStep;
                              const isCurrent = i === currentStep;
                              return (
                                <div key={label} className="flex items-center gap-1 flex-1">
                                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 ${
                                    isDone ? 'bg-[#E88D67] text-white' :
                                    isCurrent ? 'bg-[#E88D67] text-white animate-pulse' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {isDone ? String.fromCharCode(10003) : i + 1}
                                  </div>
                                  <span className={`text-[10px] whitespace-nowrap ${isDone || isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {label}
                                  </span>
                                  {i < PIPELINE_STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 mx-0.5 ${isDone ? 'bg-[#E88D67]' : 'bg-border'}`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Document input sections (pre-upload) */
                <>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-4">{t('pitch_briefs.wizard.add_documents_title')}</h2>
                    <p className="text-muted-foreground mb-4">
                      {t('pitch_briefs.wizard.add_documents_desc')}
                    </p>
                    <p className="text-xs text-amber-400/80 mb-6">
                      {t('pitch_briefs.wizard.doc_credit_note')}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">{t('pitch_briefs.wizard.upload_files_title')}</h3>
                    <div
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                        dragActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-foreground mb-2">{t('pitch_briefs.wizard.drag_drop_text')}</p>
                      <p className="text-sm text-muted-foreground mb-4">{t('common.or')}</p>
                      <label className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 transition-colors">
                        {t('pitch_briefs.wizard.browse_files')}
                        <input
                          type="file"
                          multiple
                          onChange={handleFileChange}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">{t('pitch_briefs.wizard.add_text_title')}</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={textTitle}
                        onChange={(e) => setTextTitle(e.target.value)}
                        placeholder={t('pitch_briefs.wizard.document_title_placeholder')}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <textarea
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        rows={4}
                        placeholder={t('pitch_briefs.wizard.paste_text_placeholder')}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                      />
                      <button
                        onClick={addText}
                        disabled={!textInput.trim() || !textTitle.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {t('pitch_briefs.wizard.add_text_button')}
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-foreground mb-3">{t('pitch_briefs.wizard.add_url_title')}</h3>
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={urlTitle}
                        onChange={(e) => setUrlTitle(e.target.value)}
                        placeholder={t('pitch_briefs.wizard.document_title_placeholder')}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder={t('pitch_briefs.wizard.url_placeholder')}
                        className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
                          <input
                            type="checkbox"
                            checked={urlCrawlMode}
                            onChange={(e) => setUrlCrawlMode(e.target.checked)}
                            className="rounded border-border"
                          />
                          <Globe className="w-4 h-4 text-muted-foreground" />
                          Crawl entire website
                        </label>
                        <span className="text-xs text-muted-foreground">
                          {urlCrawlMode ? '1 credit per 5 pages' : 'Free'}
                        </span>
                      </div>
                      {urlCrawlMode && (
                        <div className="flex gap-4 pl-6">
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            Max pages
                            <input
                              type="number"
                              min={1}
                              max={100}
                              value={crawlMaxPages}
                              onChange={(e) => setCrawlMaxPages(Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-background border border-border rounded text-foreground text-sm"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-sm text-muted-foreground">
                            Max depth
                            <input
                              type="number"
                              min={1}
                              max={5}
                              value={crawlMaxDepth}
                              onChange={(e) => setCrawlMaxDepth(Number(e.target.value))}
                              className="w-20 px-2 py-1 bg-background border border-border rounded text-foreground text-sm"
                            />
                          </label>
                        </div>
                      )}
                      <button
                        onClick={addUrl}
                        disabled={!urlInput.trim() || !urlTitle.trim()}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {urlCrawlMode ? 'Add website crawl' : t('pitch_briefs.wizard.add_url_button')}
                      </button>
                    </div>
                  </div>

                  {totalDocuments > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-foreground mb-3">
                        {t('pitch_briefs.wizard.added_documents', { count: totalDocuments })}
                      </h3>
                      <div className="space-y-2">
                        {pendingFiles.map((file, index) => (
                          <div
                            key={`file-${index}`}
                            className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">{file.name}</span>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {pendingTexts.map((text, index) => (
                          <div
                            key={`text-${index}`}
                            className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm text-foreground">{text.title}</span>
                            </div>
                            <button
                              onClick={() => removeText(index)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        {pendingUrls.map((url, index) => (
                          <div
                            key={`url-${index}`}
                            className="flex items-center justify-between p-3 bg-background border border-border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              {url.crawl ? <Globe className="w-4 h-4 text-muted-foreground" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
                              <span className="text-sm text-foreground">{url.title}</span>
                              {url.crawl && (
                                <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#FFF0E6', color: '#E88D67' }}>
                                  Crawl
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => removeUrl(index)}
                              className="text-muted-foreground hover:text-foreground transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Footer buttons */}
              <div className="flex justify-between gap-3 pt-4">
                {!isUploaded && !uploadProgress && (
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-2 px-6 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    {t('common.back')}
                  </button>
                )}
                {(isUploaded || uploadProgress) && <div />}
                <div className="flex gap-3">
                  {!isUploaded && !uploadProgress && (
                    <button
                      onClick={handleSkip}
                      disabled={isSubmitting}
                      className="px-6 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                    >
                      {t('common.skip')}
                    </button>
                  )}
                  {!uploadProgress && (
                    <button
                      onClick={isProcessing ? undefined : handleNext}
                      disabled={isSubmitting || !!isProcessing}
                      className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          {t('common.next')}
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-semibold text-foreground mb-2">
                  {t('pitch_briefs.wizard.success_title')}
                </h2>
                <p className="text-muted-foreground">
                  {t('pitch_briefs.wizard.success_desc')}
                </p>
              </div>

              <div className="bg-background border border-border rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('pitch_briefs.wizard.review_name')}</h3>
                  <p className="text-foreground">{name}</p>
                </div>
                {description && (
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('pitch_briefs.wizard.review_description')}</h3>
                    <p className="text-foreground">{description}</p>
                  </div>
                )}
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">{t('pitch_briefs.wizard.review_documents')}</h3>
                  <p className="text-foreground">
                    {totalDocuments} {totalDocuments === 1 ? t('common.document') : t('common.documents')} added
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-4">
                <button
                  onClick={handleCreateAnother}
                  className="px-6 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  {t('pitch_briefs.wizard.create_another')}
                </button>
                <button
                  onClick={() => navigate(`/pitch-briefs/${briefId}`)}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  {t('pitch_briefs.wizard.go_to_brief')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PitchBriefWizardPage;
