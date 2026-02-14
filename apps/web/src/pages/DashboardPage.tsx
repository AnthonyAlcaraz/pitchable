import { Link } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { Plus, Layers, CreditCard, FileText } from 'lucide-react';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

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
              <p className="text-xl font-semibold text-foreground">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Layers className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          No presentations yet
        </h2>
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
          Create your first presentation by describing what you need. DeckPilot
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
    </div>
  );
}
