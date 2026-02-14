import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { User, Bot } from 'lucide-react';
import { ValidationPrompt } from './ValidationPrompt';
import { SlidePreviewCard } from './SlidePreviewCard';
import type { PendingValidation } from '@/stores/chat.store';

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
}

export function ChatMessage({
  role,
  content,
  messageType,
  metadata,
  isStreaming,
  pendingValidations,
  presentationId,
  onAcceptSlide,
  onEditSlide,
  onRejectSlide,
}: ChatMessageProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 p-4 ${isUser ? 'bg-white' : 'bg-gray-50'}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
        }`}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="mb-1 text-xs font-medium text-gray-500">
          {isUser ? 'You' : 'Pitchable'}
        </p>
        <div className="prose prose-sm max-w-none text-gray-800">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block h-4 w-1.5 animate-pulse bg-purple-500" />
          )}
        </div>

        {/* Render slide preview cards for outline messages */}
        {messageType === 'outline' && metadata?.slides && (
          <div className="mt-3 flex flex-wrap gap-2">
            {(metadata.slides as Array<{ slideNumber: number; title: string; bulletPoints: string[]; slideType: string }>).slice(0, 4).map((slide) => (
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
        {pendingValidations && pendingValidations.length > 0 && onAcceptSlide && onEditSlide && onRejectSlide && (
          <div className="mt-3 space-y-2">
            {pendingValidations.map((v) => (
              <ValidationPrompt
                key={v.slideId}
                slide={v}
                onAccept={onAcceptSlide}
                onEdit={onEditSlide}
                onReject={onRejectSlide}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
