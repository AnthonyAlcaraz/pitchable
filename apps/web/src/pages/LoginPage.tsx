import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { PeachLogo } from '@/components/icons/PeachLogo';

export function LoginPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      const { user } = useAuthStore.getState();
      if (user && !user.onboardingCompleted) {
        navigate('/onboarding', { replace: true });
      } else {
        const returnTo = searchParams.get('returnTo') || '/cockpit';
        navigate(returnTo, { replace: true });
      }
    } catch {
      // Error is set in the store
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <PeachLogo className="h-10 w-10" />
          <h1 className="text-2xl font-bold text-foreground">{t('common.app_name')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('auth.login.title')}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
            <button
              onClick={clearError}
              className="ml-2 font-medium underline"
            >
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('auth.login.email_label')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('auth.login.email_placeholder')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('auth.login.password_label')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('auth.login.password_placeholder')}
            />
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {t('auth.login.forgot_password')}
            </Link>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth.login.no_account')}{' '}
          <Link
            to="/register"
            className="font-medium text-primary hover:underline"
          >
            {t('auth.login.sign_up')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
