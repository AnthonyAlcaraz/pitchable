import { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage.js';
import { AgentActivity } from './AgentActivity.js';
import type { ChatMessage as ChatMessageType, PendingValidation, AgentStep } from '../../stores/chat.store.js';

interface ChatHistoryProps {
  messages: ChatMessageType[];
  streamingContent: string;
  isStreaming: boolean;
  thinkingText: string | null;
  agentSteps: AgentStep[];
  pendingValidations?: PendingValidation[];
  presentationId?: string;
  onAcceptSlide?: (slideId: string) => void;
  onEditSlide?: (slideId: string, edits: { title?: string; body?: string; speakerNotes?: string }) => void;
  onRejectSlide?: (slideId: string) => void;
}

export function ChatHistory({
  messages,
  streamingContent,
  isStreaming,
  thinkingText,
  agentSteps,
  pendingValidations,
  presentationId,
  onAcceptSlide,
  onEditSlide,
  onRejectSlide,
}: ChatHistoryProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const userScrolled = useRef(false);

  useEffect(() => {
    if (!userScrolled.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, streamingContent, pendingValidations, thinkingText, agentSteps]);

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
        <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-400">
          <p className="mb-2 text-lg font-medium">Start a conversation</p>
          <p className="text-sm">
            Describe your presentation or type{' '}
            <code className="rounded bg-gray-100 px-1 py-0.5 text-purple-600">
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
          />
        );
      })}

      {isStreaming && (thinkingText || agentSteps.length > 0) && (
        <AgentActivity
          thinkingText={thinkingText}
          steps={agentSteps}
          streamingContent={streamingContent}
        />
      )}

      {isStreaming && streamingContent && (
        <ChatMessage
          role="assistant"
          content={streamingContent}
          isStreaming
        />
      )}

      <div ref={bottomRef} />
    </div>
  );
}
