import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { GalleryNav } from '@/components/gallery/GalleryNav';
import { SlideRenderer } from '@/components/preview/SlideRenderer';
import { useAuthStore } from '@/stores/auth.store';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  GitFork,
  Layers,
  Focus,
  Eye,
} from 'lucide-react';

interface PublicSlide {
  id: string;
  slideNumber: number;
  title: string;
  body: string;
  slideType: string;
  imageUrl: string | null;
}

interface PublicTheme {
  id: string;
  name: string;
  displayName: string;
  primaryColor: string;
  colorPalette: Record<string, string>;
  headingFont: string;
  bodyFont: string;
}

interface PublicPresentation {
  id: string;
  title: string;
  description: string | null;
  presentationType: string;
  authorName: string;
  theme: PublicTheme;
  pitchLens: { name: string; audienceType: string; pitchGoal: string } | null;
  slides: PublicSlide[];
  viewCount?: number;
  forkCount?: number;
}

export function GalleryViewerPage() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [presentation, setPresentation] = useState<PublicPresentation | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isForking, setIsForking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const TYPE_LABELS: Record<string, string> = {
    STANDARD: t('gallery.type_options.STANDARD'),
    VC_PITCH: t('gallery.type_options.VC_PITCH'),
    TECHNICAL: t('gallery.type_options.TECHNICAL'),
    EXECUTIVE: t('gallery.type_options.EXECUTIVE'),
  };

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/gallery/presentations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then((data) => {
        setPresentation(data);
        // Fire-and-forget view tracking
        fetch(`/analytics/view/${id}`, { method: 'POST' }).catch(() => {});
      })
      .catch(() => setError(t('gallery.viewer.not_found')))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleUseTemplate = async () => {
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/gallery/${id}`);
      return;
    }

    setIsForking(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`/gallery/presentations/${id}/fork`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (data.id) navigate(`/workspace/${data.id}`);
    } catch {
      setError(t('gallery.viewer.failed_fork'));
    } finally {
      setIsForking(false);
    }
  };

  const handlePrev = () => setCurrentSlide((c) => Math.max(0, c - 1));
  const handleNext = () =>
    setCurrentSlide((c) => Math.min((presentation?.slides.length ?? 1) - 1, c + 1));

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <GalleryNav />
        <div className="flex justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-orange-500 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen bg-background">
        <GalleryNav />
        <div className="flex flex-col items-center justify-center py-32">
          <Layers className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="mb-4 text-lg text-muted-foreground">{error ?? t('gallery.viewer.not_found')}</p>
          <Link to="/gallery" className="text-sm font-medium text-orange-400 hover:text-orange-300">
            {t('gallery.viewer.back_to_gallery')}
          </Link>
        </div>
      </div>
    );
  }

  const slide = presentation.slides[currentSlide];
  // Map to SlideData shape for SlideRenderer
  const slideData = slide
    ? {
        id: slide.id,
        slideNumber: slide.slideNumber,
        title: slide.title,
        body: slide.body,
        speakerNotes: null,
        slideType: slide.slideType,
        imageUrl: slide.imageUrl,
        imagePrompt: null,
        imageSource: 'AI_GENERATED' as const,
        figmaFileKey: null,
        figmaNodeId: null,
        figmaNodeName: null,
        createdAt: '',
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <GalleryNav />

      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Back link */}
        <Link
          to="/gallery"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-orange-400"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('gallery.viewer.back_to_gallery')}
        </Link>

        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="mb-2 text-xl font-bold text-foreground sm:text-2xl">{presentation.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>{t('gallery.viewer.by_author', { name: presentation.authorName })}</span>
              <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-xs font-semibold text-orange-400">
                {TYPE_LABELS[presentation.presentationType] ?? presentation.presentationType}
              </span>
              <span>{t('gallery.viewer.slides_count', { count: presentation.slides.length })}</span>
              {presentation.viewCount !== undefined && presentation.viewCount > 0 && (
                <span className="flex items-center gap-1">
                  <Eye className="h-3 w-3" />
                  {presentation.viewCount}
                </span>
              )}
              {presentation.forkCount !== undefined && presentation.forkCount > 0 && (
                <span className="flex items-center gap-1">
                  <GitFork className="h-3 w-3" />
                  {presentation.forkCount}
                </span>
              )}
              {presentation.pitchLens && (
                <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-400">
                  <Focus className="h-3 w-3" />
                  {presentation.pitchLens.name}
                </span>
              )}
            </div>
            {presentation.description && (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground">{presentation.description}</p>
            )}
          </div>

          <button
            onClick={handleUseTemplate}
            disabled={isForking}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-400 disabled:opacity-60 sm:w-auto"
          >
            {isForking ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <GitFork className="h-4 w-4" />
            )}
            {t('gallery.viewer.use_template')}
          </button>
        </div>

        {/* Main slide viewer */}
        {slideData && (
          <div className="relative">
            <SlideRenderer slide={slideData} theme={presentation.theme} scale={1} className="w-full" />

            {/* Navigation arrows */}
            {presentation.slides.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentSlide === 0}
                  className="absolute left-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 shadow-md transition-all hover:bg-black/80 disabled:opacity-30 sm:left-4"
                >
                  <ChevronLeft className="h-5 w-5 text-white" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentSlide === presentation.slides.length - 1}
                  className="absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 shadow-md transition-all hover:bg-black/80 disabled:opacity-30 sm:right-4"
                >
                  <ChevronRight className="h-5 w-5 text-white" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Slide counter */}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          {t('gallery.viewer.slide_counter', { current: currentSlide + 1, total: presentation.slides.length })}
        </div>

        {/* Thumbnail strip */}
        {presentation.slides.length > 1 && (
          <div className="mt-6 flex gap-3 overflow-x-auto pb-2">
            {presentation.slides.map((s, i) => {
              const thumbData = {
                id: s.id,
                slideNumber: s.slideNumber,
                title: s.title,
                body: s.body,
                speakerNotes: null,
                slideType: s.slideType,
                imageUrl: s.imageUrl,
                imagePrompt: null,
                imageSource: 'AI_GENERATED' as const,
                figmaFileKey: null,
                figmaNodeId: null,
                figmaNodeName: null,
                createdAt: '',
              };
              return (
                <div
                  key={s.id}
                  className={`w-32 flex-shrink-0 cursor-pointer rounded-lg transition-all sm:w-48 ${
                    i === currentSlide
                      ? 'ring-2 ring-orange-500 ring-offset-2 ring-offset-background'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  onClick={() => setCurrentSlide(i)}
                >
                  <SlideRenderer slide={thumbData} theme={presentation.theme} scale={0.35} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default GalleryViewerPage;
