import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { Layers } from 'lucide-react';

export function ResetPasswordPage() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { resetPassword, isLoading, error, clearError } = useAuthStore();

  const token = searchParams.get('token');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!token) {
      setValidationError(t('auth.reset_password.invalid_token'));
      return;
    }

    if (password !== confirmPassword) {
      setValidationError(t('auth.reset_password.passwords_mismatch'));
      return;
    }

    if (password.length < 8) {
      setValidationError(t('auth.reset_password.password_too_short'));
      return;
    }

    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);
    } catch {
      // Error is set in the store
    }
  };

  const displayError = validationError || error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 shadow-md">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Layers className="h-10 w-10 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">{t('common.app_name')}</h1>
          <p className="text-sm text-muted-foreground">{t('auth.reset_password.title')}</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-md bg-green-50 p-4 text-sm text-green-700">
              {t('auth.reset_password.success_message')}
            </div>
            <Link
              to="/login"
              className="block text-center text-sm font-medium text-primary hover:underline"
            >
              {t('auth.reset_password.go_to_login')}
            </Link>
          </div>
        ) : (
          <>
            {!token && (
              <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {t('auth.reset_password.invalid_token_message')}
                <Link
                  to="/forgot-password"
                  className="ml-2 font-medium underline"
                >
                  {t('auth.reset_password.request_new_link')}
                </Link>
              </div>
            )}

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

            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  {t('auth.reset_password.new_password_label')}
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('auth.reset_password.new_password_placeholder')}
                />
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="mb-1.5 block text-sm font-medium text-foreground"
                >
                  {t('auth.reset_password.confirm_password_label')}
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={t('auth.reset_password.confirm_password_placeholder')}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !token}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isLoading ? t('auth.reset_password.submitting') : t('auth.reset_password.submit')}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link
                to="/login"
                className="font-medium text-primary hover:underline"
              >
                {t('auth.reset_password.back_to_login')}
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default ResetPasswordPage;
