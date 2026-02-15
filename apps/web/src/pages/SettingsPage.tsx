import { Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/auth.store'
import { CreditCard, User, Shield, Key } from 'lucide-react'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="p-8">
      <h1 className="mb-8 text-2xl font-bold text-foreground">Settings</h1>

      <div className="max-w-2xl space-y-6">
        {/* Account section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Account</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Name</span>
              <span className="text-sm font-medium text-foreground">
                {user?.name ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm font-medium text-foreground">
                {user?.email ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                {user?.tier ?? 'FREE'}
              </span>
            </div>
          </div>
        </section>

        {/* Credits section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Credits</h2>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Balance</span>
            <span className="text-sm font-medium text-foreground">
              {user?.creditBalance ?? 0} credits
            </span>
          </div>
          <Link
            to="/billing"
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Manage your plan and credits &rarr;
          </Link>
        </section>

        {/* API Keys section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">API Keys</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage API keys for programmatic access and MCP integration.
          </p>
          <Link
            to="/settings/api-keys"
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Manage API Keys &rarr;
          </Link>
        </section>

        {/* Security section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Security</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Password change and two-factor authentication coming soon.
          </p>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage;
