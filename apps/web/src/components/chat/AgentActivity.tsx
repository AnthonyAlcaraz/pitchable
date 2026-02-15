import { useMemo } from 'react';
import type { AgentStep } from '@/stores/chat.store';
import { AgentThinkingCard } from './AgentThinkingCard';
import { AgentStepGroup } from './AgentStepGroup';
import { DeckProgressHeader } from './DeckProgressHeader';
import { getStepConfig, PHASE_LABELS } from './step-config';

interface AgentActivityProps {
  thinkingText: string | null;
  steps: AgentStep[];
  streamingContent: string;
}

export function AgentActivity({ thinkingText, steps, streamingContent }: AgentActivityProps) {
  const showThinking = thinkingText && steps.length === 0 && !streamingContent;

  // Group steps by phase
  const phaseGroups = useMemo(() => {
    const groups: Record<string, AgentStep[]> = {};
    const order: string[] = [];

    for (const step of steps) {
      const config = getStepConfig(step.id);
      if (!groups[config.phase]) {
        groups[config.phase] = [];
        order.push(config.phase);
      }
      groups[config.phase].push(step);
    }

    return order.map((phase) => ({
      phase,
      label: PHASE_LABELS[phase] ?? phase,
      steps: groups[phase],
    }));
  }, [steps]);

  // Detect deck generation progress
  const deckProgress = useMemo(() => {
    const genSteps = steps.filter((s) => s.id === 'generate_slide');
    if (genSteps.length === 0) return null;
    const latest = genSteps[genSteps.length - 1];
    if (!latest.total || latest.total <= 1) return null;
    return {
      current: latest.current ?? 0,
      total: latest.total,
      label: latest.label ?? '',
      isComplete: latest.status === 'complete' && latest.current === latest.total,
    };
  }, [steps]);

  if (!showThinking && steps.length === 0) return null;

  return (
    <div
      className="mx-4 mb-3 overflow-hidden rounded-lg border border-border bg-card/60 backdrop-blur-sm"
      style={{ animation: 'fadeSlideIn 0.3s ease-out' }}
    >
      {/* Deck generation progress header */}
      {deckProgress && (
        <DeckProgressHeader
          current={deckProgress.current}
          total={deckProgress.total}
          label={deckProgress.label}
          isComplete={deckProgress.isComplete}
        />
      )}

      {/* Thinking card */}
      {showThinking && <AgentThinkingCard text={thinkingText} />}

      {/* Phase groups */}
      {phaseGroups.length > 0 && (
        <div className="divide-y divide-border/50">
          {phaseGroups.map(({ phase, label, steps: phaseSteps }) => (
            <AgentStepGroup
              key={phase}
              label={label}
              steps={phaseSteps}
              isComplete={phaseSteps.every((s) => s.status === 'complete')}
            />
          ))}
        </div>
      )}
    </div>
  );
}
