import { useEffect, useState } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFigmaTemplateStore } from '@/stores/figma-template.store';
import type { FigmaTemplateListItem } from '@/stores/figma-template.store';

interface FigmaTemplateManagerProps {
  onSelectTemplate?: (templateId: string) => void;
  selectedTemplateId?: string | null;
}

export function FigmaTemplateManager({
  onSelectTemplate,
  selectedTemplateId,
}: FigmaTemplateManagerProps) {
  const {
    templates,
    isLoading,
    error,
    loadTemplates,
    createTemplate,
    deleteTemplate,
    clearError,
  } = useFigmaTemplateStore();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newFileKey, setNewFileKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function extractFileKey(input: string): string {
    // Handle full Figma URLs: https://www.figma.com/design/FILE_KEY/...
    const match = input.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
    return match ? match[1] : input.trim();
  }

  async function handleCreate() {
    if (!newName.trim() || !newFileKey.trim()) return;
    setCreating(true);
    try {
      const id = await createTemplate({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        figmaFileKey: extractFileKey(newFileKey),
      });
      setShowCreate(false);
      setNewName('');
      setNewFileKey('');
      setNewDescription('');
      onSelectTemplate?.(id);
    } catch (err) {
      // Error handled by store
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (!confirm('Delete this template and all its mappings?')) return;
    await deleteTemplate(id);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">
          Figma Templates
        </h3>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-2 text-xs text-red-700 dark:bg-red-900/20 dark:text-red-400">
          {error}
          <button onClick={clearError} className="ml-2 underline">
            dismiss
          </button>
        </div>
      )}

      {showCreate && (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Template name..."
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <input
            type="text"
            value={newFileKey}
            onChange={(e) => setNewFileKey(e.target.value)}
            placeholder="Figma file URL or key..."
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)..."
            rows={2}
            className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim() || !newFileKey.trim()}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Create
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
          No templates yet. Create one to map Figma frames to slide types.
        </div>
      ) : (
        <div className="space-y-2">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              selected={template.id === selectedTemplateId}
              onSelect={() => onSelectTemplate?.(template.id)}
              onDelete={(e) => handleDelete(e, template.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  onSelect,
  onDelete,
}: {
  template: FigmaTemplateListItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'flex w-full items-start gap-3 rounded-lg border-2 p-3 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/30',
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
        <Layers className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {template.name}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {template.mappingCount} mapped
          {template.figmaFileName ? ` · ${template.figmaFileName}` : ''}
        </p>
        {template.description && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
            {template.description}
          </p>
        )}
      </div>
      {template.isOwner && (
        <button
          onClick={onDelete}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/20"
          title="Delete template"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </button>
  );
}

export default FigmaTemplateManager;
