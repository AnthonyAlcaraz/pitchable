import { useEffect, useRef, useState, useCallback } from 'react';
import { CheckCircle2, Download, Presentation, Loader2, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api.js';
import { usePresentationStore } from '../../stores/presentation.store.js';
import type { SlideData } from '../../stores/presentation.store.js';
import { SlideRenderer, themeToStyleVars } from '../preview/SlideRenderer.js';
import { cn } from '../../lib/utils.js';

export interface GenerationCompleteData {
  presentationId: string;
  deckTitle: string;
  slideCount: number;
  themeName: string;
  imageCount: number;
  isSamplePreview?: boolean;
}

interface GenerationCompleteCardProps {
  data: GenerationCompleteData;
  onExport: (presentationId: string, format: string) => void;
  onSlideClick?: (slideIndex: number) => void;
}

const EMPTY_SLIDES: SlideData[] = [];

export function GenerationCompleteCard({ data, onExport, onSlideClick }: GenerationCompleteCardProps) {
  const slides = usePresentationStore((s) => s.presentation?.slides ?? EMPTY_SLIDES);
  const theme = usePresentationStore((s) => s.presentation?.theme ?? null);
  const currentSlideIndex = usePresentationStore((s) => s.currentSlideIndex);
  const cardRef = useRef<HTMLDivElement>(null);
  const [autoExportUrl, setAutoExportUrl] = useState<string | null>(null);
  const [autoExportStatus, setAutoExportStatus] = useState<'idle' | 'exporting' | 'ready' | 'failed'>('idle');
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  // Auto-scroll into view when card mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Scroll the active slide card into view when sidebar selection changes
  const activeCardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentSlideIndex]);

  // Auto-export PDF on mount
  useEffect(() => {
    if (autoExportStatus !== 'idle') return;
    setAutoExportStatus('exporting');
    let cancelled = false;
    (async () => {
      try {
        const { jobId } = await api.post<{ jobId: string }>(`/presentations/${data.presentationId}/export`, { format: 'PDF' });
        for (let i = 0; i < 90; i++) {
          if (cancelled) return;
          const job = await api.get<{ status: string }>(`/exports/${jobId}`);
          if (job.status === 'COMPLETED') break;
          if (job.status === 'FAILED') throw new Error('Export failed');
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (!cancelled) {
          setAutoExportUrl(`/exports/${jobId}/download`);
          setAutoExportStatus('ready');
        }
      } catch {
        if (!cancelled) setAutoExportStatus('failed');
      }
    })();
    return () => { cancelled = true; };
  }, [data.presentationId, autoExportStatus]);

  const handleExportClick = useCallback((format: string) => {
    setExportingFormat(format);
    onExport(data.presentationId, format);
    setTimeout(() => setExportingFormat(null), 3000);
  }, [data.presentationId, onExport]);

  return (
    <div ref={cardRef} className="mx-4 my-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-green-400" />
        <span className="text-sm font-semibold text-green-400">Deck Generated</span>
      </div>

      <h4 className="mb-2 text-sm font-bold text-foreground">{data.deckTitle}</h4>

      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{data.slideCount} slides</span>
        <span className="text-border">|</span>
        <span>{data.themeName}</span>
        {data.imageCount > 0 && (
          <>
            <span className="text-border">|</span>
            <span>{data.imageCount} images queued</span>
          </>
        )}
      </div>

      {data.isSamplePreview && (
        <p className="mb-3 text-xs text-yellow-400">
          Sample preview. Upgrade to unlock the full deck.
        </p>
      )}

      {autoExportStatus === 'exporting' && (
        <div className="mb-3 flex items-center gap-2 rounded-md bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Preparing your PDF export...
        </div>
      )}
      {autoExportStatus === 'ready' && autoExportUrl && (
        <a
          href={autoExportUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex items-center gap-2 rounded-md bg-green-500/10 px-3 py-2 text-xs font-medium text-green-400 hover:bg-green-500/20 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Your PDF is ready — click to open
        </a>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={exportingFormat === 'pptx'}
          onClick={() => handleExportClick('pptx')}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {exportingFormat === 'pptx' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
          Download PPTX
        </button>
        <button
          type="button"
          disabled={exportingFormat === 'pdf'}
          onClick={() => handleExportClick('pdf')}
          className="flex items-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
        >
          {exportingFormat === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Presentation className="h-3.5 w-3.5" />}
          Download PDF
        </button>
      </div>

      {/* Slide preview grid — shows generated slides inline in chat */}
      {slides.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            Slide Previews
          </p>
          <div className="space-y-2">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                ref={idx === currentSlideIndex ? activeCardRef : undefined}
                onClick={() => onSlideClick?.(idx)}
                className={cn(
                  'cursor-pointer rounded-lg border overflow-hidden transition-all',
                  idx === currentSlideIndex
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-border/50 hover:border-primary/50',
                )}
              >
                {/* Exported rendered image (the "generated" version) */}
                {slide.previewUrl && (
                  <div>
                    <p className="px-2 pt-1.5 text-[9px] font-medium text-green-400/80 uppercase tracking-wide">
                      Final
                    </p>
                    <div style={{ aspectRatio: '16/9' }}>
                      <img
                        src={`/slides/${slide.id}/preview?t=${slide.updatedAt ?? ''}`}
                        alt={`Slide ${slide.slideNumber} rendered`}
                        className="h-full w-full object-contain bg-black"
                      />
                    </div>
                  </div>
                )}

                {/* Editable content view (the "editable" version) */}
                <div>
                  {slide.previewUrl && (
                    <p className="px-2 pt-1.5 text-[9px] font-medium text-orange-400/80 uppercase tracking-wide">
                      Editable
                    </p>
                  )}
                  <div style={themeToStyleVars(theme)}>
                    <SlideRenderer slide={slide} theme={theme} scale={0.4} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
