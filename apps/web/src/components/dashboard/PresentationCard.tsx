import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MoreVertical, Copy, Trash2, Pencil, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PresentationListItem } from '@/stores/presentations.store';

interface PresentationCardProps {
  presentation: PresentationListItem;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, title: string) => void;
}

const TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Standard',
  VC_PITCH: 'VC Pitch',
  TECHNICAL: 'Technical',
  EXECUTIVE: 'Executive',
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-amber-500/10 text-amber-600',
  PROCESSING: 'bg-blue-500/10 text-blue-600',
  COMPLETED: 'bg-emerald-500/10 text-emerald-600',
  FAILED: 'bg-red-500/10 text-red-600',
};

export function PresentationCard({
  presentation,
  onDelete,
  onDuplicate,
  onRename,
}: PresentationCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(presentation.title);

  const handleRename = () => {
    if (renameValue.trim() && renameValue !== presentation.title) {
      onRename(presentation.id, renameValue.trim());
    }
    setIsRenaming(false);
  };

  const formattedDate = new Date(presentation.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="group relative rounded-lg border border-border bg-card transition-shadow hover:shadow-md">
      {/* Card body — clickable */}
      <Link to={`/workspace/${presentation.id}`} className="block p-5">
        {/* Preview placeholder */}
        <div className="mb-4 flex h-32 items-center justify-center rounded-md bg-muted/50">
          <Layers className="h-10 w-10 text-muted-foreground/30" />
        </div>

        {/* Title */}
        {isRenaming ? (
          <input
            type="text"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
              if (e.key === 'Escape') setIsRenaming(false);
            }}
            onClick={(e) => e.preventDefault()}
            autoFocus
            className="mb-2 w-full rounded border border-primary/50 bg-transparent px-1 py-0.5 text-sm font-semibold text-foreground outline-none"
          />
        ) : (
          <h3 className="mb-2 truncate text-sm font-semibold text-foreground">
            {presentation.title}
          </h3>
        )}

        {/* Meta */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'rounded-full px-2 py-0.5 text-[10px] font-medium',
              STATUS_COLORS[presentation.status] ?? 'bg-muted text-muted-foreground',
            )}
          >
            {presentation.status}
          </span>
          <span className="text-xs text-muted-foreground">
            {TYPE_LABELS[presentation.presentationType] ?? presentation.presentationType}
          </span>
          <span className="text-xs text-muted-foreground">
            {presentation.slideCount} slides
          </span>
        </div>

        <p className="mt-2 text-xs text-muted-foreground">{formattedDate}</p>
      </Link>

      {/* Action menu */}
      <div className="absolute right-2 top-2">
        <button
          onClick={(e) => {
            e.preventDefault();
            setShowMenu(!showMenu);
          }}
          className="rounded p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-accent"
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </button>

        {showMenu && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setShowMenu(false)}
            />
            <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-border bg-card py-1 shadow-lg">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setIsRenaming(true);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                <Pencil className="h-3.5 w-3.5" /> Rename
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDuplicate(presentation.id);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-foreground hover:bg-accent"
              >
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onDelete(presentation.id);
                  setShowMenu(false);
                }}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-accent"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
