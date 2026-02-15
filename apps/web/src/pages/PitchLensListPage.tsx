import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { Plus, Focus, Star, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PitchLensListPage() {
  const { lenses, isLoading, loadLenses, deleteLens, setDefault } = usePitchLensStore();
  const navigate = useNavigate();

  useEffect(() => { loadLenses(); }, [loadLenses]);

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pitch Lens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create reusable profiles that guide your presentation strategy
          </p>
        </div>
        <button
          onClick={() => navigate('/pitch-lens/new')}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Lens
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : lenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
          <Focus className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <h2 className="mb-2 text-lg font-semibold text-foreground">No Pitch Lenses yet</h2>
          <p className="mb-6 max-w-md text-center text-sm text-muted-foreground">
            A Pitch Lens captures your audience, goals, and storytelling strategy. All presentations created under a lens inherit its guidance.
          </p>
          <button
            onClick={() => navigate('/pitch-lens/new')}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Create your first Lens
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {lenses.map((lens) => (
            <div
              key={lens.id}
              onClick={() => navigate(`/pitch-lens/${lens.id}`)}
              className="group cursor-pointer rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/50"
            >
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Focus className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{lens.name}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {lens.isDefault && (
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this Pitch Lens?')) deleteLens(lens.id);
                    }}
                    className="rounded p-1 opacity-0 transition-opacity hover:bg-destructive/10 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              </div>

              {lens.description && (
                <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
                  {lens.description}
                </p>
              )}

              <div className="mb-3 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {formatEnum(lens.audienceType)}
                </span>
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                  {formatEnum(lens.pitchGoal)}
                </span>
                {lens.framework && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium text-accent-foreground">
                    {lens.framework.name}
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{lens.presentationCount} presentation{lens.presentationCount !== 1 ? 's' : ''}</span>
                <span>{lens.industry}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PitchLensListPage;
