import { useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { SlideRenderer } from './SlideRenderer';
import type { SlideData, ThemeData } from '@/stores/presentation.store';

interface PresentationModeProps {
  slides: SlideData[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onExit: () => void;
  theme?: ThemeData | null;
}

export function PresentationMode({
  slides,
  currentIndex,
  onNavigate,
  onExit,
  theme,
}: PresentationModeProps) {
  const currentSlide = slides[currentIndex];

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          if (currentIndex < slides.length - 1) {
            onNavigate(currentIndex + 1);
          }
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            onNavigate(currentIndex - 1);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onExit();
          break;
        case 'Home':
          e.preventDefault();
          onNavigate(0);
          break;
        case 'End':
          e.preventDefault();
          onNavigate(slides.length - 1);
          break;
      }
    },
    [currentIndex, slides.length, onNavigate, onExit],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    // Request fullscreen
    document.documentElement.requestFullscreen?.().catch(() => {
      // Fullscreen might be blocked by browser
    });

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    };
  }, [handleKeyDown]);

  if (!currentSlide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Close button */}
      <button
        onClick={onExit}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Slide counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/70">
        {currentIndex + 1} / {slides.length}
      </div>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={() => onNavigate(currentIndex - 1)}
          className="absolute left-4 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
      {currentIndex < slides.length - 1 && (
        <button
          onClick={() => onNavigate(currentIndex + 1)}
          className="absolute right-4 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      )}

      {/* Main slide */}
      <div className="w-full max-w-5xl px-8">
        <SlideRenderer slide={currentSlide} theme={theme} scale={2} />
      </div>
    </div>
  );
}
