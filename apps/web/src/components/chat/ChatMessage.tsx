import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User } from 'lucide-react';
import { PeachLogo } from '../icons/PeachLogo.js';
import { SlidePreviewCard } from './SlidePreviewCard';
import { GenerationCompleteCard } from './GenerationCompleteCard.js';
import type { GenerationCompleteData } from '@/stores/chat.store';

/** Turn raw filenames like "Feb-16-03-17-PM-7152bfe0.pdf" into readable names */
function humanizeSourceName(name: string): string {
  // Strip common ID suffixes (UUID-like hex segments)
  let clean = name.replace(/[-_][a-f0-9]{4,}[-_]?[a-f0-9]*/gi, '');
  // Remove file extension
  clean = clean.replace(/\.\w{2,4}$/, '');
  // Replace separators with spaces
  clean = clean.replace(/[-_]+/g, ' ').trim();
  // Capitalize first letter
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

interface ChatMessageProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  messageType?: string;
  metadata?: Record<string, unknown>;
  isStreaming?: boolean;
  presentationId?: string;
  onExport?: (presentationId: string, format: string) => void;
}

export function ChatMessage({
  role,
  content,
  messageType,
  metadata,
  isStreaming,
  presentationId: _presentationId,
  onExport,
}: ChatMessageProps) {
  const isUser = role === 'user';

  // Extract typed metadata to avoid `unknown` leaking into JSX (React 19 strict)
  const outlineSlides = messageType === 'outline' && Array.isArray(metadata?.slides)
    ? (metadata.slides as Array<{ slideNumber: number; title: string; bulletPoints: string[]; slideType: string; sources?: string[] }>)
    : [];
  const outlineSources = messageType === 'outline' && Array.isArray(metadata?.sources)
    ? (metadata.sources as Array<{ documentTitle: string; documentId: string }>)
    : [];
  const genComplete = metadata?.generationComplete
    ? (metadata.generationComplete as GenerationCompleteData)
    : null;

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-card' : 'bg-background'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-orange-500/10 text-orange-400' : 'bg-orange-500/10'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <PeachLogo className="h-5 w-5 animate-[spin_5s_linear_infinite]" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-muted-foreground">
          {isUser ? 'You' : 'Pitchable'}
        </p>
        {/* For outline messages, show slide cards grid instead of raw markdown */}
        {outlineSlides.length > 0 ? (
          <>
            <p className="mb-3 text-sm text-foreground/80">
              Here&apos;s your outline with {outlineSlides.length} slides:
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {outlineSlides.map((slide) => (
                <SlidePreviewCard
                  key={slide.slideNumber}
                  slideNumber={slide.slideNumber}
                  title={slide.title}
                  body={slide.bulletPoints?.map((b: string) => `- ${b}`).join('\n') ?? ''}
                  slideType={slide.slideType}
                  sources={slide.sources}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none text-foreground">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {content}
            </ReactMarkdown>
            {isStreaming && (
              <span className="inline-block h-4 w-1.5 animate-pulse bg-orange-500" />
            )}
          </div>
        )}

        {/* Deck-level KB sources summary (deduplicated) */}
        {outlineSources.length > 0 && (() => {
          const seen = new Set<string>();
          const unique = outlineSources.filter((s) => {
            const key = s.documentId;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return (
            <div className="mt-2 rounded-md bg-muted/30 px-3 py-2 border-l-2 border-orange-500/30">
              <p className="text-[10px] font-medium text-muted-foreground mb-1">Knowledge Base Sources ({unique.length})</p>
              {unique.map((s) => (
                <p key={s.documentId} className="text-[9px] text-muted-foreground/70">{humanizeSourceName(s.documentTitle)}</p>
              ))}
            </div>
          );
        })()}



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
