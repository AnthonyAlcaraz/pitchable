import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const {
    messages,
    streamingContent,
    isStreaming,
    thinkingText,
    agentSteps,
    isLoading,
    error,
    pendingValidations,
    inlineSlideCards,
    pendingThemeSelection,
    pendingLayoutSelections,
    pendingImageSelections,
    loadHistory,
    sendMessage,
    acceptSlide,
    editSlide,
    rejectSlide,
    respondToInteraction,
    clearError,
  } = useChatStore();

  useEffect(() => {
    if (presentationId) {
      loadHistory(presentationId);
    }
  }, [presentationId, loadHistory]);

  const handleSend = (content: string) => {
    if (!presentationId || presentationId === 'new') return;
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

  // Guard: "new" is not a real presentation ID (workspace opened before generation)
  if (!presentationId || presentationId === 'new') {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
        <MessageSquare className="mb-3 h-10 w-10" />
        <p>{t('chat.panel.empty_state')}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <MessageSquare className="h-4 w-4 text-orange-400" />
        <span className="text-sm font-medium text-foreground">{t('chat.panel.title')}</span>
        {isLoading && (
          <span className="text-xs text-muted-foreground">{t('chat.panel.loading')}</span>
        )}
      </div>

      {error && (
        <div className="mx-3 mt-2 flex items-center justify-between rounded-md bg-red-500/10 px-3 py-2 text-sm text-red-400">
          <span>{error}</span>
          <button
            type="button"
            onClick={clearError}
            className="ml-2 text-red-500 hover:text-red-700"
          >
            {t('common.dismiss')}
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
        inlineSlideCards={inlineSlideCards}
        pendingThemeSelection={pendingThemeSelection}
        pendingLayoutSelections={pendingLayoutSelections}
        pendingImageSelections={pendingImageSelections}
        presentationId={presentationId}
        onAcceptSlide={handleAcceptSlide}
        onEditSlide={handleEditSlide}
        onRejectSlide={handleRejectSlide}
        onRespondToInteraction={respondToInteraction}
      />

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
