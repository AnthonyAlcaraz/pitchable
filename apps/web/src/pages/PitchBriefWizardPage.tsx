import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { ArrowLeft, ArrowRight, BookOpen, Upload, Check, FileText, X } from 'lucide-react';

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

  const { briefs, createBrief, updateBrief, loadBriefs, uploadDocument, addTextDocument, addUrlDocument } = usePitchBriefStore();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [briefId, setBriefId] = useState<string | null>(id || null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingTexts, setPendingTexts] = useState<Array<{ title: string; content: string }>>([]);
  const [pendingUrls, setPendingUrls] = useState<Array<{ title: string; url: string }>>([]);
  const [textInput, setTextInput] = useState('');
  const [textTitle, setTextTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dragActive, setDragActive] = useState(false);

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

      setIsSubmitting(true);
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
        setStep(3);
      } catch (error) {
        console.error('Failed to upload documents:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [step, name, description, briefId, isEditMode, pendingFiles, pendingTexts, pendingUrls, createBrief, updateBrief, uploadDocument, addTextDocument, addUrlDocument, navigate]);

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
    setPendingUrls((prev) => [...prev, { title: urlTitle, url: urlInput }]);
    setUrlInput('');
    setUrlTitle('');
  }, [urlInput, urlTitle]);

  const handleCreateAnother = useCallback(() => {
    setStep(1);
    setName('');
    setDescription('');
    setBriefId(null);
    setPendingFiles([]);
    setPendingTexts([]);
    setPendingUrls([]);
  }, []);

  const totalDocuments = pendingFiles.length + pendingTexts.length + pendingUrls.length;

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
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-4">{t('pitch_briefs.wizard.add_documents_title')}</h2>
                <p className="text-muted-foreground mb-6">
                  {t('pitch_briefs.wizard.add_documents_desc')}
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
                  <button
                    onClick={addUrl}
                    disabled={!urlInput.trim() || !urlTitle.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('pitch_briefs.wizard.add_url_button')}
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
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">{url.title}</span>
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

              <div className="flex justify-between gap-3 pt-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-6 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  {t('common.back')}
                </button>
                <div className="flex gap-3">
                  <button
                    onClick={handleSkip}
                    disabled={isSubmitting}
                    className="px-6 py-2 bg-background border border-border text-foreground rounded-lg hover:bg-muted transition-colors"
                  >
                    {t('common.skip')}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t('common.next')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
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
