import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot } from 'lucide-react';
import { ValidationPrompt } from './ValidationPrompt';
import { SlidePreviewCard } from './SlidePreviewCard';
import { InlineSlideCard } from './InlineSlideCard.js';
import { GenerationCompleteCard } from './GenerationCompleteCard.js';
import type { PendingValidation, InlineSlideCard as InlineSlideCardType, GenerationCompleteData } from '@/stores/chat.store';
import { usePresentationStore } from '../../stores/presentation.store.js';
import { themeToStyleVars } from '../preview/SlideRenderer.js';

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType?: string;
  metadata?: Record<string, unknown>;
  isStreaming?: boolean;
  pendingValidations?: PendingValidation[];
  presentationId?: string;
  onAcceptSlide?: (slideId: string) => void;
  onEditSlide?: (slideId: string, edits: { title?: string; body?: string; speakerNotes?: string }) => void;
  onRejectSlide?: (slideId: string) => void;
  onExport?: (presentationId: string, format: string) => void;
  onSlideClick?: (slideIndex: number) => void;
}

export function ChatMessage({
  role,
  content,
  messageType,
  metadata,
  isStreaming,
  pendingValidations,
  presentationId: _presentationId,
  onAcceptSlide,
  onEditSlide,
  onRejectSlide,
  onExport,
  onSlideClick,
}: ChatMessageProps) {
  const isUser = role === 'user';
  const theme = usePresentationStore((s) => s.presentation?.theme ?? null);

  // Extract typed metadata to avoid `unknown` leaking into JSX (React 19 strict)
  const outlineSlides = messageType === 'outline' && Array.isArray(metadata?.slides)
    ? (metadata.slides as Array<{ slideNumber: number; title: string; bulletPoints: string[]; slideType: string }>)
    : [];
  const slideCards = Array.isArray(metadata?.slideCards)
    ? (metadata.slideCards as InlineSlideCardType[])
    : [];
  const genComplete = metadata?.generationComplete
    ? (metadata.generationComplete as GenerationCompleteData)
    : null;

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-card' : 'bg-background'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-orange-500/10 text-orange-400' : 'bg-purple-500/10 text-purple-400'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {isUser ? 'You' : 'Pitchable'}
        </p>
        <div className="prose prose-sm prose-invert max-w-none text-foreground">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block h-4 w-1.5 animate-pulse bg-purple-500" />
          )}
        </div>

        {/* Render slide preview cards for outline messages */}
        {outlineSlides.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {outlineSlides.slice(0, 4).map((slide) => (
              <SlidePreviewCard
                key={slide.slideNumber}
                slideNumber={slide.slideNumber}
                title={slide.title}
                body={slide.bulletPoints?.map((b: string) => `- ${b}`).join('\n') ?? ''}
                slideType={slide.slideType}
              />
            ))}
          </div>
        )}

        {/* Render validation prompts for pending slides */}
        {(pendingValidations?.length ?? 0) > 0 && onAcceptSlide && onEditSlide && onRejectSlide ? (
          <div className="mt-3 space-y-2">
            {pendingValidations!.map((v) => (
              <ValidationPrompt
                key={v.slideId}
                slide={v}
                onAccept={onAcceptSlide}
                onEdit={onEditSlide}
                onReject={onRejectSlide}
              />
            ))}
          </div>
        ) : null}

        {/* Render persisted inline slide cards from message metadata */}
        {slideCards.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-thin" style={themeToStyleVars(theme)}>
            {slideCards.map((slide) => (
              <InlineSlideCard
                key={slide.id}
                slide={slide}
                theme={theme}
                onClick={onSlideClick ? () => onSlideClick(slide.slideNumber - 1) : undefined}
              />
            ))}
          </div>
        )}

        {/* Render persisted generation complete card */}
        {genComplete && onExport ? (
          <GenerationCompleteCard
            data={genComplete}
            onExport={onExport}
          />
        ) : null}
      </div>
    </div>
  );
}
