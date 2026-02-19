import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePitchLensStore } from '@/stores/pitch-lens.store';
import { ArrowLeft, Plus, Pencil, Star, FileText, Focus } from 'lucide-react';

function formatEnum(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function PitchLensDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentLens, isLoading, loadLens, setDefault } = usePitchLensStore();

  useEffect(() => {
    if (id) loadLens(id);
  }, [id, loadLens]);

  if (isLoading || !currentLens) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/pitch-lens')}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pitch Lenses
        </button>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Focus className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">{currentLens.name}</h1>
              {currentLens.description && (
                <p className="mt-1 text-sm text-muted-foreground">{currentLens.description}</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {!currentLens.isDefault && (
              <button
                onClick={() => id && setDefault(id)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
              >
                <Star className="h-4 w-4" />
                Set Default
              </button>
            )}
            <button
              onClick={() => navigate(`/pitch-lens/${id}/edit`)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      </div>

      {/* Lens Summary */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { label: 'Audience', value: formatEnum(currentLens.audienceType) },
          { label: 'Goal', value: formatEnum(currentLens.pitchGoal) },
          { label: 'Industry', value: currentLens.industry },
          { label: 'Stage', value: formatEnum(currentLens.companyStage) },
          { label: 'Tone', value: formatEnum(currentLens.toneStyle) },
          { label: 'Technical Level', value: formatEnum(currentLens.technicalLevel) },
        ].map((item) => (
          <div key={item.label} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{item.label}</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Framework */}
      {currentLens.framework && (
        <div className="mb-8 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 text-lg font-semibold text-foreground">
            Storytelling Framework: {currentLens.framework.name}
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {currentLens.framework.shortDescription}
          </p>
          <div>
            <h3 className="mb-2 text-sm font-medium text-foreground">Slide Structure:</h3>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              {currentLens.framework.slideStructure.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Custom Guidance */}
      {currentLens.customGuidance && (
        <div className="mb-8 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-2 text-sm font-medium text-foreground">Custom Guidance</h2>
          <p className="text-sm text-muted-foreground">{currentLens.customGuidance}</p>
        </div>
      )}

      {/* Presentations */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Presentations ({currentLens.presentations.length})
          </h2>
          <button
            onClick={() => navigate(`/workspace/new?lensId=${id}`)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            New Presentation
          </button>
        </div>

        {currentLens.presentations.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-12">
            <FileText className="mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No presentations yet under this lens</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentLens.presentations.map((pres) => (
              <div
                key={pres.id}
                onClick={() => navigate(`/workspace/${pres.id}`)}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50"
              >
                <div>
                  <p className="font-medium text-foreground">{pres.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEnum(pres.presentationType)} &middot; {formatEnum(pres.status)}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(pres.updatedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PitchLensDetailPage;
