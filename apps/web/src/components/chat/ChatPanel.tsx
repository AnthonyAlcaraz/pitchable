import { useCallback, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import { useChatStore } from '../../stores/chat.store.js';
import { ChatHistory } from './ChatHistory.js';
import { ChatInput } from './ChatInput.js';

interface ChatPanelProps {
  presentationId: string | undefined;
  briefId?: string;
  lensId?: string;
}

export function ChatPanel({ presentationId, briefId: _briefId, lensId: _lensId }: ChatPanelProps) {
  const {
    messages,
    streamingContent,
    isStreaming,
    thinkingText,
    agentSteps,
    isLoading,
    error,
    pendingValidations,
    loadHistory,
    sendMessage,
    acceptSlide,
    editSlide,
    rejectSlide,
    clearError,
  } = useChatStore();

  useEffect(() => {
    if (presentationId) {
      loadHistory(presentationId);
    }
  }, [presentationId, loadHistory]);

  const handleSend = (content: string) => {
    if (!presentationId) return;
    sendMessage(presentationId, content);
  };

  const handleAcceptSlide = useCallback(
    (slideId: string) => {
      if (!presentationId) return;
      acceptSlide(presentationId, slideId);
    },
    [presentationId, acceptSlide],
  );

  const handleEditSlide = useCallback(
    (slideId: string, edits: { title?: string; body?: string; speakerNotes?: string }) => {
      if (!presentationId) return;
      editSlide(presentationId, slideId, edits);
    },
    [presentationId, editSlide],
  );

  const handleRejectSlide = useCallback(
    (slideId: string) => {
      if (!presentationId) return;
      rejectSlide(presentationId, slideId);
    },
    [presentationId, rejectSlide],
  );

  if (!presentationId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-gray-400">
        <MessageSquare className="mb-3 h-10 w-10" />
        <p>Create or select a presentation to start chatting</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-gray-200 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-purple-600" />
        <span className="text-sm font-medium text-gray-700">Chat</span>
        {isLoading && (
          <span className="text-xs text-gray-400">Loading...</span>
        )}
      </div>

      {error && (
        <div className="mx-3 mt-2 flex items-center justify-between rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      <ChatHistory
        messages={messages}
        streamingContent={streamingContent}
        isStreaming={isStreaming}
        thinkingText={thinkingText}
        agentSteps={agentSteps}
        pendingValidations={pendingValidations}
        presentationId={presentationId}
        onAcceptSlide={handleAcceptSlide}
        onEditSlide={handleEditSlide}
        onRejectSlide={handleRejectSlide}
      />

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
