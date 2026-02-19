import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Download, ChevronDown } from 'lucide-react';
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

const EXPORT_FORMATS = [
  { key: 'pdf', label: 'PDF' },
  { key: 'pptx', label: 'PowerPoint' },
  { key: 'pdf-figma', label: 'PDF (Figma Design)' },
  { key: 'pptx-figma', label: 'PPTX (Figma Design)' },
  { key: 'html', label: 'Reveal.js (HTML)' },
  { key: 'figma', label: 'Figma Plugin JSON' },
] as const;

export function SlideHeader({
  title,
  currentSlide,
  totalSlides,
  onPrevious,
  onNext,
  onFullscreen,
  onExport,
}: SlideHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showMenu]);

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
              onClick={() => setShowMenu((v) => !v)}
              className="flex items-center gap-0.5 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="Export presentation"
            >
              <Download className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-md border border-border bg-popover py-1 shadow-md">
                {EXPORT_FORMATS.map((fmt) => (
                  <button
                    key={fmt.key}
                    onClick={() => {
                      onExport(fmt.key);
                      setShowMenu(false);
                    }}
                    className="flex w-full items-center px-3 py-1.5 text-left text-sm text-popover-foreground transition-colors hover:bg-accent"
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SlideHeader;
