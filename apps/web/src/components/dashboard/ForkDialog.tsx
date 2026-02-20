import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GitFork, X, ChevronDown } from 'lucide-react';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import type { PresentationListItem } from '@/stores/presentations.store';

interface ForkDialogProps {
  presentation: PresentationListItem;
  onFork: (overrides: { briefId?: string; pitchLensId?: string; title?: string }) => void;
  onClose: () => void;
}

export function ForkDialog({ presentation, onFork, onClose }: ForkDialogProps) {
  const { t } = useTranslation();
  const { briefs } = usePitchBriefStore();
  const { lenses } = usePitchLensStore();

  const [title, setTitle] = useState(`${presentation.title} (reused)`);
  const [briefId, setBriefId] = useState(presentation.briefId ?? '');
  const [lensId, setLensId] = useState(presentation.pitchLensId ?? '');

  const handleSubmit = () => {
    const overrides: { briefId?: string; pitchLensId?: string; title?: string } = {};
    if (title && title !== `${presentation.title} (reused)`) overrides.title = title;
    else overrides.title = title;
    if (briefId) overrides.briefId = briefId;
    if (lensId) overrides.pitchLensId = lensId;
    onFork(overrides);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitFork className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">{t('dashboard.fork_dialog_title')}</h2>
          </div>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {t('dashboard.fork_dialog_desc', { title: presentation.title })}
        </p>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t('dashboard.fork_dialog_title_label')}</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t('dashboard.fork_dialog_brief_label')}</label>
            <div className="relative">
              <select
                value={briefId}
                onChange={(e) => setBriefId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('common.no_brief')}</option>
                {briefs.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground">{t('dashboard.fork_dialog_lens_label')}</label>
            <div className="relative">
              <select
                value={lensId}
                onChange={(e) => setLensId(e.target.value)}
                className="w-full appearance-none rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">{t('common.no_lens')}</option>
                {lenses.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <GitFork className="h-4 w-4" />
            {t('dashboard.fork_and_open')}
          </button>
        </div>
      </div>
    </div>
  );
}
