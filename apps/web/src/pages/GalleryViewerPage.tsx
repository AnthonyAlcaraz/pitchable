import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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
} from 'lucide-react';

const TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  VC_PITCH: 'VC Pitch',
  TECHNICAL: 'Technical',
  EXECUTIVE: 'Executive',
};

interface PublicSlide {
  id: string;
  slideNumber: number;
  title: string;
  body: string;
  slideType: string;
  imageUrl: string | null;
}

interface PublicPresentation {
  id: string;
  title: string;
  description: string | null;
  presentationType: string;
  authorName: string;
  theme: { displayName: string; primaryColor: string };
  pitchLens: { name: string; audienceType: string; pitchGoal: string } | null;
  slides: PublicSlide[];
}

export function GalleryViewerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => !!s.user);
  const [presentation, setPresentation] = useState<PublicPresentation | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isForking, setIsForking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    fetch(`/gallery/presentations/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.json();
      })
      .then(setPresentation)
      .catch(() => setError('Presentation not found'))
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
      setError('Failed to fork presentation');
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
      <div className="min-h-screen bg-slate-50">
        <GalleryNav />
        <div className="flex justify-center py-32">
          <div className="h-10 w-10 animate-spin rounded-full border-3 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !presentation) {
    return (
      <div className="min-h-screen bg-slate-50">
        <GalleryNav />
        <div className="flex flex-col items-center justify-center py-32">
          <Layers className="mb-4 h-12 w-12 text-slate-300" />
          <p className="mb-4 text-lg text-slate-500">{error ?? 'Presentation not found'}</p>
          <Link to="/gallery" className="text-sm font-medium text-blue-600 hover:text-blue-700">
            Back to Gallery
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
        createdAt: '',
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <GalleryNav />

      <div className="mx-auto max-w-5xl px-6 py-8">
        {/* Back link */}
        <Link
          to="/gallery"
          className="mb-6 inline-flex items-center gap-1 text-sm text-slate-500 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Gallery
        </Link>

        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="mb-2 text-2xl font-bold text-slate-900">{presentation.title}</h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
              <span>by {presentation.authorName}</span>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-600">
                {TYPE_LABELS[presentation.presentationType] ?? presentation.presentationType}
              </span>
              <span>{presentation.slides.length} slides</span>
              {presentation.pitchLens && (
                <span className="flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-600">
                  <Focus className="h-3 w-3" />
                  {presentation.pitchLens.name}
                </span>
              )}
            </div>
            {presentation.description && (
              <p className="mt-3 max-w-2xl text-sm text-slate-500">{presentation.description}</p>
            )}
          </div>

          <button
            onClick={handleUseTemplate}
            disabled={isForking}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md shadow-blue-600/20 transition-all hover:bg-blue-500 disabled:opacity-60"
          >
            {isForking ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <GitFork className="h-4 w-4" />
            )}
            Use this template
          </button>
        </div>

        {/* Main slide viewer */}
        {slideData && (
          <div className="relative">
            <SlideRenderer slide={slideData} scale={1} className="w-full" />

            {/* Navigation arrows */}
            {presentation.slides.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  disabled={currentSlide === 0}
                  className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:bg-white disabled:opacity-30"
                >
                  <ChevronLeft className="h-5 w-5 text-slate-700" />
                </button>
                <button
                  onClick={handleNext}
                  disabled={currentSlide === presentation.slides.length - 1}
                  className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow-md transition-all hover:bg-white disabled:opacity-30"
                >
                  <ChevronRight className="h-5 w-5 text-slate-700" />
                </button>
              </>
            )}
          </div>
        )}

        {/* Slide counter */}
        <div className="mt-4 text-center text-sm text-slate-500">
          Slide {currentSlide + 1} of {presentation.slides.length}
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
                createdAt: '',
              };
              return (
                <div
                  key={s.id}
                  className={`w-48 flex-shrink-0 cursor-pointer rounded-lg transition-all ${
                    i === currentSlide
                      ? 'ring-2 ring-blue-500 ring-offset-2'
                      : 'opacity-60 hover:opacity-100'
                  }`}
                  onClick={() => setCurrentSlide(i)}
                >
                  <SlideRenderer slide={thumbData} scale={0.35} />
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
