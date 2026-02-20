import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { PeachLogo } from '@/components/icons/PeachLogo';

export function RegisterPage() {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuthStore();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (password !== confirmPassword) {
      setValidationError(t('auth.register.passwords_mismatch'));
      return;
    }

    if (password.length < 8) {
      setValidationError(t('auth.register.password_too_short'));
      return;
    }

    try {
      await register(email, password, name);
      navigate('/onboarding', { replace: true });
    } catch {
      // Error is set in the store
    }
  };

  const displayError = validationError || error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <PeachLogo className="h-10 w-10" />
          <h1 className="text-2xl font-bold text-foreground">{t('common.app_name')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.register.title')}</p>
        </div>

        {displayError && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {displayError}
            <button
              onClick={() => {
                setValidationError(null);
                clearError();
              }}
              className="ml-2 font-medium underline"
            >
              {t('common.dismiss')}
            </button>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div>
            <label
              htmlFor="name"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('auth.register.name_label')}
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('auth.register.name_placeholder')}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('auth.register.email_label')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('auth.register.email_placeholder')}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('auth.register.password_label')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('auth.register.password_placeholder')}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              {t('auth.register.confirm_password_label')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder={t('auth.register.confirm_password_placeholder')}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? t('auth.register.submitting') : t('auth.register.submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          {t('auth.register.has_account')}{' '}
          <Link
            to="/login"
            className="font-medium text-primary hover:underline"
          >
            {t('auth.register.log_in')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;
