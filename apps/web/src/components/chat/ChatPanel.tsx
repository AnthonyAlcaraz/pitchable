import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { PeachLogo } from '../icons/PeachLogo.js';
import { useChatStore } from '../../stores/chat.store.js';
import { ChatHistory } from './ChatHistory.js';
import { ChatInput } from './ChatInput.js';

interface ChatPanelProps {
  presentationId: string | undefined;
  briefId?: string;
  lensId?: string;
}

export function ChatPanel({ presentationId, briefId, lensId }: ChatPanelProps) {
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
    if (presentationId && presentationId !== 'new') {
      loadHistory(presentationId);
    }
  }, [presentationId, loadHistory]);

  const handleSend = (content: string) => {
    if (!presentationId) return;
    const isNew = presentationId === 'new';
    sendMessage(presentationId, content, isNew ? { briefId, lensId } : undefined);
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

  const handleExport = useCallback(
    (pid: string, format: string) => {
      sendMessage(pid, `/export ${format}`);
    },
    [sendMessage],
  );

  const isNew = !presentationId || presentationId === 'new';

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

      {isNew ? (
        <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground">
          <div className="relative mb-4">
            <div className="absolute inset-0 animate-pulse rounded-full bg-orange-500/20 blur-xl" />
            <div className="relative rounded-full bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-4">
              <PeachLogo className="h-12 w-12" />
            </div>
          </div>
          <p className="text-sm font-medium text-foreground/80">{t('chat.panel.empty_state')}</p>
          <p className="mt-1 text-xs text-muted-foreground">Describe your deck and Pitchable will craft it slide by slide</p>
        </div>
      ) : (
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
          onExport={handleExport}
          onAcceptSlide={handleAcceptSlide}
          onEditSlide={handleEditSlide}
          onRejectSlide={handleRejectSlide}
          onRespondToInteraction={respondToInteraction}
        />
      )}

      <ChatInput onSend={handleSend} disabled={isStreaming} />
    </div>
  );
}
