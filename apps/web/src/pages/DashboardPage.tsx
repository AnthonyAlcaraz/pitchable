import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { Plus, Layers } from 'lucide-react'

export function DashboardPage() {
  const user = useAuthStore((s) => s.user)

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

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-16">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Layers className="h-8 w-8 text-primary" />
        </div>
        <h2 className="mb-2 text-lg font-semibold text-foreground">
          No presentations yet
        </h2>
        <p className="mb-6 max-w-sm text-center text-sm text-muted-foreground">
          Create your first presentation by describing what you need.
          DeckPilot will handle the design.
        </p>
        <Link
          to="/presentation/new"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Presentation
        </Link>
      </div>
    </div>
  )
}
