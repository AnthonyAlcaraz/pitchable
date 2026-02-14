import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { usePresentationsStore } from '@/stores/presentations.store';
import { PresentationGrid } from '@/components/dashboard/PresentationGrid';
import { CreditCard, FileText } from 'lucide-react';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const presentations = usePresentationsStore((s) => s.presentations);
  const isLoading = usePresentationsStore((s) => s.isLoading);
  const loadPresentations = usePresentationsStore((s) => s.loadPresentations);
  const deletePresentation = usePresentationsStore((s) => s.deletePresentation);
  const duplicatePresentation = usePresentationsStore((s) => s.duplicatePresentation);
  const renamePresentation = usePresentationsStore((s) => s.renamePresentation);

  useEffect(() => {
    loadPresentations();
  }, [loadPresentations]);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.name ?? 'there'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your presentations at a glance
        </p>
      </div>

      {/* Stats row */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credit Balance</p>
              <p className="text-xl font-semibold text-foreground">
                {user?.creditBalance ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Presentations</p>
              <p className="text-xl font-semibold text-foreground">
                {presentations.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Presentations grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <PresentationGrid
          presentations={presentations}
          onDelete={deletePresentation}
          onDuplicate={duplicatePresentation}
          onRename={renamePresentation}
        />
      )}
    </div>
  );
}
