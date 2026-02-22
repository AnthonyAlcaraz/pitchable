import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { EditableText } from './EditableText';
import { api } from '@/lib/api';
import { usePresentationStore } from '@/stores/presentation.store';
import type { SlideData, ThemeData } from '@/stores/presentation.store';
import { themeToStyleVars } from './SlideRenderer';
import { FigmaFramePicker } from '@/components/figma/FigmaFramePicker';
import { FigmaSyncBadge } from '@/components/figma/FigmaSyncBadge';
import { Figma, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

interface EditableSlideProps {
  slide: SlideData;
  presentationId: string;
  theme?: ThemeData | null;
  className?: string;
  lensId?: string;
}

const SLIDE_ASPECT_RATIO = 16 / 9;

export function EditableSlide({ slide, presentationId, theme, className, lensId }: EditableSlideProps) {
  const updateSlide = usePresentationStore((s) => s.updateSlide);
  const [showFramePicker, setShowFramePicker] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const isTitle = slide.slideType === 'TITLE';
  const isCTA = slide.slideType === 'CTA';
  const isQuote = slide.slideType === 'QUOTE';

  const handleSaveField = useCallback(
    async (field: 'title' | 'body' | 'speakerNotes', newValue: string) => {
      // Optimistic update
      updateSlide(slide.id, { [field]: newValue });

      // Persist to API
      try {
        await api.patch(`/presentations/${presentationId}/slides/${slide.id}`, {
          [field]: newValue,
        });
      } catch (err) {
        // Revert on error
        updateSlide(slide.id, { [field]: slide[field] });
        console.error('Failed to save slide update:', err);
      }
    },
    [slide, updateSlide],
  );

  const handleAssignFigmaFrame = useCallback(
    async (frame: { fileKey: string; nodeId: string; nodeName: string }) => {
      setIsSyncing(true);
      try {
        const lensParam = lensId ? `?lensId=${lensId}` : '';
        await api.post(`/figma/slides/${slide.id}/assign${lensParam}`, {
          fileKey: frame.fileKey,
          nodeId: frame.nodeId,
        });
        // The WebSocket event will update the slide with the new imageUrl
        updateSlide(slide.id, {
          imageSource: 'FIGMA',
          figmaFileKey: frame.fileKey,
          figmaNodeId: frame.nodeId,
          figmaNodeName: frame.nodeName,
        });
      } catch (err) {
        console.error('Failed to assign Figma frame:', err);
      } finally {
        setIsSyncing(false);
      }
    },
    [slide.id, lensId, updateSlide],
  );

  const handleRefreshFigma = useCallback(async () => {
    if (!slide.figmaFileKey || !slide.figmaNodeId) return;
    setIsSyncing(true);
    try {
      const lensParam = lensId ? `?lensId=${lensId}` : '';
      await api.post(`/figma/slides/${slide.id}/refresh${lensParam}`);
    } catch (err) {
      console.error('Failed to refresh Figma image:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [slide.id, slide.figmaFileKey, slide.figmaNodeId, lensId]);


  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        className,
      )}
      style={{ aspectRatio: `${SLIDE_ASPECT_RATIO}`, ...themeToStyleVars(theme) }}
    >
      <div className={cn('flex h-full flex-col p-[6%]', (isTitle || isCTA) && 'items-center justify-center')}>
        {/* Slide type badge */}
        <div className="mb-2 flex items-center gap-2">
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.5em] font-medium text-primary">
            {slide.slideType.replace('_', ' ')}
          </span>
          <span className="text-[0.45em] text-muted-foreground">
            Slide {slide.slideNumber}
          </span>
        </div>

        {/* Editable title */}
        <EditableText
          value={slide.title}
          onSave={(v) => handleSaveField('title', v)}
          className={cn(
            'font-heading font-bold leading-tight text-foreground',
            isTitle ? 'mb-auto text-[1.8em]' : 'mb-3 text-[1.2em]',
            (isTitle || isCTA) && 'text-center',
            isQuote && 'italic',
          )}
          placeholder="Slide title..."
        />

        {/* Editable body */}
        {!isTitle && (
          <EditableText
            value={slide.body}
            onSave={(v) => handleSaveField('body', v)}
            className={cn(
              'flex-1 text-[0.75em] leading-relaxed text-foreground/80',
              isCTA && 'text-center',
              isQuote && 'italic',
            )}
            placeholder="Slide content..."
            multiline
          />
        )}

        {/* Title slide subtitle (editable body) */}
        {isTitle && (
          <EditableText
            value={slide.body}
            onSave={(v) => handleSaveField('body', v)}
            className="text-center text-[0.9em] text-muted-foreground"
            placeholder="Subtitle..."
          />
        )}
      </div>

      {/* Image source toolbar */}
      <div className="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 [div:hover>&]:opacity-100">
        {slide.imageSource === 'FIGMA' && slide.figmaNodeName && (
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[0.45em] text-white">
            <Figma className="mr-0.5 inline h-2.5 w-2.5" />
            {slide.figmaNodeName}
          </span>
        )}
        <button
          onClick={() => setShowFramePicker(true)}
          disabled={isSyncing}
          className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
          title="Assign Figma frame"
        >
          {isSyncing ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Figma className="h-3 w-3" />
          )}
        </button>
        {slide.imageSource === 'FIGMA' && slide.figmaNodeId && (
          <>
            <button
              onClick={handleRefreshFigma}
              disabled={isSyncing}
              className="rounded bg-black/60 p-1 text-white hover:bg-black/80"
              title="Refresh from Figma"
            >
              <RefreshCw className={cn('h-3 w-3', isSyncing && 'animate-spin')} />
            </button>
            <FigmaSyncBadge
              figmaLastSyncAt={slide.figmaLastSyncAt}
              figmaSyncVersion={slide.figmaSyncVersion}
              imageSource={slide.imageSource}
              figmaNodeId={slide.figmaNodeId}
            />
          </>
        )}
        {slide.imageSource !== 'FIGMA' && slide.imageUrl && (
          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[0.45em] text-white">
            <Sparkles className="mr-0.5 inline h-2.5 w-2.5" />
            AI
          </span>
        )}
      </div>

      {/* Background image overlay */}
      {slide.imageUrl && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${slide.imageUrl})` }}
        />
      )}

      {/* Figma Frame Picker */}
      <FigmaFramePicker
        open={showFramePicker}
        onClose={() => setShowFramePicker(false)}
        onSelect={handleAssignFigmaFrame}
        lensId={lensId}
      />
    </div>
  );
}
