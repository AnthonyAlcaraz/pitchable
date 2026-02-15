import { Loader2, Check, AlertCircle } from 'lucide-react';
import type { AgentStep } from '@/stores/chat.store';
import { getStepConfig, formatElapsed } from './step-config';

interface AgentStepRowProps {
  step: AgentStep;
  index: number;
}

export function AgentStepRow({ step, index }: AgentStepRowProps) {
  const config = getStepConfig(step.id);
  const StepIcon = config.icon;
  const elapsed = step.completedAt ? formatElapsed(step.startedAt, step.completedAt) : null;
  const isSlideGen = step.id === 'generate_slide' && step.current && step.total;

  return (
    <div
      className="flex items-center gap-2.5 py-1"
      style={{ animation: `fadeSlideIn 0.2s ease-out ${index * 0.04}s both` }}
    >
      {/* Status indicator */}
      {step.status === 'running' && (
        <Loader2 className={`h-3.5 w-3.5 shrink-0 animate-spin ${config.accentColor}`} />
      )}
      {step.status === 'complete' && (
        <div className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <Check className="h-2.5 w-2.5 text-emerald-400" />
        </div>
      )}
      {step.status === 'error' && (
        <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
      )}

      {/* Contextual icon */}
      <StepIcon
        className={`h-3 w-3 shrink-0 ${
          step.status === 'complete' ? 'text-muted-foreground' : config.accentColor
        }`}
      />

      {/* Step content */}
      <span
        className={`flex-1 text-xs ${
          step.status === 'complete'
            ? 'text-muted-foreground'
            : step.status === 'error'
              ? 'text-red-400'
              : 'text-foreground'
        }`}
      >
        {step.content}
      </span>

      {/* Slide generation mini counter */}
      {isSlideGen && step.status === 'running' && (
        <span className="text-[10px] font-mono text-primary">
          {step.current}/{step.total}
        </span>
      )}

      {/* Elapsed time */}
      {step.status === 'complete' && elapsed && (
        <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
          {elapsed}
        </span>
      )}
    </div>
  );
}
