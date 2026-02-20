import { useCallback, useState } from 'react';
import { Palette, Check } from 'lucide-react';
import { CountdownBar } from './CountdownBar.js';
import type { PendingThemeSelection } from '../../stores/chat.store.js';

interface ThemeSelectorProps {
  selection: PendingThemeSelection;
  presentationId: string;
  onSelect: (presentationId: string, interactionType: string, contextId: string, selection: unknown) => void;
}

export function ThemeSelector({ selection, presentationId, onSelect }: ThemeSelectorProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = useCallback(
    (themeId: string) => {
      if (selected) return;
      setSelected(themeId);
      onSelect(presentationId, 'theme_selection', selection.contextId, themeId);
    },
    [selected, presentationId, selection.contextId, onSelect],
  );

  const handleTimeout = useCallback(() => {
    if (!selected) {
      setSelected(selection.defaultThemeId);
      onSelect(presentationId, 'theme_selection', selection.contextId, selection.defaultThemeId);
    }
  }, [selected, selection.defaultThemeId, selection.contextId, presentationId, onSelect]);

  return (
    <div className="mx-4 my-2 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <Palette className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground">Choose a theme for your deck</span>
      </div>

      <div className="grid grid-cols-3 gap-2 p-3">
        {selection.options.map((theme) => {
          const isSelected = selected === theme.id;
          const palette = theme.colorPalette;

          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => handleSelect(theme.id)}
              disabled={!!selected}
              className={`rounded-lg border p-2 text-left transition-all ${
                isSelected
                  ? 'border-primary ring-2 ring-primary/30'
                  : selected
                    ? 'border-border opacity-50'
                    : 'border-border hover:border-primary/50'
              }`}
            >
              {/* Color swatch row */}
              <div className="mb-2 flex gap-1">
                {['primary', 'secondary', 'accent', 'background', 'text'].map((key) => (
                  <div
                    key={key}
                    className="h-3 w-3 rounded-full border border-border/50"
                    style={{ backgroundColor: palette[key] ?? '#888' }}
                    title={key}
                  />
                ))}
              </div>

              {/* Mini preview */}
              <div
                className="mb-2 rounded border border-border/30 p-1.5"
                style={{ backgroundColor: palette['background'] ?? '#1a1a1a' }}
              >
                <div
                  className="text-[8px] font-bold leading-tight"
                  style={{ color: palette['text'] ?? '#fff', fontFamily: theme.headingFont }}
                >
                  Sample Title
                </div>
                <div
                  className="mt-0.5 text-[7px] leading-tight"
                  style={{ color: (palette['text'] ?? '#fff') + 'aa', fontFamily: theme.bodyFont }}
                >
                  Body text preview
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isSelected && <Check className="h-3 w-3 text-primary" />}
                <span className="text-[10px] font-medium text-foreground truncate">
                  {theme.displayName}
                </span>
              </div>
              <span className="text-[8px] text-muted-foreground capitalize">{theme.category}</span>
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
            Auto-selecting top theme when timer expires
          </p>
        </div>
      )}
    </div>
  );
}
