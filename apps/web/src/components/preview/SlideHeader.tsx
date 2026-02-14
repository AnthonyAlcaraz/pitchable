import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SlideHeaderProps {
  title: string;
  currentSlide: number;
  totalSlides: number;
  onPrevious: () => void;
  onNext: () => void;
  onFullscreen: () => void;
  onExport?: (format: string) => void;
}

export function SlideHeader({
  title,
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  onFullscreen,
  onExport,
}: SlideHeaderProps) {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex h-10 items-center justify-between border-b border-border px-3">
      <span className="truncate text-sm font-medium text-foreground">{title}</span>

      <div className="flex items-center gap-1">
        <button
          onClick={onPrevious}
          disabled={currentSlide <= 1}
          className={cn(
            'rounded p-1 transition-colors',
            currentSlide <= 1
              ? 'text-muted-foreground/30'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <span className="min-w-[3rem] text-center text-xs text-muted-foreground">
          {totalSlides > 0 ? `${currentSlide} / ${totalSlides}` : '0 / 0'}
        </span>

        <button
          onClick={onNext}
          disabled={currentSlide >= totalSlides}
          className={cn(
            'rounded p-1 transition-colors',
            currentSlide >= totalSlides
              ? 'text-muted-foreground/30'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-border" />

        <button
          onClick={onFullscreen}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          title="Presentation mode"
        >
          <Maximize2 className="h-4 w-4" />
        </button>

        {onExport && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Export presentation"
            >
              <Download className="h-4 w-4" />
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-popover py-1 shadow-md">
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => { onExport('pptx'); setShowExportMenu(false); }}
                >
                  PowerPoint (.pptx)
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => { onExport('pdf'); setShowExportMenu(false); }}
                >
                  PDF (.pdf)
                </button>
                <button
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-accent"
                  onClick={() => { onExport('html'); setShowExportMenu(false); }}
                >
                  Reveal.js (.html)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SlideHeader;
