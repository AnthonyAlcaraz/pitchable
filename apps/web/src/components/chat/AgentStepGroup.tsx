import { Check } from 'lucide-react';
import type { AgentStep } from '@/stores/chat.store';
import { AgentStepRow } from './AgentStepRow';

interface AgentStepGroupProps {
  label: string;
  steps: AgentStep[];
  isComplete: boolean;
}

export function AgentStepGroup({ label, steps, isComplete }: AgentStepGroupProps) {
  return (
    <div
      className={`px-3 py-2 transition-opacity duration-500 ${
        isComplete ? 'opacity-60' : 'opacity-100'
      }`}
    >
      {/* Phase header */}
      <div className="mb-1.5 flex items-center gap-2">
        <div
          className={`h-1 w-1 rounded-full ${
            isComplete ? 'bg-emerald-400' : 'bg-primary animate-pulse'
          }`}
        />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {isComplete && <Check className="h-3 w-3 text-emerald-400" />}
      </div>

      {/* Steps */}
      <div className="space-y-0.5 border-l border-border/30 pl-3">
        {steps.map((step, idx) => (
          <AgentStepRow key={`${step.id}-${idx}`} step={step} index={idx} />
        ))}
      </div>
    </div>
  );
}
