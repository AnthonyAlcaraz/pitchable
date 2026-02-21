import { Lightbulb, Pencil } from 'lucide-react';
import type { SubjectSuggestion } from '../../stores/workflow.store.js';

interface SubjectSelectorProps {
  suggestions: SubjectSuggestion[];
  onSelect: (topic: string) => void;
  disabled?: boolean;
}

export function SubjectSelector({ suggestions, onSelect, disabled }: SubjectSelectorProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className="mx-4 my-2 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <Lightbulb className="h-4 w-4 text-orange-400" />
        <span className="text-xs font-medium text-foreground">Suggested topics for your deck</span>
      </div>

      <div className="space-y-1.5 p-3">
        {suggestions.map((s, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(`Create a presentation about ${s.title}`)}
            disabled={disabled}
            className="flex w-full items-start gap-2.5 rounded-md border border-border bg-background p-2.5 text-left transition-all hover:border-orange-500/50 hover:bg-orange-500/5 disabled:opacity-50"
          >
            <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded bg-orange-500/10 text-[10px] font-bold text-orange-400">
              {i + 1}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{s.title}</p>
              <p className="text-xs text-muted-foreground">{s.description}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
        <Pencil className="h-3 w-3 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">Or type your own topic below</span>
      </div>
    </div>
  );
}
