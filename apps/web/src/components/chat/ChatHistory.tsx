import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage.js';
import { AgentActivity } from './AgentActivity.js';
import { InlineSlideCard } from './InlineSlideCard.js';
import { ThemeSelector } from './ThemeSelector.js';
import { LayoutSelector } from './LayoutSelector.js';
import { ImageSelector } from './ImageSelector.js';
import { OutlineReviewFlow } from './OutlineReviewFlow.js';
import { useChatStore } from '../../stores/chat.store.js';
import type { ChatMessage as ChatMessageType, PendingValidation, AgentStep, InlineSlideCard as InlineSlideCardType, PendingThemeSelection, PendingLayoutSelection, PendingImageSelection } from '../../stores/chat.store.js';
import { usePresentationStore } from '../../stores/presentation.store.js';
import { themeToStyleVars } from '../preview/SlideRenderer.js';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  streamingContent: string;
  isStreaming: boolean;
  thinkingText: string | null;
  agentSteps: AgentStep[];
  pendingValidations?: PendingValidation[];
  inlineSlideCards?: InlineSlideCardType[];
  pendingThemeSelection?: PendingThemeSelection | null;
  pendingLayoutSelections?: PendingLayoutSelection[];
  pendingImageSelections?: PendingImageSelection[];
  presentationId?: string;
  onExport?: (presentationId: string, format: string) => void;
  onAcceptSlide?: (slideId: string) => void;
  onEditSlide?: (slideId: string, edits: { title?: string; body?: string; speakerNotes?: string }) => void;
  onRejectSlide?: (slideId: string) => void;
  onRespondToInteraction?: (presentationId: string, interactionType: string, contextId: string, selection: unknown) => void;
  onSendMessage?: (content: string) => void;
}

export function ChatHistory({
  messages,
  streamingContent,
  isStreaming,
  thinkingText,
  agentSteps,
  pendingValidations,
  inlineSlideCards,
  pendingThemeSelection,
  pendingLayoutSelections,
  pendingImageSelections,
  presentationId,
  onExport,
  onAcceptSlide,
  onEditSlide,
  onRejectSlide,
  onRespondToInteraction,
  onSendMessage,
}: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolled = useRef(false);
  const { presentation, setCurrentSlide } = usePresentationStore();
  const theme = presentation?.theme ?? null;

  const outlineReviewState = useChatStore((s) => s.outlineReviewState);
  const approveOutlineStep = useChatStore((s) => s.approveOutlineStep);
  const editOutlineTitle = useChatStore((s) => s.editOutlineTitle);
  const skipToApproveAll = useChatStore((s) => s.skipToApproveAll);

  useEffect(() => {
    if (!userScrolled.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, pendingValidations, inlineSlideCards, thinkingText, agentSteps, outlineReviewState]);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    userScrolled.current = !atBottom;
  };

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
    >
      {messages.length === 0 && !isStreaming && (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <p className="mb-2 text-lg font-medium">Start a conversation</p>
          <p className="text-sm">
            Describe your presentation or type{' '}
            <code className="rounded bg-muted px-1 py-0.5 text-orange-400">
              /help
            </code>{' '}
            for commands
          </p>
        </div>
      )}

      {messages.map((msg, idx) => {
        // Attach pending validations to the last assistant message
        const isLastAssistant =
          msg.role === 'assistant' &&
          idx === messages.length - 1;

        return (
          <ChatMessage
            key={msg.id}
            role={msg.role}
            content={msg.content}
            messageType={msg.messageType}
            metadata={msg.metadata}
            pendingValidations={isLastAssistant ? pendingValidations : undefined}
            presentationId={presentationId}
            onAcceptSlide={onAcceptSlide}
            onEditSlide={onEditSlide}
            onRejectSlide={onRejectSlide}
            onExport={onExport}
            onSlideClick={(index) => setCurrentSlide(index)}
          />
        );
      })}

      {/* Outline step-by-step review flow */}
      {outlineReviewState && (
        <OutlineReviewFlow
          state={outlineReviewState}
          onApproveStep={approveOutlineStep}
          onEditTitle={editOutlineTitle}
          onSkipToApproveAll={skipToApproveAll}
          onFinalApprove={() => onSendMessage?.('approve')}
        />
      )}

      {isStreaming && (thinkingText || agentSteps.length > 0) && (
        <AgentActivity
          thinkingText={thinkingText}
          steps={agentSteps}
          streamingContent={streamingContent}
        />
      )}

      {pendingThemeSelection && presentationId && onRespondToInteraction && (
        <ThemeSelector
          selection={pendingThemeSelection}
          presentationId={presentationId}
          onSelect={onRespondToInteraction}
        />
      )}

      {pendingLayoutSelections && pendingLayoutSelections.length > 0 && presentationId && onRespondToInteraction && (
        <LayoutSelector
          selection={pendingLayoutSelections[pendingLayoutSelections.length - 1]}
          presentationId={presentationId}
          onSelect={onRespondToInteraction}
        />
      )}

      {isStreaming && streamingContent && (
        <ChatMessage
          role="assistant"
          content={streamingContent}
          isStreaming
        />
      )}

      {isStreaming && inlineSlideCards && inlineSlideCards.length > 0 && (
        <div className="px-4 py-2" style={themeToStyleVars(theme)}>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {inlineSlideCards.map((slide) => (
              <InlineSlideCard
                key={slide.id}
                slide={slide}
                theme={theme}
                onClick={() => setCurrentSlide(slide.slideNumber - 1)}
              />
            ))}
          </div>
        </div>
      )}


      {pendingImageSelections && pendingImageSelections.length > 0 && presentationId && onRespondToInteraction && (
        pendingImageSelections.map((sel) => (
          <ImageSelector
            key={sel.contextId}
            selection={sel}
            presentationId={presentationId}
            onSelect={onRespondToInteraction}
          />
        ))
      )}

      <div ref={bottomRef} />
    </div>
  );
}
