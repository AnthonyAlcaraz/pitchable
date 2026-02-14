import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { EditableText } from './EditableText';
import { api } from '@/lib/api';
import { usePresentationStore } from '@/stores/presentation.store';
import type { SlideData } from '@/stores/presentation.store';

interface EditableSlideProps {
  slide: SlideData;
  presentationId: string;
  className?: string;
}

const SLIDE_ASPECT_RATIO = 16 / 9;

export function EditableSlide({ slide, presentationId, className }: EditableSlideProps) {
  const updateSlide = usePresentationStore((s) => s.updateSlide);

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

  // Parse bullet points from body
  const bodyLines = slide.body.split('\n').filter((l) => l.trim().length > 0);
  const hasBullets = bodyLines.some(
    (l) => l.trim().startsWith('-') || l.trim().startsWith('•'),
  );

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-border bg-card shadow-sm',
        className,
      )}
      style={{ aspectRatio: `${SLIDE_ASPECT_RATIO}` }}
    >
      <div className="flex h-full flex-col p-[6%]">
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
            isCTA && 'text-center',
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
            className="text-[0.9em] text-muted-foreground"
            placeholder="Subtitle..."
          />
        )}
      </div>

      {/* Speaker notes indicator */}
      {slide.speakerNotes && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-border bg-muted/50 px-3 py-1.5">
          <EditableText
            value={slide.speakerNotes}
            onSave={(v) => handleSaveField('speakerNotes', v)}
            className="text-[0.5em] text-muted-foreground"
            placeholder="Speaker notes..."
            multiline
          />
        </div>
      )}

      {/* Background image overlay */}
      {slide.imageUrl && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-15"
          style={{ backgroundImage: `url(${slide.imageUrl})` }}
        />
      )}
    </div>
  );
}
