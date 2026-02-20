import { useCallback, useState } from 'react';
import { Layout, Check } from 'lucide-react';
import { CountdownBar } from './CountdownBar.js';
import type { PendingLayoutSelection } from '../../stores/chat.store.js';

interface LayoutSelectorProps {
  selection: PendingLayoutSelection;
  presentationId: string;
  onSelect: (presentationId: string, interactionType: string, contextId: string, selection: unknown) => void;
}

const LAYOUT_ICONS: Record<string, string> = {
  CONTENT: '\u2261',
  COMPARISON: '\u2194',
  PROCESS: '\u2192',
  DATA_METRICS: '\u2193',
  ARCHITECTURE: '\u2b1c',
  PROBLEM: '\u26a0',
  SOLUTION: '\u2713',
};

export function LayoutSelector({ selection, presentationId, onSelect }: LayoutSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = useCallback(
    (slideType: string) => {
      if (selected) return;
      setSelected(slideType);
      onSelect(presentationId, 'layout_selection', selection.contextId, slideType);
    },
    [selected, presentationId, selection.contextId, onSelect],
  );

  const handleTimeout = useCallback(() => {
    if (!selected) {
      setSelected(selection.defaultLayout);
      onSelect(presentationId, 'layout_selection', selection.contextId, selection.defaultLayout);
    }
  }, [selected, selection.defaultLayout, selection.contextId, presentationId, onSelect]);

  return (
    <div className="mx-4 my-2 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <Layout className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground">
          Choose layout for Slide {selection.slideNumber}: {selection.slideTitle}
        </span>
      </div>

      <div className="flex gap-2 p-3">
        {selection.options.map((option) => {
          const isSelected = selected === option.slideType;
          const icon = LAYOUT_ICONS[option.slideType] ?? '\u25a1';

          return (
            <button
              key={option.id}
              type="button"
              onClick={() => handleSelect(option.slideType)}
              disabled={!!selected}
              className={`flex-1 rounded-lg border p-2.5 text-left transition-all ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/30'
                  : selected
                    ? 'border-border opacity-50'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="mb-1 flex items-center gap-1.5">
                <span className="text-base">{icon}</span>
                {isSelected && <Check className="h-3 w-3 text-primary" />}
              </div>
              <div className="text-xs font-medium text-foreground">{option.name}</div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">{option.description}</div>
            </button>
          );
        })}
      </div>

      {!selected && (
        <div className="px-3 pb-2">
          <CountdownBar
            durationMs={selection.timeoutMs}
            startedAt={selection.receivedAt}
            onTimeout={handleTimeout}
          />
          <p className="mt-1 text-center text-[9px] text-muted-foreground">
            Auto-selecting original layout when timer expires
          </p>
        </div>
      )}
    </div>
  );
}
