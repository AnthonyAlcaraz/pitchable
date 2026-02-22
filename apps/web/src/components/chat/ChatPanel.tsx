import { useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';
import { PeachLogo } from '../icons/PeachLogo.js';
import { CreditBadge } from '../shared/CreditBadge.js';
import { useChatStore } from '../../stores/chat.store.js';
import { useWorkflowStore } from '../../stores/workflow.store.js';
import { ChatHistory } from './ChatHistory.js';
import { ChatInput } from './ChatInput.js';
import { SubjectSelector } from './SubjectSelector.js';
import { OutlineApproveBar } from './OutlineApproveBar.js';
import { StickySlidePreview } from './StickySlidePreview.js';
import { api } from '../../lib/api.js';

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
    outlineReviewState,
  } = useChatStore();

  const phase = useWorkflowStore((s) => s.phase);
  const subjectSuggestions = useWorkflowStore((s) => s.subjectSuggestions);
  const setSubjectSuggestions = useWorkflowStore((s) => s.setSubjectSuggestions);
  const resetWorkflow = useWorkflowStore((s) => s.reset);

  useEffect(() => {
    if (presentationId && presentationId !== 'new') {
      loadHistory(presentationId);
    } else {
      resetWorkflow();
    }
  }, [presentationId, loadHistory, resetWorkflow]);

  // Fetch subject suggestions when entering a new presentation with lens/brief
  useEffect(() => {
    if (phase !== 'subject_selection') return;
    if (subjectSuggestions.length > 0) return;
    if (!lensId && !briefId) return;

    let cancelled = false;
    api.post<{ suggestions: { title: string; description: string; source: string }[] }>(
      '/chat/suggest-subjects',
      { lensId, briefId },
    ).then((res) => {
      if (!cancelled && res.suggestions?.length) {
        setSubjectSuggestions(res.suggestions.map((s) => ({
          title: s.title,
          description: s.description,
          source: (s.source as 'pitchlens' | 'brief' | 'custom') ?? 'pitchlens',
        })));
      }
    }).catch(() => { /* ignore — suggestions are optional */ });

    return () => { cancelled = true; };
  }, [phase, lensId, briefId, subjectSuggestions.length, setSubjectSuggestions]);

  const handleSend = useCallback((content: string) => {
    if (!presentationId) return;
    const isNew = presentationId === 'new';
    sendMessage(presentationId, content, isNew ? { briefId, lensId } : undefined);
  }, [presentationId, briefId, lensId, sendMessage]);

  // Listen for auto-send-topic from wizard
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ topic: string }>).detail;
      if (detail?.topic) {
        handleSend(detail.topic);
      }
    };
    window.addEventListener('auto-send-topic', handler);
    return () => window.removeEventListener('auto-send-topic', handler);
  }, [handleSend]);

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
    async (pid: string, format: string) => {
      // Open tab immediately in user-gesture context (avoids popup blocker)
      const newTab = window.open('', '_blank');
      if (newTab) {
        newTab.document.write(
          '<html><body style="background:#0f0f1a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui">' +
          '<div style="text-align:center"><p style="font-size:1.2rem">Preparing your export...</p><p style="color:#888">This may take a moment.</p></div></body></html>',
        );
      }
      try {
        const formatMap: Record<string, string> = {
          pdf: 'PDF', pptx: 'PPTX', html: 'REVEAL_JS',
          'pdf-figma': 'PDF', 'pptx-figma': 'PPTX',
        };
        const { jobId } = await api.post<{ jobId: string; status: string }>(
          `/presentations/${pid}/export`,
          { format: formatMap[format] || 'PPTX', renderEngine: format.includes('figma') ? 'figma' : 'auto' },
        );
        // Poll for completion (max 3 min)
        for (let i = 0; i < 90; i++) {
          const job = await api.get<{ status: string }>(`/exports/${jobId}`);
          if (job.status === 'COMPLETED') break;
          if (job.status === 'FAILED') throw new Error('Export failed');
          await new Promise((r) => setTimeout(r, 2000));
        }
        if (newTab) newTab.location.href = `/exports/${jobId}/download`;
      } catch {
        if (newTab) newTab.close();
      }
    },
    [],
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
        <div className="ml-auto">
          <CreditBadge size="sm" />
        </div>
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

      {!isNew && <StickySlidePreview />}

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
          onSendMessage={handleSend}
        />
      )}

      {/* Subject suggestions during topic selection phase */}
      {phase === 'subject_selection' && subjectSuggestions.length > 0 && (
        <SubjectSelector
          suggestions={subjectSuggestions}
          onSelect={handleSend}
          disabled={isStreaming}
        />
      )}

      {/* Phase-dependent bottom controls */}
      {phase === 'outline_review' && !isStreaming && !outlineReviewState ? (
        <OutlineApproveBar
          onApprove={() => handleSend('approve')}
          onRetry={(feedback) => handleSend(feedback)}
          disabled={isStreaming}
        />
      ) : (
        <ChatInput onSend={handleSend} disabled={isStreaming} />
      )}
    </div>
  );
}
