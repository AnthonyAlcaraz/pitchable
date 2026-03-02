import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/stores/auth.store'
import { api } from '@/lib/api'
import { CreditCard, User, Shield, Key, Figma, AlertTriangle } from 'lucide-react'
import { FigmaIntegrationCard } from '@/components/settings/FigmaIntegrationCard'

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match')
      return
    }

    setIsSubmitting(true)
    try {
      await api.patch<{ message: string }>('/auth/change-password', {
        currentPassword,
        newPassword,
      })
      setSuccessMsg('Password changed successfully. You may need to log in again on other devices.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to change password')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-3">
      <div>
        <label htmlFor="current-password" className="mb-1 block text-sm text-muted-foreground">
          Current password
        </label>
        <input
          id="current-password"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>
      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm text-muted-foreground">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          8-128 characters, at least one uppercase, one lowercase, one number, one special character
        </p>
      </div>
      <div>
        <label htmlFor="confirm-password" className="mb-1 block text-sm text-muted-foreground">
          Confirm new password
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
      </div>

      {errorMsg && (
        <p className="text-sm text-red-400">{errorMsg}</p>
      )}
      {successMsg && (
        <p className="text-sm text-green-400">{successMsg}</p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-400 disabled:opacity-50"
      >
        {isSubmitting ? 'Changing...' : 'Change password'}
      </button>
    </form>
  )
}

function DeleteAccountSection() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [showModal, setShowModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [password, setPassword] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const canDelete = confirmText === 'DELETE' && password.length > 0

  const handleDelete = async () => {
    if (!canDelete) return
    setErrorMsg('')
    setIsDeleting(true)
    try {
      await api.delete<{ message: string }>('/auth/account', { password })
      await logout()
      navigate('/')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to delete account')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <section className="rounded-lg border border-red-500/30 bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Permanently delete your account and all associated data, including presentations,
          knowledge base documents, and billing history. This action cannot be undone.
        </p>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10"
        >
          Delete account
        </button>
      </section>

      {/* Confirmation modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-bold text-foreground">Delete your account?</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              This will permanently delete your account and all data. Type{' '}
              <strong className="text-foreground">DELETE</strong> to confirm, and enter your password.
            </p>

            <div className="space-y-3">
              <div>
                <label htmlFor="delete-confirm" className="mb-1 block text-sm text-muted-foreground">
                  Type DELETE to confirm
                </label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <div>
                <label htmlFor="delete-password" className="mb-1 block text-sm text-muted-foreground">
                  Your password
                </label>
                <input
                  id="delete-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {errorMsg && (
                <p className="text-sm text-red-400">{errorMsg}</p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setConfirmText('')
                    setPassword('')
                    setErrorMsg('')
                  }}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!canDelete || isDeleting}
                  onClick={handleDelete}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete my account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

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

        {/* Security / Change Password section */}
        <section className="rounded-lg border border-border bg-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">{t('settings.security_title')}</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('settings.security_desc')}
          </p>
          <ChangePasswordForm />
        </section>

        {/* Danger Zone */}
        <DeleteAccountSection />
      </div>
    </div>
  )
}

export default SettingsPage;
