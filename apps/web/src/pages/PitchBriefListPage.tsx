import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePitchBriefStore } from '@/stores/pitch-brief.store';
import { Plus, BookOpen, Trash2, FileText, Network } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  EMPTY: 'bg-gray-500/10 text-gray-400',
  PROCESSING: 'bg-yellow-500/10 text-yellow-500',
  READY: 'bg-green-500/10 text-green-500',
  ERROR: 'bg-red-500/10 text-red-500',
};

export function PitchBriefListPage() {
  const navigate = useNavigate();
  const { briefs, loading, loadBriefs, deleteBrief, createBrief } = usePitchBriefStore();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    loadBriefs();
  }, [loadBriefs]);

  const handleCreateBrief = async () => {
    const name = prompt('Enter brief name:');
    if (!name) return;

    const description = prompt('Enter brief description (optional):') || '';
    const id = await createBrief({ name, description });
    if (id) {
      navigate(`/pitch-briefs/${id}`);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();

    if (deletingId === id) {
      await deleteBrief(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Pitch Briefs</h1>
          <p className="text-muted-foreground">
            Curated knowledge collections powered by AI knowledge graphs
          </p>
        </div>
        <button
          onClick={handleCreateBrief}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Brief
        </button>
      </div>

      {briefs.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] border-2 border-dashed border-border rounded-lg">
          <BookOpen className="w-16 h-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold text-foreground mb-2">No briefs yet</h3>
          <p className="text-muted-foreground mb-6 text-center max-w-md">
            Create your first pitch brief to start building AI-powered knowledge collections
          </p>
          <button
            onClick={handleCreateBrief}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Brief
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {briefs.map((brief) => (
            <div
              key={brief.id}
              onClick={() => navigate(`/pitch-briefs/${brief.id}`)}
              className="group relative bg-card border border-border rounded-lg p-6 hover:border-primary/50 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <BookOpen className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground line-clamp-1">
                    {brief.name}
                  </h3>
                </div>
                <button
                  onClick={(e) => handleDelete(e, brief.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-destructive/10 rounded-lg"
                  title={deletingId === brief.id ? 'Click again to confirm' : 'Delete'}
                >
                  <Trash2 className={`w-4 h-4 ${deletingId === brief.id ? 'text-destructive' : 'text-muted-foreground'}`} />
                </button>
              </div>

              {brief.description && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {brief.description}
                </p>
              )}

              <div className="mb-4">
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[brief.status]}`}>
                  {brief.status}
                </span>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  <span>{brief.documentCount || 0} docs</span>
                </div>
                <div className="flex items-center gap-1">
                  <Network className="w-4 h-4" />
                  <span>{brief.entityCount || 0} entities</span>
                </div>
                <div className="flex items-center gap-1">
                  <BookOpen className="w-4 h-4" />
                  <span>{brief.lensCount || 0} lenses</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default PitchBriefListPage;
