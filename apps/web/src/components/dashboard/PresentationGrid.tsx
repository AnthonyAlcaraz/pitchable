import { Link } from 'react-router-dom';
import { Plus, Layers } from 'lucide-react';
import { PresentationCard } from './PresentationCard';
import type { PresentationListItem } from '@/stores/presentations.store';

interface PresentationGridProps {
  presentations: PresentationListItem[];
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

export function PresentationGrid({
  presentations,
  onDelete,
  onDuplicate,
  onRename,
}: PresentationGridProps) {
  if (presentations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Layers className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          No presentations yet
        </h2>
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
          Create your first presentation by describing what you need. Pitchable
          will handle the design.
        </p>
        <Link
          to="/workspace/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Presentation
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {/* New presentation card */}
      <Link
        to="/workspace/new"
        className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50 hover:bg-primary/5"
      >
        <Plus className="mb-2 h-8 w-8 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground">New Presentation</span>
      </Link>

      {/* Presentation cards */}
      {presentations.map((p) => (
        <PresentationCard
          key={p.id}
          presentation={p}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onRename={onRename}
        />
      ))}
    </div>
  );
}
