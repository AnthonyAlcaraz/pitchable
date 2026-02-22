import { useCallback, useMemo, useState } from 'react';
import { Palette, Check, Star } from 'lucide-react';
import { CountdownBar } from './CountdownBar.js';
import type { PendingThemeSelection } from '../../stores/chat.store.js';

const CATEGORY_LABELS: Record<string, string> = {
  dark: 'Dark',
  light: 'Light',
  consulting: 'Consulting',
  creative: 'Creative',
};

const CATEGORY_ORDER = ['dark', 'light', 'consulting', 'creative'];

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

  // Group themes by category, preserving score order within each group
  const grouped = useMemo(() => {
    const groups = new Map<string, typeof selection.options>();
    for (const cat of CATEGORY_ORDER) groups.set(cat, []);
    for (const theme of selection.options) {
      const cat = theme.category ?? 'dark';
      const list = groups.get(cat);
      if (list) list.push(theme);
      else groups.set(cat, [theme]);
    }
    return groups;
  }, [selection.options]);

  // Top 3 by score are "recommended"
  const topIds = useMemo(() => {
    const sorted = [...selection.options].sort((a, b) => b.score - a.score);
    return new Set(sorted.slice(0, 3).map((t) => t.id));
  }, [selection.options]);

  return (
    <div className="mx-4 my-2 rounded-lg border border-border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-muted/30 px-3 py-2">
        <Palette className="h-4 w-4 text-primary" />
        <span className="text-xs font-medium text-foreground">Choose a theme for your deck</span>
        <span className="ml-auto text-[9px] text-muted-foreground">{selection.options.length} styles</span>
      </div>

      <div className="max-h-[340px] overflow-y-auto p-3 space-y-3">
        {CATEGORY_ORDER.map((cat) => {
          const themes = grouped.get(cat);
          if (!themes || themes.length === 0) return null;
          return (
            <div key={cat}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {themes.map((theme) => {
                  const isSelected = selected === theme.id;
                  const isRecommended = topIds.has(theme.id);
                  const palette = theme.colorPalette;

                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => handleSelect(theme.id)}
                      disabled={!!selected}
                      className={`relative rounded-lg border p-1.5 text-left transition-all ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/30'
                          : selected
                            ? 'border-border opacity-50'
                            : isRecommended
                              ? 'border-orange-500/40 hover:border-primary/50'
                              : 'border-border hover:border-primary/50'
                      }`}
                    >
                      {isRecommended && !isSelected && (
                        <Star className="absolute -top-1 -right-1 h-3 w-3 fill-orange-400 text-orange-400" />
                      )}
                      {/* Mini preview */}
                      <div
                        className="mb-1 rounded border border-border/30 p-1"
                        style={{ backgroundColor: palette['background'] ?? '#1a1a1a' }}
                      >
                        <div
                          className="text-[7px] font-bold leading-tight"
                          style={{ color: palette['text'] ?? '#fff', fontFamily: theme.headingFont }}
                        >
                          Sample Title
                        </div>
                        <div
                          className="mt-0.5 text-[6px] leading-tight"
                          style={{ color: (palette['text'] ?? '#fff') + 'aa', fontFamily: theme.bodyFont }}
                        >
                          Body text
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {isSelected && <Check className="h-2.5 w-2.5 text-primary" />}
                        <span className="text-[9px] font-medium text-foreground truncate">
                          {theme.displayName}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {!selected && (
        <div className="border-t border-border px-3 py-2">
          <CountdownBar
            durationMs={selection.timeoutMs}
            startedAt={selection.receivedAt}
            onTimeout={handleTimeout}
          />
          <p className="mt-1 text-center text-[9px] text-muted-foreground">
            Auto-selecting best match when timer expires
          </p>
        </div>
      )}
    </div>
  );
}
