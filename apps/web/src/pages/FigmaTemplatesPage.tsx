import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Sparkles,
  Figma,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFigmaTemplateStore } from '@/stores/figma-template.store';
import { FigmaTemplateMappingEditor } from '@/components/figma/FigmaTemplateMappingEditor';

export function FigmaTemplatesPage() {
  const {
    templates,
    isLoading,
    error,
    loadTemplates,
    deleteTemplate,
    createFromUrl,
    clearError,
  } = useFigmaTemplateStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [figmaUrl, setFigmaUrl] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  async function handleImport() {
    if (!figmaUrl.trim()) return;
    setImporting(true);
    setImportError('');
    try {
      const id = await createFromUrl(figmaUrl.trim());
      setFigmaUrl('');
      setSelectedId(id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await deleteTemplate(id);
      if (selectedId === id) setSelectedId(null);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/settings"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Settings
          </Link>
          <span className="text-muted-foreground">/</span>
          <div className="flex items-center gap-2">
            <Figma className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold text-foreground">
              Figma Templates
            </h1>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel: template list */}
        <div className="flex w-80 flex-col border-r border-border">
          {/* Import from URL */}
          <div className="border-b border-border p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={figmaUrl}
                onChange={(e) => {
                  setFigmaUrl(e.target.value);
                  setImportError('');
                }}
                placeholder="Paste Figma URL..."
                className="flex-1 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleImport();
                }}
              />
              <button
                onClick={handleImport}
                disabled={!figmaUrl.trim() || importing}
                className="flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {importing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Plus className="h-3 w-3" />
                )}
                Import
              </button>
            </div>
            {importError && (
              <p className="mt-1 text-[11px] text-red-500">{importError}</p>
            )}
          </div>

          {/* Template list */}
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading && templates.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : templates.length === 0 ? (
              <div className="py-12 text-center">
                <Figma className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">
                  No templates yet
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Paste a Figma URL above to create one
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {templates.map((tmpl) => (
                  <div
                    key={tmpl.id}
                    className={cn(
                      'group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors cursor-pointer',
                      selectedId === tmpl.id
                        ? 'bg-primary/10 text-primary'
                        : 'text-foreground hover:bg-accent',
                    )}
                    onClick={() => setSelectedId(tmpl.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{tmpl.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {tmpl.mappingCount} mappings
                      </p>
                    </div>
                    {tmpl.isOwner && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(tmpl.id);
                        }}
                        disabled={deleting === tmpl.id}
                        className="rounded p-1 opacity-0 transition-opacity hover:bg-red-100 hover:text-red-600 group-hover:opacity-100 dark:hover:bg-red-900/30"
                      >
                        {deleting === tmpl.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel: mapping editor */}
        <div className="flex-1">
          {selectedId ? (
            <FigmaTemplateMappingEditor
              templateId={selectedId}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <Sparkles className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  Select a template to edit mappings
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-2 dark:border-red-800 dark:bg-red-900/20">
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={clearError}
            className="text-xs text-red-500 underline"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export default FigmaTemplatesPage;
