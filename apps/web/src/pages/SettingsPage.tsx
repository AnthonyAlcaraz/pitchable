import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth.store'
import { CreditCard, User, Shield, Key, Figma } from 'lucide-react'
import { FigmaIntegrationCard } from '@/components/settings/FigmaIntegrationCard'

export function SettingsPage() {
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.user)

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <h1 className="mb-8 text-2xl font-bold text-foreground">{t('settings.title')}</h1>

      <div className="max-w-2xl space-y-6">
        {/* Account section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t('settings.account_title')}</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('settings.account_name')}</span>
              <span className="text-sm font-medium text-foreground">
                {user?.name ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('settings.account_email')}</span>
              <span className="text-sm font-medium text-foreground">
                {user?.email ?? '-'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('settings.account_plan')}</span>
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
            <h2 className="text-lg font-semibold text-foreground">{t('settings.credits_title')}</h2>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('settings.credits_balance')}</span>
            <span className="text-sm font-medium text-foreground">
              {t('settings.credits_balance_value', { count: user?.creditBalance ?? 0 })}
            </span>
          </div>
          <Link
            to="/billing"
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            {t('settings.credits_manage_link')} &rarr;
          </Link>
        </section>

        {/* API Keys section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Key className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t('settings.api_keys_title')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.api_keys_desc')}
          </p>
          <Link
            to="/settings/api-keys"
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            {t('settings.api_keys_manage_link')} &rarr;
          </Link>
        </section>

        {/* Integrations section */}
        <FigmaIntegrationCard />

        {/* Figma Templates */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Figma className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Figma Templates</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Manage your Figma template mappings for slide generation.
          </p>
          <Link
            to="/settings/figma-templates"
            className="mt-3 inline-block text-sm text-primary hover:underline"
          >
            Manage templates &rarr;
          </Link>
        </section>

        {/* Security section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t('settings.security_title')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.security_desc')}
          </p>
        </section>
      </div>
    </div>
  )
}

export default SettingsPage;
